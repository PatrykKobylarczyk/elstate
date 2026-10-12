import "server-only";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, eq, gt, lt, or, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { generateSecret, generateURI, verify } from "otplib";
import { db, dbConfigured } from "./db";
import { mailReady } from "./mail";
import { audit, loginCodes, sessions, users, type User } from "./schema";

// Logowanie do CRM: hasło (bcrypt) + kod z aplikacji (TOTP, obowiązkowy).
// Sesja: losowy token w ciasteczku httpOnly/secure/SameSite=Strict, w bazie tylko jego skrót sha256.
// Sesja wygasa po 12 h bez aktywności. 5 nieudanych prób w 15 minut blokuje logowanie na ten e-mail lub IP.

const COOKIE = "elstate_crm";
const IDLE_MS = 12 * 60 * 60 * 1000;
const LOCK_WINDOW_MIN = 15;
const LOCK_AFTER = 5;

let dummyHash: string | undefined;

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "local";
}

export async function log(action: string, opts: { userId?: number | null; subject?: string; meta?: unknown } = {}) {
  const d = await db();
  await d.insert(audit).values({ action, userId: opts.userId ?? null, subject: opts.subject, ip: await clientIp(), meta: opts.meta ?? null });
}

export const hashPassword = (p: string) => bcrypt.hash(p, 12);

export function passwordProblem(p: string) {
  if (p.length < 12) return "Hasło musi mieć co najmniej 12 znaków.";
  if (!/[a-ząćęłńóśźż]/.test(p) || !/[A-ZĄĆĘŁŃÓŚŹŻ]/.test(p) || !/\d/.test(p)) return "Hasło musi mieć małą i wielką literę oraz cyfrę.";
  return null;
}

export async function isLocked(email: string) {
  const d = await db();
  const ip = await clientIp();
  const [row] = await d
    .select({ n: sql<number>`count(*)::int` })
    .from(audit)
    .where(
      and(
        eq(audit.action, "login_fail"),
        gt(audit.createdAt, sql`now() - make_interval(mins => ${LOCK_WINDOW_MIN})`),
        or(eq(audit.subject, email), eq(audit.ip, ip)),
      ),
    );
  return (row?.n ?? 0) >= LOCK_AFTER;
}

export async function checkPassword(email: string, password: string): Promise<User | null> {
  const d = await db();
  const [u] = await d.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
  // porównanie z atrapą, gdy konta nie ma, żeby czas odpowiedzi nie zdradzał istnienia adresu
  const ok = await bcrypt.compare(password, u?.passwordHash ?? (dummyHash ??= bcrypt.hashSync("brak-konta", 12)));
  return u && u.active && ok ? u : null;
}

export async function startSession(userId: number, verified: boolean) {
  const d = await db();
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  await d.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await d.insert(sessions).values({
    id: sha(token),
    userId,
    verified,
    expiresAt: new Date(Date.now() + IDLE_MS),
    ip: await clientIp(),
    userAgent: h.get("user-agent")?.slice(0, 300),
  });
  const c = await cookies();
  c.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: IDLE_MS / 1000 });
}

export async function endSession() {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (token) {
    const d = await db();
    await d.delete(sessions).where(eq(sessions.id, sha(token)));
  }
  c.delete(COOKIE);
}

export async function currentSession() {
  if (!dbConfigured()) return null;
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  const d = await db();
  const id = sha(token);
  const [row] = await d.select({ s: sessions, u: users }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(eq(sessions.id, id));
  if (!row || row.s.expiresAt < new Date() || !row.u.active) return null;
  // przedłużamy sesję przy aktywności, najwyżej raz na 5 minut
  if (Date.now() - row.s.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await d.update(sessions).set({ lastSeenAt: new Date(), expiresAt: new Date(Date.now() + IDLE_MS) }).where(eq(sessions.id, id));
  }
  return { session: row.s, user: row.u };
}

export async function markVerified() {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return;
  const d = await db();
  await d.update(sessions).set({ verified: true }).where(eq(sessions.id, sha(token)));
}

/** Zalogowany użytkownik po 2FA; inaczej przekierowanie do właściwego kroku logowania. */
export async function requireUser(): Promise<User> {
  const s = await currentSession();
  if (!s) redirect("/crm/logowanie");
  if (!has2fa(s.user)) redirect("/crm/logowanie/2fa-konfiguracja");
  if (!s.session.verified) redirect("/crm/logowanie/2fa");
  if (s.user.mustChangePassword) redirect("/crm/logowanie/nowe-haslo");
  return s.user;
}

export const newTotpSecret = () => generateSecret();
export const totpUri = (email: string, secret: string) => generateURI({ issuer: "Elstate CRM", label: email, secret });
export async function totpOk(secret: string, code: string) {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return false;
  const r = await verify({ secret, token, epochTolerance: 30 });
  return r.valid;
}

export function randomPassword() {
  // 16 znaków, gwarantowane: mała, wielka litera, cyfra
  const base = randomBytes(12).toString("base64url").replace(/[-_]/g, "x");
  return `${base}Aa1`;
}

// Pierwsza konfiguracja 2FA: sekret zapisujemy od razu, włączamy dopiero po poprawnym kodzie
export async function ensureTotpSecret() {
  const s = await currentSession();
  if (!s) redirect("/crm/logowanie");
  if (has2fa(s.user)) redirect("/crm/logowanie/2fa");
  if (s.user.totpSecret) return { email: s.user.email, secret: s.user.totpSecret };
  const secret = newTotpSecret();
  const d = await db();
  await d.update(users).set({ totpSecret: secret }).where(eq(users.id, s.user.id));
  return { email: s.user.email, secret };
}

export const has2fa = (u: User) => u.totpEnabled || (u.emailOtp && mailReady());

// Kod e-mailem: 6 cyfr, ważny 10 minut, najwyżej 5 prób; nowy kod unieważnia poprzednie
export async function issueEmailCode(userId: number) {
  const d = await db();
  const [recent] = await d
    // limit 45 s liczymy tylko od kodu, który wciąż czeka na użycie
    .select({ n: sql<number>`count(*)::int`, last: sql<Date | null>`max(${loginCodes.createdAt}) filter (where ${loginCodes.usedAt} is null)` })
    .from(loginCodes)
    .where(and(eq(loginCodes.userId, userId), gt(loginCodes.createdAt, sql`now() - interval '15 minutes'`)));
  if (recent.last && Date.now() - new Date(recent.last).getTime() < 45_000) return { error: "Kod został właśnie wysłany. Nowy możesz wysłać za chwilę." };
  if (recent.n >= 5) return { error: "Wysłano już 5 kodów. Spróbuj ponownie za 15 minut." };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await d.update(loginCodes).set({ usedAt: new Date() }).where(and(eq(loginCodes.userId, userId), sql`${loginCodes.usedAt} is null`));
  await d.insert(loginCodes).values({ userId, codeHash: sha(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  return { code };
}

export async function checkEmailCode(userId: number, input: string) {
  const code = input.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  const d = await db();
  const [row] = await d
    .select()
    .from(loginCodes)
    .where(and(eq(loginCodes.userId, userId), sql`${loginCodes.usedAt} is null`, gt(loginCodes.expiresAt, new Date())))
    .orderBy(sql`${loginCodes.id} desc`)
    .limit(1);
  if (!row || row.attempts >= 5) return false;
  const a = Buffer.from(sha(code));
  const ok = timingSafeEqual(a, Buffer.from(row.codeHash));
  await d.update(loginCodes).set(ok ? { usedAt: new Date() } : { attempts: row.attempts + 1 }).where(eq(loginCodes.id, row.id));
  return ok;
}
