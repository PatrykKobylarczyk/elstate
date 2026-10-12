import type { Metadata } from "next";
import QRCode from "qrcode";
import AuthCard from "@/components/crm/AuthCard";
import { ActionForm, Submit } from "@/components/crm/forms";
import { Field, input } from "@/components/crm/ui";
import { ensureTotpSecret, totpUri } from "@/lib/crm/auth";
import { mailReady } from "@/lib/crm/mail";
import { enableTotp, sendEmailCode } from "../../auth-actions";

export const metadata: Metadata = { title: "Włącz 2FA" };

export default async function Konfiguracja() {
  const { email, secret } = await ensureTotpSecret();
  const qr = await QRCode.toDataURL(totpUri(email, secret), { margin: 1, width: 220, color: { dark: "#320920", light: "#ffffff" } });
  return (
    <AuthCard
      title="Zabezpiecz konto"
      sub={mailReady() ? "Logowanie wymaga drugiego kroku. Wybierz: kod z aplikacji w telefonie (bezpieczniej) albo kod wysyłany na e-mail." : "Logowanie do CRM wymaga kodu z telefonu. Zeskanuj kod QR w aplikacji Google Authenticator, Microsoft Authenticator lub 1Password."}
    >
      {mailReady() && <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-plum-900">1. Aplikacja w telefonie</p>}
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="Kod QR do aplikacji uwierzytelniającej" width={220} height={220} className="rounded-xl" />
        <details className="w-full text-xs text-graphite/55">
          <summary className="cursor-pointer text-center">Nie możesz zeskanować? Pokaż klucz</summary>
          <code className="mt-2 block break-all rounded-lg bg-white p-2 text-center font-mono text-[13px] text-graphite">{secret.replace(/(.{4})/g, "$1 ").trim()}</code>
        </details>
      </div>
      <ActionForm action={enableTotp} className="mt-6 flex flex-col gap-4">
        <Field label="Kod z aplikacji">
          <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required placeholder="123 456" className={`${input} text-center text-xl tracking-[0.3em]`} />
        </Field>
        <Submit pending="Sprawdzam…">Włącz i zaloguj</Submit>
      </ActionForm>
      {mailReady() && (
        <div className="mt-7 border-t border-graphite/10 pt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-plum-900">2. Albo kod na e-mail</p>
          <p className="mb-4 text-sm text-graphite/60">Przy każdym logowaniu dostaniesz 6 cyfr na skrzynkę {email}.</p>
          <ActionForm action={sendEmailCode} className="flex flex-col gap-3">
            <Submit className="inline-flex items-center justify-center rounded-full border border-graphite/15 bg-white px-5 py-2.5 text-sm font-semibold hover:border-plum-700" pending="Wysyłam…">
              Wyślij kod na e-mail
            </Submit>
          </ActionForm>
        </div>
      )}
    </AuthCard>
  );
}
