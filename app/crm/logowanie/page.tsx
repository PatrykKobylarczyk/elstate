import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import AuthCard from "@/components/crm/AuthCard";
import NoDb from "@/components/crm/NoDb";
import { ActionForm, Submit } from "@/components/crm/forms";
import { Field, input } from "@/components/crm/ui";
import { currentSession } from "@/lib/crm/auth";
import { db, dbConfigured } from "@/lib/crm/db";
import { users } from "@/lib/crm/schema";
import { login } from "../auth-actions";

export const metadata: Metadata = { title: "Logowanie" };

export default async function Logowanie() {
  if (!dbConfigured()) return <NoDb />;
  const s = await currentSession();
  if (s?.session.verified) redirect("/crm");
  const d = await db();
  const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(users);
  return (
    <AuthCard title="Zaloguj się" sub="Panel biura Elstate.">
      <ActionForm action={login} className="flex flex-col gap-4">
        <Field label="E-mail">
          <input name="email" type="email" autoComplete="username" required autoFocus className={input} />
        </Field>
        <Field label="Hasło">
          <input name="password" type="password" autoComplete="current-password" required className={input} />
        </Field>
        <Submit pending="Sprawdzam…">Dalej</Submit>
      </ActionForm>
      {n === 0 && (
        <p className="mt-6 text-sm text-graphite/60">
          Nie ma jeszcze kont. <Link href="/crm/start" className="font-semibold text-plum-900 underline">Załóż pierwsze konto</Link>
        </p>
      )}
    </AuthCard>
  );
}
