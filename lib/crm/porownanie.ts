import "server-only";
import { and, gte, ilike, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { rcnTransakcje as t } from "./schema";

// Cena oferty na tle cen transakcyjnych (RCN): rozkład ceny za m² na tej samej ulicy, w promieniu 1 km,
// w dzielnicy i w całym mieście. Zwracamy kwantyle co 5%, żeby przeglądarka sama policzyła, gdzie wypada
// wpisywana na bieżąco cena (bez pytania serwera przy każdej cyfrze).

export type Miejsce = { category: string; city: string; district: string; street: string; lat?: number | null; lng?: number | null };
export type Grupa = { key: string; label: string; n: number; q: number[]; od: string; ceny: string };

const RODZAJ: Record<string, string> = { mieszkania: "mieszkanie", domy: "dom", dzialki: "dzialka", lokale: "lokal" };
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
const MIN = 5;
const KM = 1;

const monthsAgo = (m: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  return d.toISOString().slice(0, 10);
};

// link do pełnej porównywarki z tym samym zawężeniem
const cenyLink = (p: Record<string, string>) => `/crm/ceny?${new URLSearchParams(p)}`;

export async function porownaj(m: Miejsce): Promise<Grupa[]> {
  const rodzaj = RODZAJ[m.category];
  if (!rodzaj) return [];
  const city = m.city.trim();
  const street = m.street.trim().replace(/^(ul\.|al\.|os\.|pl\.)\s*/i, "");
  // „Górna” pasuje do delegatury „Łódź-Górna”; osiedle spoza listy gmin po prostu nic nie znajdzie
  const district = m.district.trim();
  const d = await db();

  const stats = async (key: string, label: string, where: SQL | undefined, od: string, ceny: Record<string, string>): Promise<Grupa | null> => {
    const [r] = await d
      .select({
        n: sql<number>`count(*)::int`,
        q: sql<number[] | null>`percentile_cont(array[${sql.raw(STEPS.join(","))}]::float8[]) within group (order by ${t.cenaM2})`,
      })
      .from(t)
      .where(and(sql`${t.rodzaj} = ${rodzaj}`, isNotNull(t.cenaM2), gte(t.data, od), where));
    if (!r || r.n < MIN || !r.q) return null;
    return { key, label, n: r.n, q: r.q.map(Number), od, ceny: cenyLink({ rodzaj, od: od.slice(0, 7), ...ceny }) };
  };

  const inCity = city ? or(ilike(t.miejscowosc, city), ilike(t.gmina, `${city}%`)) : undefined;
  const jobs: Promise<Grupa | null>[] = [];
  if (street && city)
    jobs.push(stats("ulica", `Ulica ${street}`, and(inCity, ilike(t.ulica, `%${street}%`)), monthsAgo(36), { miejscowosc: city, ulica: street, grupa: "rok" }));
  if (m.lat != null && m.lng != null) {
    const dLat = KM / 111.32;
    const dLng = KM / (111.32 * Math.cos((m.lat * Math.PI) / 180));
    const near = sql`${t.lat} between ${m.lat - dLat} and ${m.lat + dLat} and ${t.lng} between ${m.lng - dLng} and ${m.lng + dLng}
      and power((${t.lat} - ${m.lat}) / ${dLat}, 2) + power((${t.lng} - ${m.lng}) / ${dLng}, 2) <= 1`;
    jobs.push(stats("okolica", `Do ${KM} km od oferty`, near, monthsAgo(24), { miejscowosc: city }));
  }
  if (district && city)
    jobs.push(stats("dzielnica", `Dzielnica ${district}`, and(inCity, ilike(t.gmina, `%${district}%`)), monthsAgo(24), { miejscowosc: district, grupa: "ulica" }));
  if (city) jobs.push(stats("miasto", city, inCity, monthsAgo(24), { miejscowosc: city, grupa: "gmina" }));
  return (await Promise.all(jobs)).filter((g): g is Grupa => g !== null);
}
