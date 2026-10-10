import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthCard from "@/components/crm/AuthCard";
import { ActionForm, Submit } from "@/components/crm/forms";
import { input } from "@/components/crm/ui";
import { currentSession } from "@/lib/crm/auth";
import { logout, verifyTotp } from "../../auth-actions";

export const metadata: Metadata = { title: "Kod 2FA" };

export default async function Kod() {
  const s = await currentSession();
  if (!s) redirect("/crm/logowanie");
  if (!s.user.totpEnabled) redirect("/crm/logowanie/2fa-konfiguracja");
  if (s.session.verified) redirect("/crm");
  return (
    <AuthCard title="Kod z aplikacji" sub="Wpisz 6 cyfr z aplikacji uwierzytelniającej (Google Authenticator, 1Password, Authy).">
      <ActionForm action={verifyTotp} className="flex flex-col gap-4">
        <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus placeholder="123 456" className={`${input} text-center text-2xl tracking-[0.3em]`} />
        <Submit pending="Sprawdzam…">Zaloguj</Submit>
      </ActionForm>
      <form action={logout} className="mt-4 text-center">
        <button className="text-sm text-graphite/55 underline">Anuluj</button>
      </form>
    </AuthCard>
  );
}
