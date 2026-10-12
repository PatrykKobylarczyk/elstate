import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthCard from "@/components/crm/AuthCard";
import { ActionForm, Submit } from "@/components/crm/forms";
import { input } from "@/components/crm/ui";
import { currentSession, has2fa } from "@/lib/crm/auth";
import { mailReady } from "@/lib/crm/mail";
import { logout, sendEmailCode, verifyEmailCode, verifyTotp } from "../../auth-actions";

export const metadata: Metadata = { title: "Kod logowania" };

const codeInput = (big = true) => (
  <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus placeholder="123 456" className={`${input} text-center ${big ? "text-2xl" : "text-xl"} tracking-[0.3em]`} />
);

const mask = (email: string) => email.replace(/^(.{2})[^@]*/, (_, a) => `${a}•••`);

export default async function Kod({ searchParams }: { searchParams: Promise<{ metoda?: string; blad?: string }> }) {
  const s = await currentSession();
  if (!s) redirect("/crm/logowanie");
  if (s.session.verified) redirect("/crm");
  const sp = await searchParams;
  const canEmail = mailReady() && (s.user.emailOtp || !s.user.totpEnabled);
  const viaEmail = sp.metoda === "email" && canEmail;
  if (!viaEmail && !s.user.totpEnabled) redirect(has2fa(s.user) ? "/crm/logowanie/2fa?metoda=email" : "/crm/logowanie/2fa-konfiguracja");

  const resend = (
    <ActionForm action={sendEmailCode} className="mt-4 flex flex-col items-center gap-2 text-center">
      <Submit className="text-sm font-semibold text-plum-900 underline" pending="Wysyłam…">
        {viaEmail ? "Wyślij nowy kod" : "Wyślij kod na e-mail"}
      </Submit>
    </ActionForm>
  );

  return viaEmail ? (
    <AuthCard title="Kod z e-maila" sub={<>Wysłaliśmy 6 cyfr na <b>{mask(s.user.email)}</b>. Kod jest ważny 10 minut.{sp.blad && <span className="mt-2 block text-red-800">Nie udało się wysłać kodu. Spróbuj „Wyślij nowy kod”.</span>}</>}>
      <ActionForm action={verifyEmailCode} className="flex flex-col gap-4">
        {codeInput()}
        <Submit pending="Sprawdzam…">Zaloguj</Submit>
      </ActionForm>
      {resend}
      {s.user.totpEnabled && (
        <p className="mt-2 text-center">
          <a href="/crm/logowanie/2fa" className="text-sm text-graphite/55 underline">Użyj aplikacji</a>
        </p>
      )}
      <form action={logout} className="mt-2 text-center">
        <button className="text-sm text-graphite/55 underline">Anuluj</button>
      </form>
    </AuthCard>
  ) : (
    <AuthCard title="Kod z aplikacji" sub="Wpisz 6 cyfr z aplikacji uwierzytelniającej (Google Authenticator, 1Password, Authy).">
      <ActionForm action={verifyTotp} className="flex flex-col gap-4">
        {codeInput()}
        <Submit pending="Sprawdzam…">Zaloguj</Submit>
      </ActionForm>
      {canEmail && resend}
      <form action={logout} className="mt-2 text-center">
        <button className="text-sm text-graphite/55 underline">Anuluj</button>
      </form>
    </AuthCard>
  );
}
