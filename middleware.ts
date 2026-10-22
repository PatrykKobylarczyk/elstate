import { NextResponse, type NextRequest } from "next/server";
import { REGION_COOKIE, isRegion, type Region } from "@/lib/region-cookie";

const CITY_REGION: Record<string, Region> = { "Łódź": "lodz", "Trójmiasto": "gdansk" };

// Pierwsza linia obrony CRM: bez ciasteczka sesji od razu na logowanie.
// Właściwe sprawdzenie (sesja w bazie, 2FA) robi każda strona i akcja przez requireUser().
// Na stronie: wybór panoramy (przełącznik w hero albo miasto z kafli) zapamiętujemy na rok, patrz lib/region.ts.
export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  if (pathname.startsWith("/crm")) {
    const open = pathname.startsWith("/crm/logowanie") || pathname === "/crm/start";
    if (!open && !req.cookies.has("elstate_crm")) {
      return NextResponse.redirect(new URL("/crm/logowanie", req.url));
    }
    return NextResponse.next();
  }
  const panorama = searchParams.get("panorama") ?? "";
  const region = isRegion(panorama) ? panorama : CITY_REGION[searchParams.get("miasto") ?? ""];
  if (!region || req.cookies.get(REGION_COOKIE)?.value === region) return NextResponse.next();
  // ciasteczko także w bieżącym żądaniu, żeby ta sama strona od razu pokazała wybraną panoramę
  req.cookies.set(REGION_COOKIE, region);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set(REGION_COOKIE, region, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}

export const config = { matcher: ["/crm", "/crm/:path*", "/", "/oferty"] };
