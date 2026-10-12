"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  checkEmailCode,
  checkPassword,
  has2fa,
  issueEmailCode,
  currentSession,
  endSession,
  hashPassword,
  isLocked,
  log,
  markVerified,
  passwordProblem,
  startSession,
  totpOk,
} from "@/lib/crm/auth";
import { db } from "@/lib/crm/db";
import { codeMail, mailReady, sendMail } from "@/lib/crm/mail";
import { users } from "@/lib/crm/schema";
import { timingSafeEqual } from "node:crypto";

export type FormState = { error?: string; ok?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function login(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email").toLowerCase();
  const password = String(f.get("password") ?? "");
  if (!email || !password) return { error: "Podaj e-mail i hasło." };
  if (await isLocked(email)) return { error: "Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut." };
  const u = await checkPassword(email, password);
  if (!u) {
    await log("login_fail", { subject: email, meta: { step: "haslo" } });
    return { error: "Nieprawidłowy e-mail lub hasło." };
  }
  await startSession(u.id, false);
  if (u.totpEnabled) redirect("/crm/logowanie/2fa");
  if (has2fa(u)) {
    const sent = await deliverCode(u.id, u.email, u.name);
    redirect(`/crm/logowanie/2fa?metoda=email${sent.error ? "&blad=1" : ""}`);
  }
  redirect("/crm/logowanie/2fa-konfiguracja");
}

async function deliverCode(userId: number, email: string, name: string) {
  const r = await issueEmailCode(userId);
  if (!r.code) return { error: r.error };
  try {
    const m = codeMail(name.split(" ")[0], r.code);
    await sendMail(email, m.subject, m.text, m.html);
    return {};
  } catch (e) {
    console.error("[crm] wysyłka kodu nie powiodła się", e);
    return { error: "Nie udało się wysłać maila. Spróbuj ponownie albo użyj aplikacji." };
  }
}

// „Wyślij kod e-mailem”: przy logowaniu albo jako wybór metody przy pierwszej konfiguracji
export async function sendEmailCode(_: FormState): Promise<FormState> {
  const s = await currentSession();
  if (!s) redirect("/crm/logowanie");
  if (s.session.verified) redirect("/crm");
  if (!mailReady()) return { error: "Wysyłka maili nie jest skonfigurowana." };
  // przy włączonej aplikacji e-mail działa tylko, jeśli ktoś świadomie dodał go jako drugą metodę
  if (s.user.totpEnabled && !s.user.emailOtp) return { error: "To konto loguje się kodem z aplikacji." };
  const r = await deliverCode(s.user.id, s.user.email, s.user.name);
  if (r.error) return { error: r.error };
  redirect("/crm/logowanie/2fa?metoda=email");
}

export async function verifyEmailCode(_: FormState, f: FormData): Promise<FormState> {
  const s = await currentSession();
  if (!s) redirect("/crm/logowanie");
  if (await isLocked(s.user.email)) {
    await endSession();
    return { error: "Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut." };
  }
  if (s.user.totpEnabled && !s.user.emailOtp) redirect("/crm/logowanie/2fa");
  if (!(await checkEmailCode(s.user.id, str(f, "code")))) {
    await log("login_fail", { userId: s.user.id, subject: s.user.email, meta: { step: "kod_email" } });
    return { error: "Kod jest nieprawidłowy albo wygasł. Wyślij nowy." };
  }
  if (!s.user.emailOtp) {
    const d = await db();
    await d.update(users).set({ emailOtp: true }).where(eq(users.id, s.user.id));
    await log("email_otp_enabled", { userId: s.user.id, subject: s.user.email });
  }
  await markVerified();
  await log("login_ok", { userId: s.user.id, subject: s.user.email, meta: { metoda: "email" } });
  redirect(s.user.mustChangePassword ? "/crm/logowanie/nowe-haslo" : "/crm");
}

export async function verifyTotp(_: FormState, f: FormData): Promise<FormState> {
  const s = await currentSession();
  if (!s) redirect("/crm/logowanie");
  if (await isLocked(s.user.email)) {
    await endSession();
    return { error: "Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut." };
  }
  if (!s.user.totpSecret || !(await totpOk(s.user.totpSecret, str(f, "code")))) {
    await log("login_fail", { userId: s.user.id, subject: s.user.email, meta: { step: "2fa" } });
    return { error: "Nieprawidłowy kod. Sprawdź godzinę w telefonie i spróbuj ponownie." };
  }
  await markVerified();
  await log("login_ok", { userId: s.user.id, subject: s.user.email });
  redirect("/crm");
}

export async function enableTotp(_: FormState, f: FormData): Promise<FormState> {
  const s = await currentSession();
  if (!s) redirect("/crm/logowanie");
  if (has2fa(s.user)) redirect("/crm/logowanie/2fa");
  if (!s.user.totpSecret || !(await totpOk(s.user.totpSecret, str(f, "code")))) return { error: "Kod się nie zgadza. Zeskanuj kod QR jeszcze raz i wpisz aktualne 6 cyfr." };
  const d = await db();
  await d.update(users).set({ totpEnabled: true }).where(eq(users.id, s.user.id));
  await markVerified();
  await log("totp_enabled", { userId: s.user.id, subject: s.user.email });
  await log("login_ok", { userId: s.user.id, subject: s.user.email });
  redirect(s.user.mustChangePassword ? "/crm/logowanie/nowe-haslo" : "/crm");
}

export async function changePassword(_: FormState, f: FormData): Promise<FormState> {
  const s = await currentSession();
  if (!s || !s.session.verified) redirect("/crm/logowanie");
  const current = String(f.get("current") ?? "");
  const next = String(f.get("password") ?? "");
  if (next !== String(f.get("password2") ?? "")) return { error: "Hasła nie są takie same." };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (!(await checkPassword(s.user.email, current))) return { error: "Obecne hasło jest nieprawidłowe." };
  const d = await db();
  await d.update(users).set({ passwordHash: await hashPassword(next), mustChangePassword: false }).where(eq(users.id, s.user.id));
  await log("password_changed", { userId: s.user.id, subject: s.user.email });
  if (f.get("from") === "ustawienia") return { ok: "Hasło zmienione." };
  redirect("/crm");
}

export async function logout() {
  const s = await currentSession();
  if (s) await log("logout", { userId: s.user.id, subject: s.user.email });
  await endSession();
  redirect("/crm/logowanie");
}

// Pierwsze konto w pustej bazie; wymaga klucza CRM_SETUP_KEY ustawionego w Vercelu
export async function setupFirstUser(_: FormState, f: FormData): Promise<FormState> {
  if (await isLocked("setup")) return { error: "Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut." };
  const key = process.env.CRM_SETUP_KEY ?? "";
  const given = str(f, "key");
  if (key.length < 16 || given.length !== key.length || !timingSafeEqual(Buffer.from(given), Buffer.from(key))) {
    await log("login_fail", { subject: "setup", meta: { step: "setup" } });
    return { error: "Nieprawidłowy klucz konfiguracji." };
  }
  const d = await db();
  const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(users);
  if (n > 0) return { error: "Konto już istnieje. Zaloguj się." };
  const name = str(f, "name");
  const email = str(f, "email").toLowerCase();
  const password = String(f.get("password") ?? "");
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Podaj imię i poprawny e-mail." };
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  const [u] = await d.insert(users).values({ name, email, passwordHash: await hashPassword(password) }).returning();
  await log("setup", { userId: u.id, subject: email });
  await startSession(u.id, false);
  redirect("/crm/logowanie/2fa-konfiguracja");
}
