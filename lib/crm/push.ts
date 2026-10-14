import "server-only";
import { eq, inArray } from "drizzle-orm";
import webpush from "web-push";
import { db } from "./db";
import { appSettings, pushSubscriptions } from "./schema";

// Powiadomienia push aplikacji CRM (telefon z zainstalowanym CRM, laptop).
// Klucze VAPID tworzą się same przy pierwszym użyciu i siedzą w bazie, więc nie trzeba niczego ustawiać w Vercelu.
// Zmienne VAPID_PUBLIC_KEY i VAPID_PRIVATE_KEY, jeśli są, mają pierwszeństwo.

let cached: { publicKey: string; privateKey: string } | null = null;

export async function vapidKeys() {
  if (cached) return cached;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    cached = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    return cached;
  }
  const d = await db();
  const rows = await d.select().from(appSettings).where(inArray(appSettings.key, ["vapid_public", "vapid_private"]));
  const pub = rows.find((r) => r.key === "vapid_public")?.value;
  const priv = rows.find((r) => r.key === "vapid_private")?.value;
  if (pub && priv) return (cached = { publicKey: pub, privateKey: priv });
  const k = webpush.generateVAPIDKeys();
  // dwa równoległe żądania mogą tu trafić jednocześnie; wygrywa pierwszy zapis, a my czytamy to, co zostało w bazie
  await d.insert(appSettings).values([{ key: "vapid_public", value: k.publicKey }, { key: "vapid_private", value: k.privateKey }]).onConflictDoNothing();
  const again = await d.select().from(appSettings).where(inArray(appSettings.key, ["vapid_public", "vapid_private"]));
  cached = { publicKey: again.find((r) => r.key === "vapid_public")!.value, privateKey: again.find((r) => r.key === "vapid_private")!.value };
  return cached;
}

export type PushMessage = { title: string; body: string; url?: string; tag?: string };

// Wysyła powiadomienie na wszystkie urządzenia (albo tylko jednego użytkownika). Nigdy nie rzuca błędem:
// zgłoszenie zapisuje się zawsze, nawet gdy push nie dojdzie. Wygasłe urządzenia usuwa z bazy.
export async function notify(msg: PushMessage, userId?: number) {
  try {
    const d = await db();
    const subs = await d.select().from(pushSubscriptions).where(userId ? eq(pushSubscriptions.userId, userId) : undefined);
    if (!subs.length) return 0;
    const keys = await vapidKeys();
    const payload = JSON.stringify({ url: "/crm", ...msg });
    let sent = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
            vapidDetails: { subject: "mailto:info@elstate.pl", publicKey: keys.publicKey, privateKey: keys.privateKey },
            TTL: 60 * 60 * 24,
            timeout: 5000,
          });
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await d.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
          else console.error("[push]", code ?? (e as Error).message);
        }
      }),
    );
    return sent;
  } catch (e) {
    console.error("[push]", (e as Error).message);
    return 0;
  }
}
