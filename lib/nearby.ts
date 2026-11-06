import "server-only";
import { ENDPOINTS, overpassQuery, parseNearby, roundSpot, type El, type NearbyCategory } from "./nearby-core";

export type { NearbyCategory, Poi } from "./nearby-core";

// Okolica oferty z OpenStreetMap (Overpass API), jedno zapytanie na ofertę, wynik w cache na 30 dni.
// Gdy serwer nie dostanie odpowiedzi (np. Overpass odrzuca zapytania z Vercel), miejsca pobiera
// przeglądarka (components/offer/LocationMap.tsx).
export async function nearby(spot: { lat: number; lng: number }): Promise<NearbyCategory[]> {
  const home = roundSpot(spot);
  const q = encodeURIComponent(overpassQuery(home.lat, home.lng));
  for (const url of ENDPOINTS) {
    try {
      const r = await fetch(`${url}?data=${q}`, {
        headers: { "User-Agent": "elstate.pl (info@elstate.pl)" },
        next: { revalidate: 60 * 60 * 24 * 30 },
        signal: AbortSignal.timeout(9000),
      });
      if (!r.ok) {
        console.warn("[okolica]", url, r.status);
        continue;
      }
      return parseNearby(home, ((await r.json()) as { elements: El[] }).elements);
    } catch (e) {
      console.warn("[okolica]", url, e);
    }
  }
  return [];
}
