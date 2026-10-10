import "server-only";
import { asc, desc, inArray } from "drizzle-orm";
import { listings as staticListings, type Listing } from "./data";
import { db, dbConfigured } from "./crm/db";
import { listings as table, type ListingRow } from "./crm/schema";

// Oferty na stronie. Źródło: CRM (statusy „aktywna” i „rezerwacja”), a gdy CRM nie ma jeszcze żadnej
// opublikowanej oferty albo baza nie jest podłączona: oferty startowe z lib/data.ts.

export const PUBLIC_STATUSES = ["aktywna", "rezerwacja"];

export function toPublic(r: ListingRow): Listing {
  return {
    slug: r.slug,
    title: r.title,
    district: r.district,
    city: r.city,
    category: r.category as Listing["category"],
    deal: r.deal as Listing["deal"],
    price: r.price,
    area: r.area,
    rooms: r.rooms,
    floor: r.floor,
    year: r.year ?? undefined,
    image: r.images[0],
    images: r.images,
    featured: r.featured,
    description: r.description ?? undefined,
    features: r.features,
    street: r.street ?? undefined,
    floorsTotal: r.floorsTotal ?? undefined,
    reserved: r.status === "rezerwacja",
  };
}

export async function getListings(): Promise<Listing[]> {
  if (!dbConfigured()) return staticListings;
  try {
    const d = await db();
    const rows = await d.select().from(table).where(inArray(table.status, PUBLIC_STATUSES)).orderBy(asc(table.sortOrder), desc(table.createdAt));
    return rows.length ? rows.map(toPublic) : staticListings;
  } catch (e) {
    // awaria bazy nie może położyć strony
    console.error("[oferty] baza niedostępna, pokazuję oferty startowe", e);
    return staticListings;
  }
}

export async function getListing(slug: string) {
  return (await getListings()).find((l) => l.slug === slug);
}

export function districtsOf(list: Listing[]) {
  return [...new Set(list.map((l) => l.district).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pl"));
}
