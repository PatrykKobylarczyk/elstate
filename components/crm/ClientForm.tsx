import { saveClient } from "@/app/crm/(panel)/actions";
import { clientKinds } from "@/lib/crm/labels";
import type { ClientRow } from "@/lib/crm/schema";
import { ActionForm, Submit } from "./forms";
import { Field, card, input } from "./ui";

export default function ClientForm({ c }: { c?: ClientRow }) {
  return (
    <ActionForm action={saveClient} className={`${card} grid gap-4 md:grid-cols-2`}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Imię i nazwisko / firma">
        <input name="name" required defaultValue={c?.name} className={input} />
      </Field>
      <Field label="Rodzaj">
        <select name="kind" defaultValue={c?.kind ?? "sprzedajacy"} className={input}>
          {clientKinds.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="Telefon">
        <input name="phone" type="tel" defaultValue={c?.phone ?? ""} className={input} />
      </Field>
      <Field label="E-mail">
        <input name="email" type="email" defaultValue={c?.email ?? ""} className={input} />
      </Field>
      <Field label="Notatki (czego szuka, budżet, ustalenia)" className="md:col-span-2">
        <textarea name="notes" rows={4} defaultValue={c?.notes ?? ""} className={input} />
      </Field>
      <div className="md:col-span-2">
        <Submit>Zapisz</Submit>
      </div>
    </ActionForm>
  );
}
