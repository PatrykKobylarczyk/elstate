import { NextResponse } from "next/server";
import { currentSession } from "@/lib/crm/auth";
import { one } from "@/lib/crm/ceny";

// Szczegóły jednej transakcji do dymka na mapie cen
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await currentSession();
  if (!s?.session.verified) return NextResponse.json({ ok: false }, { status: 401 });
  const r = await one(decodeURIComponent((await params).id));
  if (!r) return NextResponse.json({ ok: false }, { status: 404 });
  const { importedAt: _i, ...row } = r;
  return NextResponse.json({ ok: true, row }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
