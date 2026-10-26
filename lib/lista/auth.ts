import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { clientIp } from "@/lib/crm/auth";
import { db, dbConfigured } from "@/lib/crm/db";
import { audit, listaDevices, type ListaDevice } from "@/lib/crm/schema";

// Logowanie do Listy: jedno wspólne hasło (zmienna LISTA_HASLO w Vercelu) i imię, raz na urządzenie.
// Urządzenie dostaje losowy token w ciasteczku httpOnly na ok. rok, w bazie tylko jego skrót sha256.
// 5 nieudanych prób w 15 minut z jednego IP blokuje logowanie (te same zapisy w tabeli audit co w CRM).

const COOKIE = "elstate_lista";
const MAX_AGE = 400 * 24 * 60 * 60;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export const listaReady = () => dbConfigured() && Boolean(process.env.LISTA_HASLO);

export function passwordOk(input: string) {
  const a = Buffer.from(sha(input));
  const b = Buffer.from(sha(process.env.LISTA_HASLO ?? randomBytes(16).toString("hex")));
  return timingSafeEqual(a, b);
}

export async function loginLocked() {
  const d = await db();
  const [row] = await d
    .select({ n: sql<number>`count(*)::int` })
    .from(audit)
    .where(and(eq(audit.action, "lista_login_fail"), eq(audit.ip, await clientIp()), gt(audit.createdAt, sql`now() - interval '15 minutes'`)));
  return (row?.n ?? 0) >= 5;
}

export async function logFail() {
  const d = await db();
  await d.insert(audit).values({ action: "lista_login_fail", ip: await clientIp(), meta: { ua: (await headers()).get("user-agent")?.slice(0, 200) } });
}

async function setCookie(token: string) {
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE });
}

export async function startDevice(name: string) {
  const d = await db();
  const token = randomBytes(32).toString("base64url");
  await d.insert(listaDevices).values({ tokenHash: sha(token), name });
  await setCookie(token);
}

export async function endDevice() {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (token) await (await db()).delete(listaDevices).where(eq(listaDevices.tokenHash, sha(token)));
  c.delete(COOKIE);
}

/** Urządzenie z ważnym ciasteczkiem albo null. */
export async function currentDevice(): Promise<ListaDevice | null> {
  if (!listaReady()) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [dev] = await (await db()).select().from(listaDevices).where(eq(listaDevices.tokenHash, sha(token)));
  return dev ?? null;
}

/** Przedłuża ciasteczko (tylko w route handlerach i akcjach) i zapisuje aktywność, najwyżej raz na dobę. */
export async function touchDevice(dev: ListaDevice) {
  if (Date.now() - dev.lastActiveAt.getTime() < 24 * 60 * 60 * 1000) return;
  await (await db()).update(listaDevices).set({ lastActiveAt: new Date() }).where(eq(listaDevices.id, dev.id));
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) await setCookie(token);
}
