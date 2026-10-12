import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { listings as staticListings, type Listing } from "./data";
import { db, dbConfigured } from "./crm/db";
import { listings as table, users, type ListingRow } from "./crm/schema";

// Oferty na stronie. Źródło: CRM (statusy „aktywna” i „rezerwacja”), a gdy CRM nie ma jeszcze żadnej
// opublikowanej oferty albo baza nie jest podłączona: oferty startowe z lib/data.ts.

export const PUBLIC_STATUSES = ["aktywna", "rezerwacja"];

export function toPublic(r: ListingRow, agentEmail?: string | null): Listing {
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
    agentEmail: agentEmail ?? undefined,
  };
}

export async function getListings(): Promise<Listing[]> {
  if (!dbConfigured()) return staticListings;
  try {
    const d = await db();
    const rows = await d
      .select({ l: table, agentEmail: users.email })
      .from(table)
      .leftJoin(users, eq(users.id, table.agentId))
      .where(inArray(table.status, PUBLIC_STATUSES))
      .orderBy(asc(table.sortOrder), desc(table.createdAt));
    return rows.length ? rows.map((r) => toPublic(r.l, r.agentEmail)) : staticListings;
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
