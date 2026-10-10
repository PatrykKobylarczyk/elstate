import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import AuthCard from "@/components/crm/AuthCard";
import NoDb from "@/components/crm/NoDb";
import { ActionForm, Submit } from "@/components/crm/forms";
import { Field, input } from "@/components/crm/ui";
import { db, dbConfigured } from "@/lib/crm/db";
import { users } from "@/lib/crm/schema";
import { setupFirstUser } from "../auth-actions";

export const metadata: Metadata = { title: "Pierwsze konto" };

export default async function Start() {
  if (!dbConfigured()) return <NoDb />;
  const d = await db();
  const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(users);
  if (n > 0) redirect("/crm/logowanie");
  return (
    <AuthCard title="Pierwsze konto" sub="Klucz konfiguracji to wartość zmiennej CRM_SETUP_KEY z ustawień projektu w Vercelu. Kolejne osoby dodasz już w CRM.">
      <ActionForm action={setupFirstUser} className="flex flex-col gap-4">
        <Field label="Klucz konfiguracji">
          <input name="key" type="password" required autoComplete="off" className={input} />
        </Field>
        <Field label="Imię i nazwisko">
          <input name="name" required autoComplete="name" className={input} />
        </Field>
        <Field label="E-mail">
          <input name="email" type="email" required autoComplete="username" className={input} />
        </Field>
        <Field label="Hasło" hint="Co najmniej 12 znaków, mała i wielka litera oraz cyfra.">
          <input name="password" type="password" minLength={12} required autoComplete="new-password" className={input} />
        </Field>
        <Submit>Utwórz konto</Submit>
      </ActionForm>
    </AuthCard>
  );
}
