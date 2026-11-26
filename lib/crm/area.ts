import "server-only";
import { eq } from "drizzle-orm";
import { geocode } from "@/lib/geocode";
import { hasPlaces } from "@/lib/nearby-core";
import { nearby } from "@/lib/nearby";
import { db } from "./db";
import { listings } from "./schema";

// Po zapisie oferty: współrzędne adresu i okolica z OpenStreetMap zapisane przy ofercie,
// żeby karta w CRM i strona oferty pokazywały je od razu (bez pobierania na żywo).
export async function storeArea(id: number) {
  try {
    const d = await db();
    const [l] = await d.select().from(listings).where(eq(listings.id, id));
    if (!l) return;
    let spot = l.lat != null && l.lng != null ? { lat: l.lat, lng: l.lng } : null;
    if (!spot) {
      const g = await geocode({ street: l.street ?? undefined, district: l.district, city: l.city });
      if (!g) return;
      spot = { lat: g.lat, lng: g.lng };
      await d.update(listings).set({ lat: spot.lat, lng: spot.lng }).where(eq(listings.id, id));
    }
    if (hasPlaces(l.nearby)) return;
    const cats = await nearby(spot);
    if (hasPlaces(cats)) await d.update(listings).set({ nearby: cats }).where(eq(listings.id, id));
  } catch (e) {
    console.warn("[okolica] zapis w tle", e);
  }
}
