import { NextResponse } from "next/server";

// Odbiór formularza kontaktowego.
// TODO: podłącz wysyłkę e-maila (np. Resend, SMTP) lub CRM. Na razie zapis trafia do logów serwera.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.reach || !body?.message || !body?.consent) {
    return NextResponse.json({ ok: false, error: "Uzupełnij wszystkie pola." }, { status: 400 });
  }
  console.log("[kontakt]", { name: body.name, reach: body.reach, subject: body.subject, message: body.message });
  return NextResponse.json({ ok: true });
}
