import type { Metadata } from "next";
import QRCode from "qrcode";
import AuthCard from "@/components/crm/AuthCard";
import { ActionForm, Submit } from "@/components/crm/forms";
import { Field, input } from "@/components/crm/ui";
import { ensureTotpSecret, totpUri } from "@/lib/crm/auth";
import { enableTotp } from "../../auth-actions";

export const metadata: Metadata = { title: "Włącz 2FA" };

export default async function Konfiguracja() {
  const { email, secret } = await ensureTotpSecret();
  const qr = await QRCode.toDataURL(totpUri(email, secret), { margin: 1, width: 220, color: { dark: "#320920", light: "#ffffff" } });
  return (
    <AuthCard title="Zabezpiecz konto" sub="Logowanie do CRM wymaga kodu z telefonu. Zeskanuj kod QR w aplikacji Google Authenticator, Microsoft Authenticator lub 1Password.">
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
    </AuthCard>
  );
}
