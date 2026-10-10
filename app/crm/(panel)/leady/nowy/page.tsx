import type { Metadata } from "next";
import { ActionForm, Submit } from "@/components/crm/forms";
import { Field, PageHead, card, input } from "@/components/crm/ui";
import { requireUser } from "@/lib/crm/auth";
import { createLead } from "../../actions";

export const metadata: Metadata = { title: "Nowe zgłoszenie" };

export default async function NowyLead() {
  await requireUser();
  return (
    <>
      <PageHead title="Nowe zgłoszenie" sub="Telefon, polecenie, ogłoszenie znalezione samodzielnie." />
      <ActionForm action={createLead} className={`${card} grid max-w-2xl gap-4 md:grid-cols-2`}>
        <Field label="Czego dotyczy" className="md:col-span-2">
          <input name="title" placeholder="np. Sprzedaż 3 pokoi, Widzew" className={input} />
        </Field>
        <Field label="Osoba">
          <input name="contactName" className={input} />
        </Field>
        <Field label="Telefon">
          <input name="phone" type="tel" className={input} />
        </Field>
        <Field label="E-mail">
          <input name="email" type="email" className={input} />
        </Field>
        <Field label="Link do ogłoszenia">
          <input name="url" type="url" className={input} />
        </Field>
        <Field label="Notatka" className="md:col-span-2">
          <textarea name="message" rows={4} className={input} />
        </Field>
        <div className="md:col-span-2">
          <Submit>Dodaj zgłoszenie</Submit>
        </div>
      </ActionForm>
    </>
  );
}
