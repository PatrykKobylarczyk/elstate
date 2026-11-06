// Okolica oferty (wspólne dla serwera i przeglądarki): najbliższe szkoły, przychodnie, parki itd. z OpenStreetMap (Overpass API),
// tak jak w sekcji lokalizacji N75. Jedno zapytanie na ofertę, wynik w cache na 30 dni.

export type Poi = { name: string; lat: number; lng: number; m: number };
export type NearbyCategory = { key: string; label: string; items: Poi[] };

type Cat = { key: string; label: string; radius: number; filters: string[]; limit: number };

// Kolejność i nazwy kategorii jak w N75
const CATS: Cat[] = [
  {
    key: "edu",
    label: "Edukacja",
    radius: 1200,
    limit: 5,
    filters: ['["amenity"~"^(school|kindergarten|university|college)$"]', '["amenity"="childcare"]'],
  },
  {
    key: "zdr",
    label: "Zdrowie i opieka",
    radius: 1200,
    limit: 4,
    filters: ['["amenity"~"^(hospital|clinic|doctors)$"]', '["amenity"="pharmacy"]'],
  },
  { key: "ziel", label: "Zieleń", radius: 1500, limit: 4, filters: ['["leisure"~"^(park|garden|nature_reserve)$"]'] },
  {
    key: "kult",
    label: "Kultura",
    radius: 2000,
    limit: 3,
    filters: ['["amenity"~"^(theatre|cinema|arts_centre|library)$"]', '["tourism"~"^(museum|gallery)$"]'],
  },
  {
    key: "kom",
    label: "Komunikacja",
    radius: 800,
    limit: 3,
    filters: ['["railway"~"^(tram_stop|station|halt)$"]', '["highway"="bus_stop"]'],
  },
  {
    key: "han",
    label: "Handel i usługi",
    radius: 800,
    limit: 4,
    filters: ['["shop"~"^(supermarket|mall|convenience|bakery|greengrocer|chemist)$"]', '["amenity"="marketplace"]'],
  },
];

export type El = { type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

export const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

// zakładki widoczne zawsze, także zanim wczytają się miejsca (jak w N75)
export const CATEGORY_TABS = CATS.map(({ key, label }) => ({ key, label }));

export function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371e3;
  const r = Math.PI / 180;
  const dLa = (b.lat - a.lat) * r;
  const dLo = (b.lng - a.lng) * r;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function matches(tags: Record<string, string>, filter: string) {
  const m = filter.match(/^\["(\w+)"(=|~)"(.+)"\]$/);
  if (!m) return false;
  const v = tags[m[1]];
  if (v === undefined) return false;
  return m[2] === "=" ? v === m[3] : new RegExp(m[3]).test(v);
}

export function overpassQuery(lat: number, lng: number) {
  const parts = CATS.flatMap((c) => c.filters.map((f) => `nwr(around:${c.radius},${lat},${lng})${f}["name"];`));
  return `[out:json][timeout:25];(${parts.join("")});out center tags;`;
}

export function parseNearby(home: { lat: number; lng: number }, elements: El[]): NearbyCategory[] {
  return CATS.map((c) => {
    const seen = new Set<string>();
    const items = elements
      .map((e) => {
        const tags = e.tags ?? {};
        const p = e.center ?? (e.lat !== undefined && e.lon !== undefined ? { lat: e.lat, lon: e.lon } : null);
        if (!p || !tags.name || !c.filters.some((f) => matches(tags, f))) return null;
        const at = { lat: p.lat, lng: p.lon };
        const street = tags["addr:street"] && tags["addr:housenumber"] ? `${tags["addr:street"]} ${tags["addr:housenumber"]}` : "";
        const name = street && !tags.name.includes(tags["addr:street"]) && c.key !== "kom" ? `${tags.name}, ${street}` : tags.name;
        return { name, lat: at.lat, lng: at.lng, m: distance(home, at), base: tags.name.toLowerCase() };
      })
      .filter((p): p is Poi & { base: string } => p !== null)
      .sort((a, b) => a.m - b.m)
      // ten sam przystanek / park bywa w OSM kilka razy (perony, części parku): bierzemy najbliższy
      .filter((p) => (seen.has(p.base) ? false : (seen.add(p.base), true)))
      .slice(0, c.limit)
      .map(({ name, lat, lng, m }) => ({ name, lat, lng, m: Math.round(m) }));
    return { key: c.key, label: c.label, items };
  });
}

// ~11 m dokładności wystarczy, a lepiej trafia w cache
export const roundSpot = (spot: { lat: number; lng: number }) => ({ lat: Number(spot.lat.toFixed(4)), lng: Number(spot.lng.toFixed(4)) });

// Zapytanie do wszystkich serwerów Overpass naraz; wygrywa pierwsza poprawna odpowiedź.
// errors: opcjonalnie zbiera przyczyny porażek (host + kod HTTP / błąd), żeby dało się je pokazać w CRM
export async function fetchNearby(
  spot: { lat: number; lng: number },
  timeoutMs: number,
  init: RequestInit = {},
  errors: string[] = [],
): Promise<NearbyCategory[] | null> {
  const home = roundSpot(spot);
  const body = new URLSearchParams({ data: overpassQuery(home.lat, home.lng) }).toString();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const elements = await Promise.any(
      ENDPOINTS.map(async (url) => {
        const host = new URL(url).host;
        try {
          const r = await fetch(url, { ...init, method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded", ...(init.headers ?? {}) }, signal: ctrl.signal });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const j = (await r.json()) as { elements?: El[]; remark?: string };
          if (!j.elements?.length && j.remark) throw new Error(j.remark.slice(0, 80));
          return j.elements ?? [];
        } catch (e) {
          const msg = ctrl.signal.aborted ? "brak odpowiedzi" : e instanceof Error ? e.message : String(e);
          errors.push(`${host}: ${msg}`);
          throw e;
        }
      }),
    );
    return parseNearby(home, elements);
  } catch (e) {
    console.warn("[okolica]", e);
    return null;
  } finally {
    clearTimeout(timer);
    ctrl.abort();
  }
}

export const hasPlaces = (c: NearbyCategory[] | null | undefined): c is NearbyCategory[] => Boolean(c?.some((x) => x.items.length > 0));
