import "server-only";
import { and, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { rcnTransakcje as t } from "./schema";

// Cena oferty na tle cen transakcyjnych (RCN): rozkład ceny za m² na tej samej ulicy, w promieniu 1 km,
// w dzielnicy i w całym mieście. Zwracamy kwantyle co 5%, żeby przeglądarka sama policzyła, gdzie wypada
// wpisywana na bieżąco cena (bez pytania serwera przy każdej cyfrze).
//
// Ceny rosną, więc starsze transakcje przeliczamy na dzisiejsze: indeks to kwartalna mediana zł/m² w mieście
// (wygładzona średnią z sąsiednich kwartałów), a transakcja z kwartału K dostaje mnożnik indeks(dziś) / indeks(K).
// Okno to 12 miesięcy; dłuższe (24, potem 36) tylko gdy w krótszym jest za mało transakcji.

export type Miejsce = { category: string; city: string; district: string; street: string; lat?: number | null; lng?: number | null };
export type Grupa = { key: string; label: string; n: number; q: number[]; od: string; ceny: string };
export type Trend = { scope: string; pct12: number | null; asOf: string };
export type Porownanie = { groups: Grupa[]; trend: Trend | null };

const RODZAJ: Record<string, string> = { mieszkania: "mieszkanie", domy: "dom", dzialki: "dzialka", lokale: "lokal" };
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
const WINDOWS = [12, 24, 36];
const ENOUGH = 10; // tyle transakcji wystarcza, żeby nie wydłużać okna
const MIN = 5; // mniej nie pokazujemy wcale
const QUARTER_MIN = 15; // kwartał do indeksu musi mieć tyle transakcji
const KM = 1;

const monthsAgo = (m: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  return d.toISOString().slice(0, 10);
};
const quarterStart = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return `${y}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, "0")}-01`;
};
const nextQuarter = (q: string) => {
  const [y, m] = q.split("-").map(Number);
  return m === 10 ? `${y + 1}-01-01` : `${y}-${String(m + 3).padStart(2, "0")}-01`;
};

type Row = Record<string, unknown>;
type Exec = { execute: (q: SQL) => Promise<unknown> };
// postgres-js zwraca tablicę wierszy, PGlite obiekt z polem rows
async function run(d: Exec, q: SQL): Promise<Row[]> {
  const r = (await d.execute(q)) as Row[] | { rows: Row[] };
  return Array.isArray(r) ? r : r.rows;
}

// mnożniki kwartał → dziś; null, gdy za mało danych na trend
async function index(d: Exec, rodzaj: string, scope: SQL) {
  const rows = await run(
    d,
    sql`select date_trunc('quarter', ${t.data})::date::text as q, count(*)::int as n,
          percentile_cont(0.5) within group (order by ${t.cenaM2}) as med
        from ${t}
        where ${t.rodzaj} = ${rodzaj} and ${t.cenaM2} is not null and ${t.data} >= ${monthsAgo(Math.max(...WINDOWS) + 6)} and ${scope}
        group by 1 order by 1`,
  );
  const kept = rows.filter((r) => Number(r.n) >= QUARTER_MIN).map((r) => ({ q: String(r.q), med: Number(r.med) }));
  if (kept.length < 3) return null;
  const smooth = kept.map((_, i) => {
    const near = kept.slice(Math.max(0, i - 1), i + 2);
    return { q: kept[i].q, v: near.reduce((s, x) => s + x.med, 0) / near.length };
  });
  const ref = smooth[smooth.length - 1].v;
  // każdy kwartał od najstarszego potrzebnego do dziś; brakujące biorą mnożnik najbliższego znanego
  const factors: [string, number][] = [];
  const last = quarterStart(new Date().toISOString().slice(0, 10));
  for (let q = quarterStart(monthsAgo(Math.max(...WINDOWS))); q <= last; q = nextQuarter(q)) {
    const known = smooth.reduce((best, s) => (Math.abs(Date.parse(s.q) - Date.parse(q)) < Math.abs(Date.parse(best.q) - Date.parse(q)) ? s : best));
    factors.push([q, ref / known.v]);
  }
  const yearAgo = smooth.reduce((best, s) => (Math.abs(Date.parse(s.q) - Date.parse(quarterStart(monthsAgo(12)))) < Math.abs(Date.parse(best.q) - Date.parse(quarterStart(monthsAgo(12)))) ? s : best));
  const pct12 = yearAgo === smooth[smooth.length - 1] ? null : Math.round((ref / yearAgo.v - 1) * 1000) / 10;
  return { factors, pct12, asOf: smooth[smooth.length - 1].q };
}

// link do pełnej porównywarki z tym samym zawężeniem
const cenyLink = (p: Record<string, string>) => `/crm/ceny?${new URLSearchParams(p)}`;

export async function porownaj(m: Miejsce): Promise<Porownanie> {
  const rodzaj = RODZAJ[m.category];
  if (!rodzaj) return { groups: [], trend: null };
  const city = m.city.trim();
  const street = m.street.trim().replace(/^(ul\.|al\.|os\.|pl\.)\s*/i, "");
  // „Górna” pasuje do delegatury „Łódź-Górna”; osiedle spoza listy gmin po prostu nic nie znajdzie
  const district = m.district.trim();
  const d = (await db()) as unknown as Exec;

  const inCity = city ? or(ilike(t.miejscowosc, city), ilike(t.gmina, `${city}%`)) : undefined;
  const idx = inCity ? await index(d, rodzaj, inCity) : null;
  const k = idx
    ? sql`coalesce((select f.k from (values ${sql.join(
        idx.factors.map(([q, f]) => sql`(${q}::date, ${f}::float8)`),
        sql`, `,
      )}) as f(q, k) where f.q = date_trunc('quarter', ${t.data})::date), 1)`
    : sql`1`;

  const stats = async (key: string, label: string, where: SQL | undefined, ceny: Record<string, string>): Promise<Grupa | null> => {
    for (const months of WINDOWS) {
      const od = monthsAgo(months);
      const [r] = await run(
        d,
        sql`select count(*)::int as n,
              percentile_cont(array[${sql.raw(STEPS.join(","))}]::float8[]) within group (order by ${t.cenaM2} * ${k}) as q
            from ${t}
            where ${t.rodzaj} = ${rodzaj} and ${t.cenaM2} is not null and ${t.data} >= ${od} and ${where ?? sql`true`}`,
      );
      const n = Number(r?.n ?? 0);
      const last = months === WINDOWS[WINDOWS.length - 1];
      if (n >= ENOUGH || (last && n >= MIN)) {
        const q = (typeof r.q === "string" ? JSON.parse(String(r.q).replace(/^\{/, "[").replace(/\}$/, "]")) : (r.q as number[])).map(Number);
        return { key, label, n, q, od, ceny: cenyLink({ rodzaj, od: od.slice(0, 7), ...ceny }) };
      }
    }
    return null;
  };

  const jobs: Promise<Grupa | null>[] = [];
  if (street && city) jobs.push(stats("ulica", `Ulica ${street}`, and(inCity, ilike(t.ulica, `%${street}%`)), { miejscowosc: city, ulica: street, grupa: "rok" }));
  if (m.lat != null && m.lng != null) {
    const dLat = KM / 111.32;
    const dLng = KM / (111.32 * Math.cos((m.lat * Math.PI) / 180));
    const near = sql`${t.lat} between ${m.lat - dLat} and ${m.lat + dLat} and ${t.lng} between ${m.lng - dLng} and ${m.lng + dLng}
      and power((${t.lat} - ${m.lat}) / ${dLat}, 2) + power((${t.lng} - ${m.lng}) / ${dLng}, 2) <= 1`;
    jobs.push(stats("okolica", `Do ${KM} km od oferty`, near, { miejscowosc: city }));
  }
  if (district && city) jobs.push(stats("dzielnica", `Dzielnica ${district}`, and(inCity, ilike(t.gmina, `%${district}%`)), { miejscowosc: district, grupa: "ulica" }));
  if (city) jobs.push(stats("miasto", city, inCity, { miejscowosc: city, grupa: "gmina" }));
  const groups = (await Promise.all(jobs)).filter((g): g is Grupa => g !== null);
  return { groups, trend: idx ? { scope: city, pct12: idx.pct12, asOf: idx.asOf } : null };
}
