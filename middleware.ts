import { NextResponse, type NextRequest } from "next/server";

// Pierwsza linia obrony CRM: bez ciasteczka sesji od razu na logowanie.
// Właściwe sprawdzenie (sesja w bazie, 2FA) robi każda strona i akcja przez requireUser().
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const open = pathname.startsWith("/crm/logowanie") || pathname === "/crm/start";
  if (!open && !req.cookies.has("elstate_crm")) {
    return NextResponse.redirect(new URL("/crm/logowanie", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/crm", "/crm/:path*"] };
