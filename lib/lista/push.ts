import "server-only";
import { eq } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/lib/crm/db";
import { vapidKeys } from "@/lib/crm/push";
import { listaDevices, listaPush } from "@/lib/crm/schema";
import { sameName, unseenCount } from "./items";

// Powiadomienia Listy: przy nowym wpisie dostają je urządzenia pozostałych osób (nie autora).
// W treści idzie licznik nowych wpisów dla tego urządzenia; service worker ustawia go na ikonie (navigator.setAppBadge).
// Klucze VAPID te same co w CRM (lib/crm/push.ts). Nigdy nie rzuca błędem: wpis zapisuje się zawsze.

export type ListaPushMessage = { title: string; body: string; tag?: string };

async function send(sub: typeof listaPush.$inferSelect, payload: string) {
  const keys = await vapidKeys();
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, {
      vapidDetails: { subject: "mailto:info@elstate.pl", publicKey: keys.publicKey, privateKey: keys.privateKey },
      TTL: 60 * 60 * 24,
      timeout: 5000,
    });
    return true;
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) await (await db()).delete(listaPush).where(eq(listaPush.id, sub.id));
    else console.error("[lista push]", code ?? (e as Error).message);
    return false;
  }
}

/** Do wszystkich urządzeń poza osobą `author`, każde z własnym licznikiem. */
export async function notifyOthers(author: string, msg: ListaPushMessage) {
  try {
    const d = await db();
    const rows = await d.select({ sub: listaPush, dev: listaDevices }).from(listaPush).innerJoin(listaDevices, eq(listaDevices.id, listaPush.deviceId));
    const targets = rows.filter((r) => !sameName(r.dev.name, author));
    const counts = new Map<number, number>();
    await Promise.all(
      targets.map(async ({ sub, dev }) => {
        if (!counts.has(dev.id)) counts.set(dev.id, await unseenCount(dev));
        await send(sub, JSON.stringify({ ...msg, badge: counts.get(dev.id), url: "/lista" }));
      }),
    );
  } catch (e) {
    console.error("[lista push]", (e as Error).message);
  }
}

/** Próbne powiadomienie na jedno urządzenie. */
export async function notifyDevice(deviceId: number, msg: ListaPushMessage) {
  const d = await db();
  const subs = await d.select().from(listaPush).where(eq(listaPush.deviceId, deviceId));
  const ok = await Promise.all(subs.map((s) => send(s, JSON.stringify({ ...msg, url: "/lista" }))));
  return ok.filter(Boolean).length;
}
