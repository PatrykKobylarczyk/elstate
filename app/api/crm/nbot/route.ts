import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/crm/db";
import { ingestNbot } from "@/lib/crm/leads";

// Odbiór maili z nbot. Skrypt w Gmailu (Ustawienia CRM → nbot) przesyła tu każdy nowy mail z alertem.
// Wymaga klucza CRM_INBOUND_KEY w nagłówku „x-elstate-key” (albo w parametrze ?key=).
export async function POST(req: Request) {
  const expected = process.env.CRM_INBOUND_KEY;
  const got = req.headers.get("x-elstate-key") ?? new URL(req.url).searchParams.get("key") ?? "";
  if (!expected || expected.length < 24 || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "Brak bazy CRM." }, { status: 503 });
  const type = req.headers.get("content-type") ?? "";
  const body = type.includes("json") ? await req.json().catch(() => null) : { text: await req.text() };
  if (!body || (!body.text && !body.html)) return NextResponse.json({ ok: false, error: "Pusta wiadomość." }, { status: 400 });
  const r = await ingestNbot({ subject: body.subject, text: body.text, html: body.html, from: body.from });
  return NextResponse.json({ ok: true, ...r });
}
