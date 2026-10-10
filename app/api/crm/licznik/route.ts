import { NextResponse } from "next/server";
import { currentSession } from "@/lib/crm/auth";
import { inboxCount } from "@/lib/crm/counts";

// Licznik dla dzwonka w CRM (odpytywany co minutę z otwartego panelu)
export async function GET() {
  const s = await currentSession();
  if (!s?.session.verified) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await inboxCount()) }, { headers: { "Cache-Control": "no-store" } });
}
