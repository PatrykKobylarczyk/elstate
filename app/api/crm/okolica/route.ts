import { NextResponse, type NextRequest } from "next/server";
import { currentSession, has2fa } from "@/lib/crm/auth";
import { nearby } from "@/lib/nearby";

export const maxDuration = 30;

// Okolica oferty (szkoły, sklepy, zieleń… z odległościami) dla strony oferty oglądanej z CRM.
// Tylko dla zalogowanych po 2FA; dla pozostałych 401, więc na stronie widać samą mapę z adresem.
export async function GET(req: NextRequest) {
  const s = await currentSession().catch(() => null);
  if (!s || !s.session.verified || !has2fa(s.user)) return NextResponse.json({ crm: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Złe współrzędne" }, { status: 400 });
  }
  const categories = await nearby({ lat, lng });
  return NextResponse.json({ crm: true, categories }, { headers: { "Cache-Control": "private, no-store" } });
}
