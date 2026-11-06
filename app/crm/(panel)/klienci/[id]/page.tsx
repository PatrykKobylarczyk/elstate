import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import ClientForm from "@/components/crm/ClientForm";
import Notes from "@/components/crm/Notes";
import SearchForm from "@/components/crm/SearchForm";
import { ConfirmButton } from "@/components/crm/forms";
import { Badge, PageHead, ago, btnDanger, btnGhost, card, leadTone, listingTone, pln } from "@/components/crm/ui";
import { requireUser } from "@/lib/crm/auth";
import { db } from "@/lib/crm/db";
import { label, leadStatuses, listingStatuses } from "@/lib/crm/labels";
import { searchLabel } from "@/lib/crm/matches";
import { clientSearches, clients, leads, listings, searchMatches, users } from "@/lib/crm/schema";
import { deleteClient } from "../../actions";
import { deleteSearch, markMatchesSeen } from "../search-actions";

export const metadata: Metadata = { title: "Klient" };

export default async function Klient({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const d = await db();
  const [c] = await d.select().from(clients).where(eq(clients.id, id));
  if (!c) notFound();
  const [own, ls, searches, matched, team] = await Promise.all([
    d.select().from(listings).where(eq(listings.ownerId, id)).orderBy(desc(listings.updatedAt)),
    d.select().from(leads).where(eq(leads.clientId, id)).orderBy(desc(leads.createdAt)),
    d.select().from(clientSearches).where(eq(clientSearches.clientId, id)).orderBy(asc(clientSearches.createdAt)),
    d
      .select({ m: searchMatches, l: leads })
      .from(searchMatches)
      .innerJoin(leads, eq(leads.id, searchMatches.leadId))
      .where(and(eq(searchMatches.clientId, id)))
      .orderBy(desc(searchMatches.createdAt))
      .limit(40),
    d.select({ id: users.id, name: users.name }).from(users).where(eq(users.active, true)),
  ]);
  // to samo ogłoszenie może pasować do dwóch poszukiwań; pokazujemy je raz
  const matches = matched.filter((x, i, a) => a.findIndex((y) => y.l.id === x.l.id) === i);
  const unseen = matches.filter((x) => !x.m.seenAt).length;
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
          <section className={card} id="poszukiwania">
            <h2 className="font-display text-xl text-plum-900">Czego szuka</h2>
            <p className="mt-1 mb-4 text-sm text-graphite/55">Nowe ogłoszenia z nbota (Otodom, OLX i inne portale) sprawdzamy z tymi kryteriami. Pasujące przyjdą jako powiadomienie i pojawią się poniżej.</p>
            <div className="grid gap-3">
              {searches.map((s) => (
                <details key={s.id} className="group rounded-xl border border-graphite/10 px-4 py-3 open:pb-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <span className="min-w-0 text-sm font-semibold">{searchLabel(s) || "Kryteria"}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {!s.active && <Badge>wstrzymane</Badge>}
                      <span className="text-xs font-semibold text-plum-900 group-open:hidden">Zmień</span>
                    </span>
                  </summary>
                  <div className="mt-4">
                    <SearchForm clientId={c.id} s={s} team={team} />
                    <form action={deleteSearch} className="mt-3">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="clientId" value={c.id} />
                      <ConfirmButton className="text-sm font-semibold text-red-800 hover:underline" message="Usunąć te kryteria i ich dopasowania?">Usuń kryteria</ConfirmButton>
                    </form>
                  </div>
                </details>
              ))}
              <details open={searches.length === 0} className="rounded-xl border border-dashed border-graphite/20 px-4 py-3 open:pb-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-plum-900">+ {searches.length ? "Dodaj kolejne kryteria" : "Dodaj kryteria"}</summary>
                <div className="mt-4">
                  <SearchForm clientId={c.id} team={team} />
                </div>
              </details>
            </div>
          </section>
          {matches.length > 0 && (
            <section className={card}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-xl text-plum-900">Pasujące ogłoszenia</h2>
                {unseen > 0 && (
                  <form action={markMatchesSeen}>
                    <input type="hidden" name="clientId" value={c.id} />
                    <button className="text-sm font-semibold text-plum-900 hover:underline">Oznacz jako przejrzane</button>
                  </form>
                )}
              </div>
              <ul className="divide-y divide-graphite/8">
                {matches.map(({ m, l }) => (
                  <li key={m.id} className="flex items-start gap-3 py-2.5">
                    <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${m.seenAt ? "bg-transparent" : "bg-plum-900"}`} />
                    <Link href={`/crm/leady/${l.id}`} className="min-w-0 flex-1 hover:text-plum-900">
                      <span className="block truncate font-semibold">{l.title || "Ogłoszenie"}</span>
                      <span className="block truncate text-sm text-graphite/55">
                        {[l.portal, l.location, l.price ? pln(l.price) : null, l.area ? `${l.area.toLocaleString("pl-PL")} m²` : null, l.rooms ? `${l.rooms} pok.` : null].filter(Boolean).join(" · ")}
                      </span>
                    </Link>
                    <span className="flex shrink-0 flex-col items-end gap-1 text-xs text-graphite/45">
                      {ago(m.createdAt)}
                      {l.url && <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-plum-900 hover:underline">Ogłoszenie ↗</a>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
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
