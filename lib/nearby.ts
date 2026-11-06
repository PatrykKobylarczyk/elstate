import "server-only";
import { fetchNearby, type NearbyCategory } from "./nearby-core";

export type { NearbyCategory, Poi } from "./nearby-core";

// Okolica oferty z OpenStreetMap (Overpass API) po stronie serwera; wszystkie serwery Overpass naraz.
export async function nearby(spot: { lat: number; lng: number }): Promise<NearbyCategory[]> {
  return (await fetchNearby(spot, 20000, { headers: { "User-Agent": "elstate.pl (info@elstate.pl)" } })) ?? [];
}
