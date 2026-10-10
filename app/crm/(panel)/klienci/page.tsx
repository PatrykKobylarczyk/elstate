import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Badge, Empty, PageHead, input } from "@/components/crm/ui";
import { requireUser } from "@/lib/crm/auth";
import { db } from "@/lib/crm/db";
import { clientKinds, label } from "@/lib/crm/labels";
import { clients, listings } from "@/lib/crm/schema";

export const metadata: Metadata = { title: "Klienci" };

export default async function Klienci({ searchParams }: { searchParams: Promise<{ q?: string; rodzaj?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const d = await db();
  const where: (SQL | undefined)[] = [];
  if (sp.rodzaj) where.push(eq(clients.kind, sp.rodzaj));
  if (sp.q) {
    const q = `%${sp.q.trim()}%`;
    where.push(or(ilike(clients.name, q), ilike(clients.phone, q), ilike(clients.email, q), ilike(clients.notes, q)));
  }
  const rows = await d
    .select({ c: clients, offers: sql<number>`(select count(*) from ${listings} where ${listings.ownerId} = ${clients.id})::int` })
    .from(clients)
    .where(and(...where))
    .orderBy(desc(clients.updatedAt))
    .limit(300);
  return (
    <>
      <PageHead title="Klienci" sub="Sprzedający, kupujący, wynajmujący i najemcy.">
        <Link href="/crm/klienci/nowy" className="inline-flex rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-pearl hover:bg-plum-700">+ Nowy klient</Link>
      </PageHead>
      <form className="mb-6 grid max-w-3xl gap-2 sm:grid-cols-[1fr_14rem_auto]">
        <input name="q" defaultValue={sp.q} placeholder="Szukaj: nazwisko, telefon, e-mail…" className={input} />
        <select name="rodzaj" defaultValue={sp.rodzaj ?? ""} className={input}>
          <option value="">Wszyscy</option>
          {clientKinds.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold hover:text-plum-900">Filtruj</button>
      </form>
      {rows.length ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {rows.map(({ c, offers }) => (
            <li key={c.id}>
              <Link href={`/crm/klienci/${c.id}`} className="flex items-center gap-3 rounded-2xl border border-graphite/10 bg-white p-4 hover:border-plum-700/40">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mist font-semibold text-plum-900">{c.name.slice(0, 1)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.name}</span>
                  <span className="block truncate text-sm text-graphite/55">{[c.phone, c.email].filter(Boolean).join(" · ") || "brak kontaktu"}</span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <Badge>{label(clientKinds, c.kind)}</Badge>
                  {offers > 0 && <span className="text-xs text-graphite/45">ofert: {offers}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Brak klientów. Dodasz ich tutaj albo jednym kliknięciem z karty zgłoszenia.</Empty>
      )}
    </>
  );
}
