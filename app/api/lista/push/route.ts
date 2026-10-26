import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/crm/db";
import { vapidKeys } from "@/lib/crm/push";
import { listaPush } from "@/lib/crm/schema";
import { device, json } from "@/lib/lista/api";
import { notifyDevice } from "@/lib/lista/push";

// Powiadomienia Listy na tym urządzeniu: GET klucz publiczny, POST zapis urządzenia (albo próbne), DELETE wyłączenie.
export async function GET(req: Request) {
  const dev = await device(req);
  if (dev instanceof NextResponse) return dev;
  const { publicKey } = await vapidKeys();
  return json({ ok: true, publicKey });
}

export async function POST(req: Request) {
  const dev = await device(req);
  if (dev instanceof NextResponse) return dev;
  const body = (await req.json().catch(() => null)) as { test?: boolean; subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } } | null;
  if (body?.test) {
    const sent = await notifyDevice(dev.id, { title: "Lista", body: "Powiadomienia działają na tym telefonie.", tag: "lista-test" });
    return json({ ok: sent > 0, sent });
  }
  const sub = body?.subscription;
  if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) {
    return json({ ok: false, error: "Niepełne dane urządzenia." }, 400);
  }
  const values = { deviceId: dev.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth };
  await (await db()).insert(listaPush).values(values).onConflictDoUpdate({ target: listaPush.endpoint, set: values });
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const dev = await device(req);
  if (dev instanceof NextResponse) return dev;
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (body?.endpoint) await (await db()).delete(listaPush).where(and(eq(listaPush.endpoint, body.endpoint), eq(listaPush.deviceId, dev.id)));
  return json({ ok: true });
}
