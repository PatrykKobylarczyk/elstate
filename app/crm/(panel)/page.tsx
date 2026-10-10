import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { Badge, card, Empty, PageHead, ago, leadTone, pln, when } from "@/components/crm/ui";
import { requireUser } from "@/lib/crm/auth";
import { db } from "@/lib/crm/db";
import { INBOX, label, leadSources, leadStatuses } from "@/lib/crm/labels";
import { leads, listings } from "@/lib/crm/schema";

export const metadata: Metadata = { title: "Pulpit" };

export default async function Pulpit() {
  const user = await requireUser();
  const d = await db();
  const endOfDay = sql`date_trunc('day', now() at time zone 'Europe/Warsaw') at time zone 'Europe/Warsaw' + interval '1 day'`;
  const [inbox, today, fresh, [stats]] = await Promise.all([
    d.select().from(leads).where(inArray(leads.status, INBOX)).orderBy(desc(leads.createdAt)).limit(8),
    d
      .select()
      .from(leads)
      .where(and(isNotNull(leads.nextContactAt), lte(leads.nextContactAt, endOfDay), inArray(leads.status, ["do_kontaktu", "w_kontakcie", "umowione"])))
      .orderBy(asc(leads.nextContactAt))
      .limit(10),
    d.select({ n: sql<number>`count(*)::int` }).from(leads).where(gte(leads.createdAt, sql`now() - interval '7 days'`)),
    d
      .select({
        active: sql<number>`count(*) filter (where ${listings.status} in ('aktywna','rezerwacja'))::int`,
        drafts: sql<number>`count(*) filter (where ${listings.status} = 'szkic')::int`,
        sold: sql<number>`count(*) filter (where ${listings.status} = 'sprzedana')::int`,
      })
      .from(listings),
  ]);
  const [inboxTotal] = await d.select({ n: sql<number>`count(*)::int` }).from(leads).where(inArray(leads.status, INBOX));
  const hour = Number(new Intl.DateTimeFormat("pl-PL", { hour: "numeric", timeZone: "Europe/Warsaw" }).format(new Date()));
  const hello = hour < 12 ? "Dzień dobry" : hour < 18 ? "Cześć" : "Dobry wieczór";

  const tiles = [
    { n: inboxTotal.n, l: "do kontaktu", href: "/crm/leady", hot: inboxTotal.n > 0 },
    { n: today.length, l: "kontaktów na dziś", href: "/crm/leady?widok=terminy" },
    { n: stats.active, l: "ofert na stronie", href: "/crm/oferty?status=aktywna" },
    { n: fresh[0].n, l: "zgłoszeń w 7 dni", href: "/crm/leady?widok=wszystkie" },
  ];

  return (
    <>
      <PageHead title={`${hello}, ${user.name.split(" ")[0]}`} sub={new Date().toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Warsaw" })}>
        <Link href="/crm/oferty/nowa" className="inline-flex rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-pearl hover:bg-plum-700">+ Nowa oferta</Link>
      </PageHead>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.l} href={t.href} className={`rounded-2xl p-5 transition hover:-translate-y-0.5 ${t.hot ? "bg-plum-900 text-pearl" : "border border-graphite/10 bg-white"}`}>
            <p className={`font-display text-4xl tabular-nums ${t.hot ? "text-gold-500" : "text-plum-900"}`}>{t.n}</p>
            <p className={`mt-1 text-sm font-semibold ${t.hot ? "text-pearl/75" : "text-graphite/55"}`}>{t.l}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className={card}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl text-plum-900">Do kontaktu</h2>
            <Link href="/crm/leady" className="text-sm font-semibold text-plum-900 hover:underline">Wszystkie →</Link>
          </div>
          {inbox.length ? (
            <ul className="divide-y divide-graphite/8">
              {inbox.map((l) => (
                <li key={l.id}>
                  <Link href={`/crm/leady/${l.id}`} className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-3 hover:bg-pearl">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${l.status === "nowy" ? "bg-plum-900" : "bg-gold-500"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{l.title || l.contactName || "Zgłoszenie"}</span>
                      <span className="block truncate text-sm text-graphite/55">
                        {[label(leadSources, l.source), l.location, l.price ? pln(l.price) : null, l.area ? `${l.area.toLocaleString("pl-PL")} m²` : null].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-graphite/45">{ago(l.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Wszystko obdzwonione. Nowe ogłoszenia z nbot i wiadomości ze strony pojawią się tutaj.</Empty>
          )}
        </section>

        <section className={card}>
          <h2 className="mb-4 font-display text-xl text-plum-900">Kontakty na dziś</h2>
          {today.length ? (
            <ul className="divide-y divide-graphite/8">
              {today.map((l) => (
                <li key={l.id}>
                  <Link href={`/crm/leady/${l.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-pearl">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{l.contactName || l.title}</span>
                      <span className="block text-sm text-graphite/55">{when(l.nextContactAt)}</span>
                    </span>
                    <Badge tone={leadTone[l.status]}>{label(leadStatuses, l.status)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Brak zaplanowanych kontaktów. Termin ustawisz w karcie zgłoszenia.</Empty>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <Link href="/crm/oferty?status=szkic" className="rounded-xl bg-pearl p-3 hover:bg-mist">
              <span className="font-display text-2xl text-plum-900">{stats.drafts}</span>
              <span className="block text-graphite/55">szkiców ofert</span>
            </Link>
            <Link href="/crm/oferty?status=sprzedana" className="rounded-xl bg-pearl p-3 hover:bg-mist">
              <span className="font-display text-2xl text-plum-900">{stats.sold}</span>
              <span className="block text-graphite/55">sprzedanych</span>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
