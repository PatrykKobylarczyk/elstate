import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/crm/db";
import { ingestContactForm } from "@/lib/crm/leads";

// Odbiór formularza kontaktowego. Gdy CRM ma bazę, wiadomość trafia do skrzynki „Do kontaktu”.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.reach || !body?.message || !body?.consent) {
    return NextResponse.json({ ok: false, error: "Uzupełnij wszystkie pola." }, { status: 400 });
  }
  const form = { name: String(body.name), reach: String(body.reach), subject: body.subject ? String(body.subject) : undefined, message: String(body.message) };
  if (dbConfigured()) {
    try {
      await ingestContactForm(form);
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("[kontakt] zapis do CRM nie powiódł się", e);
    }
  }
  console.log("[kontakt]", form);
  return NextResponse.json({ ok: true });
}
