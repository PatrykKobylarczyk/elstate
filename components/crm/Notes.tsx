import { desc, eq } from "drizzle-orm";
import { addNote } from "@/app/crm/(panel)/actions";
import { db } from "@/lib/crm/db";
import { notes, users } from "@/lib/crm/schema";
import { ActionForm, Submit } from "./forms";
import { btnGhost, card, input, when } from "./ui";

// Historia kontaktu: notatki przy zgłoszeniu, kliencie lub ofercie
export default async function Notes({ leadId, clientId, listingId }: { leadId?: number; clientId?: number; listingId?: number }) {
  const d = await db();
  const by = leadId ? eq(notes.leadId, leadId) : clientId ? eq(notes.clientId, clientId) : eq(notes.listingId, listingId!);
  const rows = await d.select({ n: notes, who: users.name }).from(notes).leftJoin(users, eq(users.id, notes.userId)).where(by).orderBy(desc(notes.createdAt)).limit(100);
  return (
    <section className={card}>
      <h2 className="mb-4 font-display text-xl text-plum-900">Historia i notatki</h2>
      <ActionForm action={addNote} resetOnOk className="mb-5 flex flex-col gap-2">
        {leadId && <input type="hidden" name="leadId" value={leadId} />}
        {clientId && <input type="hidden" name="clientId" value={clientId} />}
        {listingId && <input type="hidden" name="listingId" value={listingId} />}
        <textarea name="body" rows={3} required placeholder="Np. Rozmowa z właścicielem, oddzwonić w czwartek po 17." className={input} />
        <div>
          <Submit className={btnGhost} pending="Dodaję…">Dodaj notatkę</Submit>
        </div>
      </ActionForm>
      {rows.length ? (
        <ol className="space-y-4 border-l border-graphite/10 pl-4">
          {rows.map(({ n, who }) => (
            <li key={n.id}>
              <p className="text-xs font-semibold text-graphite/45">
                {when(n.createdAt)} · {who ?? "—"}
              </p>
              <p className="mt-1 whitespace-pre-line text-[15px]">{n.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-graphite/50">Brak notatek.</p>
      )}
    </section>
  );
}
