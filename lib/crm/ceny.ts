import "server-only";
import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { rcnTransakcje as t } from "./schema";

// Ceny transakcyjne (RCN, woj. łódzkie): filtry z adresu strony, statystyki ceny za m², porównanie miejsc, punkty na mapę.

export const POWIATY: [string, string][] = [
  ["1061", "Łódź"],
  ["1006", "łódzki wschodni"],
  ["1020", "zgierski"],
  ["1008", "pabianicki"],
  ["1021", "brzeziński"],
  ["1003", "łaski"],
  ["1001", "bełchatowski"],
  ["1002", "kutnowski"],
  ["1004", "łęczycki"],
  ["1005", "łowicki"],
  ["1007", "opoczyński"],
  ["1009", "pajęczański"],
  ["1010", "piotrkowski"],
  ["1062", "Piotrków Trybunalski"],
  ["1011", "poddębicki"],
  ["1012", "radomszczański"],
  ["1013", "rawski"],
  ["1014", "sieradzki"],
  ["1015", "skierniewicki"],
  ["1063", "Skierniewice"],
  ["1016", "tomaszowski"],
  ["1017", "wieluński"],
  ["1018", "wieruszowski"],
  ["1019", "zduńskowolski"],
];

export const RODZAJE: [string, string][] = [
  ["mieszkanie", "Mieszkania"],
  ["lokal", "Lokale użytkowe i inne"],
  ["dom", "Domy"],
  ["dzialka", "Działki"],
  ["budynek", "Inne budynki"],
];

export const RYNKI: [string, string][] = [
  ["pierwotny", "Pierwotny"],
  ["wtorny", "Wtórny"],
];

// porównanie grupuje po wybranej kolumnie
export const GRUPY = { powiat: "Powiat", gmina: "Gmina / dzielnica", miejscowosc: "Miejscowość", ulica: "Ulica", pokoje: "Liczba pokoi", rok: "Rok" } as const;
export type Grupa = keyof typeof GRUPY;

export const KEYS = ["rodzaj", "powiat", "miejscowosc", "ulica", "rynek", "powOd", "powDo", "cenaOd", "cenaDo", "m2Od", "m2Do", "od", "do", "pokoje", "grupa", "strona"] as const;
export type CenyQuery = Partial<Record<(typeof KEYS)[number], string>>;

const num = (v?: string) => {
  const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return v && Number.isFinite(n) ? n : undefined;
};
const isDate = (v?: string) => Boolean(v && /^\d{4}-\d{2}(-\d{2})?$/.test(v));
const day = (v: string, end = false) => (v.length === 7 ? (end ? lastDay(v) : `${v}-01`) : v);
const lastDay = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

// domyślnie mieszkania z ostatnich dwóch lat: najczęstsze pytanie i rozsądna wielkość próby
export function normalize(sp: Record<string, string | string[] | undefined>): CenyQuery {
  const q: CenyQuery = {};
  for (const k of KEYS) {
    const v = sp[k];
    if (typeof v === "string" && v.trim()) q[k] = v.trim();
  }
  q.rodzaj ??= "mieszkanie";
  if (!isDate(q.od)) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    q.od = d.toISOString().slice(0, 7);
  }
  if (q.do && !isDate(q.do)) delete q.do;
  if (!q.grupa || !(q.grupa in GRUPY)) q.grupa = q.ulica ? "rok" : q.miejscowosc ? "ulica" : q.powiat ? "gmina" : "powiat";
  return q;
}

export function whereOf(q: CenyQuery): SQL | undefined {
  const w: (SQL | undefined)[] = [];
  if (q.rodzaj && q.rodzaj !== "wszystkie") w.push(eq(t.rodzaj, q.rodzaj));
  if (q.powiat) w.push(eq(t.terytPowiat, q.powiat));
  if (q.miejscowosc) w.push(or(ilike(t.miejscowosc, `${q.miejscowosc}%`), ilike(t.gmina, `${q.miejscowosc}%`)));
  if (q.ulica) w.push(ilike(t.ulica, `%${q.ulica}%`));
  if (q.rynek) w.push(eq(t.rynek, q.rynek));
  const range = (col: typeof t.pow | typeof t.cena | typeof t.cenaM2, lo?: number, hi?: number) => {
    if (lo !== undefined) w.push(gte(col, lo));
    if (hi !== undefined) w.push(lte(col, hi));
  };
  range(t.pow, num(q.powOd), num(q.powDo));
  range(t.cena, num(q.cenaOd), num(q.cenaDo));
  range(t.cenaM2, num(q.m2Od), num(q.m2Do));
  if (q.pokoje) w.push(q.pokoje === "4" ? gte(t.pokoje, 4) : eq(t.pokoje, Number(q.pokoje)));
  if (isDate(q.od)) w.push(gte(t.data, day(q.od!)));
  if (isDate(q.do)) w.push(lte(t.data, day(q.do!, true)));
  return and(...w);
}

// cena za m² liczona tylko z wierszy, które ją mają (bez udziałów i transakcji za 0 zł)
const m2 = sql`${t.cenaM2}`;
const pct = (p: number) => sql<number | null>`percentile_cont(${sql.raw(String(p))}) within group (order by ${m2})`;

export async function summary(q: CenyQuery) {
  const d = await db();
  const [s] = await d
    .select({
      n: sql<number>`count(*)::int`,
      nM2: sql<number>`count(${m2})::int`,
      p25: pct(0.25),
      med: pct(0.5),
      p75: pct(0.75),
      avg: sql<number | null>`avg(${m2})`,
      medCena: sql<number | null>`percentile_cont(0.5) within group (order by ${t.cena})`,
      medPow: sql<number | null>`percentile_cont(0.5) within group (order by ${t.pow})`,
      first: sql<string | null>`min(${t.data})::text`,
      last: sql<string | null>`max(${t.data})::text`,
    })
    .from(t)
    .where(whereOf(q));
  return s;
}

export async function trend(q: CenyQuery) {
  const d = await db();
  const kw = sql<string>`to_char(${t.data}, 'YYYY') || ' Q' || to_char(${t.data}, 'Q')`;
  return d
    .select({ okres: kw, n: sql<number>`count(${m2})::int`, med: pct(0.5), p25: pct(0.25), p75: pct(0.75) })
    .from(t)
    .where(whereOf(q))
    .groupBy(kw)
    .orderBy(kw);
}

const groupCol: Record<Grupa, SQL> = {
  gmina: sql`coalesce(${t.gmina}, '(brak)')`,
  miejscowosc: sql`coalesce(${t.miejscowosc}, '(brak adresu)')`,
  powiat: sql`${t.powiat}`,
  ulica: sql`coalesce(${t.ulica}, '(bez ulicy)')`,
  pokoje: sql`coalesce(${t.pokoje}::text, '?')`,
  rok: sql`to_char(${t.data}, 'YYYY')`,
};

export async function compare(q: CenyQuery) {
  const d = await db();
  const g = groupCol[(q.grupa as Grupa) ?? "powiat"];
  return d
    .select({
      nazwa: sql<string>`${g}`,
      n: sql<number>`count(*)::int`,
      nM2: sql<number>`count(${m2})::int`,
      p25: pct(0.25),
      med: pct(0.5),
      p75: pct(0.75),
      medPow: sql<number | null>`percentile_cont(0.5) within group (order by ${t.pow})`,
      medCena: sql<number | null>`percentile_cont(0.5) within group (order by ${t.cena})`,
    })
    .from(t)
    .where(whereOf(q))
    .groupBy(g)
    .orderBy(sql`count(*) desc`)
    .limit(q.grupa === "rok" || q.grupa === "pokoje" ? 50 : 40);
}

export const PAGE = 50;

export async function rows(q: CenyQuery) {
  const d = await db();
  const page = Math.max(1, Number(q.strona) || 1);
  return d
    .select()
    .from(t)
    .where(whereOf(q))
    .orderBy(desc(t.data), desc(t.id))
    .limit(PAGE)
    .offset((page - 1) * PAGE);
}

export type Punkt = [lat: number, lng: number, cenaM2: number | null, id: string];

// najnowsze transakcje z położeniem; więcej punktów nie zmieści się czytelnie na mapie
export async function points(q: CenyQuery, limit = 4000): Promise<Punkt[]> {
  const d = await db();
  const r = await d
    .select({ lat: t.lat, lng: t.lng, m2: t.cenaM2, id: t.id })
    .from(t)
    .where(and(whereOf(q), sql`${t.lat} is not null`))
    .orderBy(desc(t.data))
    .limit(limit);
  return r.map((p) => [Math.round(p.lat! * 1e5) / 1e5, Math.round(p.lng! * 1e5) / 1e5, p.m2 === null ? null : Math.round(p.m2), p.id]);
}

export async function lastImport() {
  const d = await db();
  const [r] = await d.select({ at: sql<Date | null>`max(${t.importedAt})`, n: sql<number>`count(*)::int` }).from(t);
  return r;
}

export async function one(id: string) {
  const d = await db();
  const [r] = await d.select().from(t).where(eq(t.id, id));
  return r;
}
