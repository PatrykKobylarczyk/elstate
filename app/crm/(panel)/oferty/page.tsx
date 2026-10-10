import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Badge, Empty, PageHead, btnGhost, input, listingTone, pln } from "@/components/crm/ui";
import { requireUser } from "@/lib/crm/auth";
import { db } from "@/lib/crm/db";
import { categoriesCrm, deals, label, listingStatuses } from "@/lib/crm/labels";
import { listings, users } from "@/lib/crm/schema";
import { importStarterListings, quickListingStatus } from "../actions";

export const metadata: Metadata = { title: "Oferty" };

export default async function Oferty({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const d = await db();
  const where: (SQL | undefined)[] = [];
  if (sp.status) where.push(eq(listings.status, sp.status));
  if (sp.q) {
    const q = `%${sp.q.trim()}%`;
    where.push(or(ilike(listings.title, q), ilike(listings.district, q), ilike(listings.street, q), ilike(listings.city, q)));
  }
  const [rows, counts] = await Promise.all([
    d
      .select({ l: listings, agent: users.name })
      .from(listings)
      .leftJoin(users, eq(users.id, listings.agentId))
      .where(and(...where))
      .orderBy(asc(listings.sortOrder), desc(listings.updatedAt)),
    d.select({ status: listings.status, n: sql<number>`count(*)::int` }).from(listings).groupBy(listings.status),
  ]);
  const total = counts.reduce((a, c) => a + c.n, 0);
  const tabs = [["", `Wszystkie (${total})`], ...listingStatuses.map(([k, v]) => [k, `${v.replace(/ \(.*\)/, "")} (${counts.find((c) => c.status === k)?.n ?? 0})`])];

  return (
    <>
      <PageHead title="Oferty" sub="Oferty ze statusem „Aktywna” i „Rezerwacja” są na stronie elstate.pl.">
        <Link href="/crm/oferty/nowa" className="inline-flex rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-pearl hover:bg-plum-700">+ Nowa oferta</Link>
      </PageHead>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([k, v]) => (
          <Link key={k} href={k ? `/crm/oferty?status=${k}` : "/crm/oferty"} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${(sp.status ?? "") === k ? "bg-plum-900 text-pearl" : "bg-white text-graphite/70 hover:text-plum-900"}`}>
            {v}
          </Link>
        ))}
      </div>
      <form className="mb-6 grid max-w-xl gap-2 sm:grid-cols-[1fr_auto]">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <input name="q" defaultValue={sp.q} placeholder="Szukaj: tytuł, dzielnica, ulica…" className={input} />
        <button className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold hover:text-plum-900">Szukaj</button>
      </form>

      {total === 0 && (
        <div className="mb-6 rounded-2xl bg-plum-900 p-6 text-pearl">
          <p className="font-display text-xl">Na stronie są teraz oferty startowe</p>
          <p className="mt-1 text-sm text-pearl/70">Przenieś je do CRM jednym kliknięciem, a potem edytuj, dodawaj zdjęcia i zmieniaj statusy tutaj.</p>
          <form action={importStarterListings} className="mt-4">
            <button className="rounded-full bg-gold-500 px-5 py-2.5 text-sm font-semibold text-plum-950">Przenieś oferty ze strony do CRM</button>
          </form>
        </div>
      )}

      {rows.length ? (
        <ul className="grid gap-3">
          {rows.map(({ l, agent }) => (
            <li key={l.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-graphite/10 bg-white p-3 pr-4">
              <Link href={`/crm/oferty/${l.id}`} className="flex min-w-0 flex-1 basis-80 items-center gap-4">
                <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-mist">
                  {l.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold hover:text-plum-900">{l.title}</span>
                    {l.featured && <Badge tone="gold">wyróżniona</Badge>}
                  </span>
                  <span className="block truncate text-sm text-graphite/55">
                    {[label(deals, l.deal), label(categoriesCrm, l.category), [l.district, l.city].filter(Boolean).join(", "), `${l.area.toLocaleString("pl-PL")} m²`, pln(l.price), `${l.images.length} zdj.`].join(" · ")}
                  </span>
                </span>
              </Link>
              {agent && <span className="text-xs text-graphite/45">{agent.split(" ")[0]}</span>}
              <form action={quickListingStatus} className="flex items-center gap-2">
                <input type="hidden" name="id" value={l.id} />
                <Badge tone={listingTone[l.status]}>{label(listingStatuses, l.status).replace(/ \(.*\)/, "")}</Badge>
                {l.status === "szkic" && <button name="status" value="aktywna" className={btnGhost}>Opublikuj</button>}
                {l.status === "aktywna" && <button name="status" value="rezerwacja" className={btnGhost}>Rezerwacja</button>}
                {(l.status === "aktywna" || l.status === "rezerwacja") && <button name="status" value="sprzedana" className={btnGhost}>Sprzedana</button>}
              </form>
            </li>
          ))}
        </ul>
      ) : total > 0 ? (
        <Empty>Brak ofert w tym widoku.</Empty>
      ) : null}
    </>
  );
}
