import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/crm/auth";
import { db } from "@/lib/crm/db";
import { notify, vapidKeys } from "@/lib/crm/push";
import { pushSubscriptions } from "@/lib/crm/schema";

// Powiadomienia push na tym urządzeniu: GET klucz publiczny, POST zapis urządzenia (albo próbne powiadomienie), DELETE wyłączenie.
async function user() {
  const s = await currentSession();
  return s?.session.verified ? s.user : null;
}

export async function GET() {
  if (!(await user())) return NextResponse.json({ ok: false }, { status: 401 });
  const { publicKey } = await vapidKeys();
  return NextResponse.json({ ok: true, publicKey }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const u = await user();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { test?: boolean; subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } } | null;
  if (body?.test) {
    const sent = await notify({ title: "Elstate CRM", body: "Powiadomienia działają na tym urządzeniu.", url: "/crm", tag: "elstate-test" }, u.id);
    return NextResponse.json({ ok: sent > 0, sent });
  }
  const sub = body?.subscription;
  if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ ok: false, error: "Niepełne dane urządzenia." }, { status: 400 });
  }
  const d = await db();
  const values = { userId: u.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null };
  await d.insert(pushSubscriptions).values(values).onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: values });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const u = await user();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (body?.endpoint) {
    const d = await db();
    await d.delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, body.endpoint), eq(pushSubscriptions.userId, u.id)));
  }
  return NextResponse.json({ ok: true });
}
