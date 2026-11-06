// Dopasowanie ogłoszenia (leada z nbota) do poszukiwań klienta. Czysta logika, bez bazy.
//
// Co mamy w ogłoszeniu z nbota: tytuł, link do portalu, cenę, metraż, pokoje, lokalizację i fragment
// treści maila. Rodzaju nieruchomości i transakcji nbot nie podaje osobno, więc odczytujemy je
// z tytułu, linku i treści. Wartości, których nie udało się odczytać, nie wykluczają ogłoszenia
// (lepiej pokazać agentowi o jedno ogłoszenie za dużo niż przegapić pasujące), z jednym wyjątkiem:
// gdy klient podał lokalizacje, ogłoszenie musi którąś z nich zawierać.

export type SearchCriteria = {
  deal: string | null;
  category: string | null;
  locations: string[];
  priceMin: number | null;
  priceMax: number | null;
  areaMin: number | null;
  areaMax: number | null;
  roomsMin: number | null;
  roomsMax: number | null;
  exclude: string[];
};

export type LeadFacts = {
  title: string | null;
  url: string | null;
  price: number | null;
  area: number | null;
  rooms: number | null;
  location: string | null;
  raw: string | null;
  message?: string | null;
};

// małe litery, bez polskich znaków i nadmiarowych spacji: „Łódź-Bałuty” == „lodz baluty”
export function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const CATEGORY_HINTS: [string, RegExp][] = [
  ["dzialki", /\b(dzialk|grunt)/],
  ["lokale", /\b(lokal(?!iz)|biur|uslugow|magazyn|hal[aie]\b|komercyjn)/],
  ["domy", /\b(dom|domy|domu|domek)\b|\b(segment|blizniak|szeregow|wolnostojac)/],
  ["mieszkania", /\b(mieszkan|kawalerk|apartament)/],
];

// rodzaj nieruchomości: najpierw link (Otodom i OLX mają go w ścieżce), potem tytuł, na końcu treść.
// W jednym tekście wygrywa słowo, które pada najwcześniej („Mieszkanie w domu z ogrodem” to mieszkanie).
export function guessCategory(l: Pick<LeadFacts, "title" | "url" | "raw">): string | null {
  for (const src of [l.url, l.title, l.raw?.slice(0, 600)]) {
    if (!src) continue;
    const t = ` ${norm(src)} `;
    let best: [string, number] | null = null;
    for (const [k, re] of CATEGORY_HINTS) {
      const at = t.search(re);
      if (at >= 0 && (!best || at < best[1])) best = [k, at];
    }
    if (best) return best[0];
  }
  return null;
}

export function guessDeal(l: Pick<LeadFacts, "title" | "url" | "raw" | "price">): string | null {
  for (const src of [l.url, l.title, l.raw?.slice(0, 600)]) {
    if (!src) continue;
    const t = norm(src);
    if (/\b(wynaj|najem|najmu|do wynajecia)/.test(t)) return "wynajem";
    if (/\b(sprzedaz|sprzedam|sprzedaje|na sprzedaz)/.test(t)) return "sprzedaz";
  }
  // bez słów kluczowych: cena do 15 tys. zł to prawie na pewno czynsz
  if (l.price) return l.price <= 15000 ? "wynajem" : "sprzedaz";
  return null;
}

// Wzorzec lokalizacji odporny na odmianę: „Bałuty” trafia też w „na Bałutach”, „Polesie” w „na Polesiu”.
function placePattern(term: string) {
  const words = norm(term).split(" ").filter(Boolean);
  if (!words.length) return null;
  const stem = (w: string) => (w.length >= 7 ? w.slice(0, -2) : w.length >= 5 ? w.slice(0, -1) : w);
  return new RegExp(`\\b${words.map((w) => `${stem(w)}[a-z]*`).join(" ")}\\b`);
}

const within = (v: number | null, min: number | null, max: number | null) => v == null || ((min == null || v >= min) && (max == null || v <= max));

export type MatchResult = { ok: true } | { ok: false; why: string };

export function matchLead(c: SearchCriteria, l: LeadFacts): MatchResult {
  const hay = ` ${norm([l.location, l.title, l.raw, l.url].filter(Boolean).join(" "))} `;

  if (c.deal) {
    const d = guessDeal(l);
    if (d && d !== c.deal) return { ok: false, why: "transakcja" };
  }
  if (c.category) {
    const k = guessCategory(l);
    if (k && k !== c.category) return { ok: false, why: "rodzaj" };
  }
  const locs = c.locations.map(placePattern).filter((x): x is RegExp => x !== null);
  if (locs.length && !locs.some((re) => re.test(hay))) return { ok: false, why: "lokalizacja" };
  if (!within(l.price, c.priceMin, c.priceMax)) return { ok: false, why: "cena" };
  if (!within(l.area, c.areaMin, c.areaMax)) return { ok: false, why: "metraż" };
  if (!within(l.rooms, c.roomsMin, c.roomsMax)) return { ok: false, why: "pokoje" };
  const ex = c.exclude.map(norm).filter(Boolean);
  if (ex.some((x) => hay.includes(` ${x}`))) return { ok: false, why: "wykluczone słowo" };
  return { ok: true };
}

// lista z pola tekstowego: „Polesie, Bałuty; Widzew” → ["Polesie", "Bałuty", "Widzew"]
export const splitList = (s: string) =>
  s
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 30);

// krótki opis kryteriów do listy i powiadomień
export function describe(c: SearchCriteria, labels: { deal?: string; category?: string } = {}) {
  const k = (n: number) => (n >= 1000000 ? `${(n / 1000000).toLocaleString("pl-PL", { maximumFractionDigits: 2 })} mln` : n >= 1000 ? `${Math.round(n / 1000)} tys.` : String(n));
  const range = (min: number | null, max: number | null, f: (n: number) => string, unit: string) =>
    min != null && max != null ? `${f(min)}–${f(max)}${unit}` : min != null ? `od ${f(min)}${unit}` : max != null ? `do ${f(max)}${unit}` : null;
  return [
    labels.category ?? null,
    labels.deal ?? null,
    c.locations.length ? c.locations.join(", ") : null,
    range(c.priceMin, c.priceMax, k, " zł"),
    range(c.areaMin, c.areaMax, (n) => n.toLocaleString("pl-PL"), " m²"),
    range(c.roomsMin, c.roomsMax, String, " pok."),
  ]
    .filter(Boolean)
    .join(" · ");
}
