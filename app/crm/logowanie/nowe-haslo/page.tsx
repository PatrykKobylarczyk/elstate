import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthCard from "@/components/crm/AuthCard";
import { ActionForm, Submit } from "@/components/crm/forms";
import { Field, input } from "@/components/crm/ui";
import { currentSession } from "@/lib/crm/auth";
import { changePassword } from "../../auth-actions";

export const metadata: Metadata = { title: "Nowe hasło" };

export default async function NoweHaslo() {
  const s = await currentSession();
  if (!s || !s.session.verified) redirect("/crm/logowanie");
  return (
    <AuthCard title="Ustaw własne hasło" sub="Hasło tymczasowe trzeba zmienić przy pierwszym logowaniu. Co najmniej 12 znaków, mała i wielka litera oraz cyfra.">
      <ActionForm action={changePassword} className="flex flex-col gap-4">
        <Field label="Hasło tymczasowe">
          <input name="current" type="password" autoComplete="current-password" required className={input} />
        </Field>
        <Field label="Nowe hasło">
          <input name="password" type="password" autoComplete="new-password" minLength={12} required className={input} />
        </Field>
        <Field label="Powtórz nowe hasło">
          <input name="password2" type="password" autoComplete="new-password" minLength={12} required className={input} />
        </Field>
        <Submit>Zapisz i przejdź do CRM</Submit>
      </ActionForm>
    </AuthCard>
  );
}
