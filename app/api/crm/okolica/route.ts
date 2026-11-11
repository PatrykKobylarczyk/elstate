import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { currentSession, has2fa } from "@/lib/crm/auth";
import { db } from "@/lib/crm/db";
import { listings } from "@/lib/crm/schema";
import { fetchNearby, hasPlaces, type NearbyCategory } from "@/lib/nearby-core";

export const maxDuration = 30;

const noStore = { "Cache-Control": "private, no-store" };

async function crmUser() {
  const s = await currentSession().catch(() => null);
  return s && s.session.verified && has2fa(s.user) ? s.user : null;
}

// Okolica oferty (szkoły, sklepy, zieleń… z odległościami) tylko dla zalogowanych w CRM.
// Raz pobrana z OpenStreetMap zapisuje się przy ofercie, więc kolejne otwarcia są natychmiastowe (jak w N75).
export async function GET(req: NextRequest) {
  if (!(await crmUser())) return NextResponse.json({ crm: false }, { status: 401, headers: noStore });
  const sp = req.nextUrl.searchParams;
  const slug = sp.get("slug") ?? "";
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Złe współrzędne" }, { status: 400 });
  }
  const d = await db();
  const [row] = slug ? await d.select({ id: listings.id, nearby: listings.nearby, lat: listings.lat, lng: listings.lng }).from(listings).where(eq(listings.slug, slug)) : [];
  if (hasPlaces(row?.nearby)) return NextResponse.json({ crm: true, categories: row.nearby }, { headers: noStore });
  const errors: string[] = [];
  // strona publiczna wysyła przybliżone położenie: okolicę liczymy od dokładnego punktu zapisanego przy ofercie
  const home = row && row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : { lat, lng };
  const categories = await fetchNearby(home, 20000, { headers: { "User-Agent": "elstate.pl (info@elstate.pl)" } }, errors);
  if (row && hasPlaces(categories)) await d.update(listings).set({ nearby: categories }).where(eq(listings.id, row.id));
  return NextResponse.json({ crm: true, categories: categories ?? [], errors }, { headers: noStore });
}

const Body = z.object({
  slug: z.string().min(1).max(200),
  categories: z
    .array(
      z.object({
        key: z.string().max(10),
        label: z.string().max(40),
        items: z.array(z.object({ name: z.string().max(200), lat: z.number(), lng: z.number(), m: z.number() })).max(10),
      }),
    )
    .max(10),
});

// Przeglądarka pobrała okolicę sama (serwer nie dostał odpowiedzi): zapisz ją przy ofercie.
export async function POST(req: NextRequest) {
  if (!(await crmUser())) return NextResponse.json({ crm: false }, { status: 401, headers: noStore });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !hasPlaces(parsed.data.categories)) return NextResponse.json({ error: "Złe dane" }, { status: 400 });
  const d = await db();
  await d.update(listings).set({ nearby: parsed.data.categories as NearbyCategory[] }).where(eq(listings.slug, parsed.data.slug));
  return NextResponse.json({ ok: true }, { headers: noStore });
}
