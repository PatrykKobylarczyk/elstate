import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import ClientForm from "@/components/crm/ClientForm";
import Notes from "@/components/crm/Notes";
import { ConfirmButton } from "@/components/crm/forms";
import { Badge, PageHead, btnDanger, btnGhost, card, leadTone, listingTone, pln } from "@/components/crm/ui";
import { requireUser } from "@/lib/crm/auth";
import { db } from "@/lib/crm/db";
import { label, leadStatuses, listingStatuses } from "@/lib/crm/labels";
import { clients, leads, listings } from "@/lib/crm/schema";
import { deleteClient } from "../../actions";

export const metadata: Metadata = { title: "Klient" };

export default async function Klient({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const d = await db();
  const [c] = await d.select().from(clients).where(eq(clients.id, id));
  if (!c) notFound();
  const [own, ls] = await Promise.all([
    d.select().from(listings).where(eq(listings.ownerId, id)).orderBy(desc(listings.updatedAt)),
    d.select().from(leads).where(eq(leads.clientId, id)).orderBy(desc(leads.createdAt)),
  ]);
  return (
    <>
      <Link href="/crm/klienci" className="text-sm font-semibold text-graphite/55 hover:text-plum-900">← Klienci</Link>
      <PageHead title={c.name}>
        {c.phone && <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="inline-flex rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-pearl hover:bg-plum-700">Zadzwoń {c.phone}</a>}
        {c.email && <a href={`mailto:${c.email}`} className={btnGhost}>Napisz</a>}
      </PageHead>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="grid content-start gap-6">
          <ClientForm c={c} />
          <section className={card}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl text-plum-900">Oferty klienta</h2>
              <Link href="/crm/oferty/nowa" className="text-sm font-semibold text-plum-900 hover:underline">+ Nowa</Link>
            </div>
            {own.length ? (
              <ul className="divide-y divide-graphite/8">
                {own.map((l) => (
                  <li key={l.id}>
                    <Link href={`/crm/oferty/${l.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-plum-900">
                      <span className="truncate font-semibold">{l.title}</span>
                      <span className="flex items-center gap-2 text-sm text-graphite/55">
                        {pln(l.price)} <Badge tone={listingTone[l.status]}>{label(listingStatuses, l.status).replace(/ \(.*\)/, "")}</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-graphite/50">Brak ofert. Właściciela przypiszesz w edycji oferty.</p>
            )}
          </section>
          {ls.length > 0 && (
            <section className={card}>
              <h2 className="mb-3 font-display text-xl text-plum-900">Zgłoszenia</h2>
              <ul className="divide-y divide-graphite/8">
                {ls.map((l) => (
                  <li key={l.id}>
                    <Link href={`/crm/leady/${l.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-plum-900">
                      <span className="truncate font-semibold">{l.title}</span>
                      <Badge tone={leadTone[l.status]}>{label(leadStatuses, l.status)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <div className="grid content-start gap-6">
          <Notes clientId={c.id} />
          <form action={deleteClient}>
            <input type="hidden" name="id" value={c.id} />
            <ConfirmButton className={btnDanger} message="Usunąć klienta i jego notatki? Oferty i zgłoszenia zostaną, bez przypisania.">Usuń klienta</ConfirmButton>
          </form>
        </div>
      </div>
    </>
  );
}
