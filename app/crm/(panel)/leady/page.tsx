import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, ilike, inArray, isNotNull, or, type SQL } from "drizzle-orm";
import { Badge, Empty, PageHead, ago, input, leadTone, pln, when } from "@/components/crm/ui";
import { requireUser } from "@/lib/crm/auth";
import { db } from "@/lib/crm/db";
import { INBOX, label, leadSources, leadStatuses } from "@/lib/crm/labels";
import { leads, users } from "@/lib/crm/schema";
import { quickLeadStatus } from "../actions";

export const metadata: Metadata = { title: "Do kontaktu" };

const views = [
  ["", "Do kontaktu"],
  ["terminy", "Zaplanowane"],
  ["w-toku", "W toku"],
  ["pozyskane", "Pozyskane"],
  ["odrzucone", "Odrzucone"],
  ["wszystkie", "Wszystkie"],
] as const;

export default async function Leady({ searchParams }: { searchParams: Promise<{ widok?: string; q?: string; zrodlo?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const view = sp.widok ?? "";
  const d = await db();
  const where: (SQL | undefined)[] = [];
  if (view === "") where.push(inArray(leads.status, INBOX));
  if (view === "terminy") where.push(isNotNull(leads.nextContactAt), inArray(leads.status, ["do_kontaktu", "w_kontakcie", "umowione"]));
  if (view === "w-toku") where.push(inArray(leads.status, ["w_kontakcie", "umowione"]));
  if (view === "pozyskane") where.push(eq(leads.status, "pozyskany"));
  if (view === "odrzucone") where.push(eq(leads.status, "odrzucony"));
  if (sp.zrodlo) where.push(eq(leads.source, sp.zrodlo));
  if (sp.q) {
    const q = `%${sp.q.trim()}%`;
    where.push(or(ilike(leads.title, q), ilike(leads.contactName, q), ilike(leads.phone, q), ilike(leads.email, q), ilike(leads.location, q), ilike(leads.url, q)));
  }
  const rows = await d
    .select({ l: leads, who: users.name })
    .from(leads)
    .leftJoin(users, eq(users.id, leads.assignedTo))
    .where(and(...where))
    .orderBy(view === "terminy" ? asc(leads.nextContactAt) : desc(leads.createdAt))
    .limit(200);

  const href = (p: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ widok: view, q: sp.q, zrodlo: sp.zrodlo, ...p }).filter((e): e is [string, string] => Boolean(e[1])));
    return `/crm/leady${q.size ? `?${q}` : ""}`;
  };

  return (
    <>
      <PageHead title="Zgłoszenia" sub="Nowe ogłoszenia z nbot, wiadomości ze strony i kontakty dodane ręcznie.">
        <Link href="/crm/ustawienia#nbot" className="inline-flex rounded-full border border-graphite/15 bg-white px-4 py-2 text-sm font-semibold hover:border-plum-700">Wklej mail z nbot</Link>
        <Link href="/crm/leady/nowy" className="inline-flex rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-pearl hover:bg-plum-700">+ Dodaj</Link>
      </PageHead>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {views.map(([k, v]) => (
          <Link key={k} href={href({ widok: k || undefined })} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${view === k ? "bg-plum-900 text-pearl" : "bg-white text-graphite/70 hover:text-plum-900"}`}>
            {v}
          </Link>
        ))}
      </div>
      <form className="mb-6 grid max-w-3xl gap-2 sm:grid-cols-[1fr_14rem_auto]">
        {view && <input type="hidden" name="widok" value={view} />}
        <input name="q" defaultValue={sp.q} placeholder="Szukaj: tytuł, telefon, ulica…" className={input} />
        <select name="zrodlo" defaultValue={sp.zrodlo ?? ""} className={input}>
          <option value="">Każde źródło</option>
          {leadSources.map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold hover:text-plum-900">Filtruj</button>
      </form>

      {rows.length ? (
        <ul className="grid gap-2">
          {rows.map(({ l, who }) => (
            <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-graphite/10 bg-white p-4">
              <Link href={`/crm/leady/${l.id}`} className="min-w-0 flex-1 basis-72">
                <span className="flex items-center gap-2">
                  {l.status === "nowy" && <span className="h-2 w-2 shrink-0 rounded-full bg-plum-900" />}
                  <span className="truncate font-semibold hover:text-plum-900">{l.title || l.contactName || "Zgłoszenie"}</span>
                  {l.seenCount > 1 && <Badge tone="gold">powtórka ×{l.seenCount}</Badge>}
                </span>
                <span className="mt-0.5 block truncate text-sm text-graphite/55">
                  {[l.portal ?? label(leadSources, l.source), l.location, l.price ? pln(l.price) : null, l.area ? `${l.area.toLocaleString("pl-PL")} m²` : null, l.rooms ? `${l.rooms} pok.` : null, l.phone].filter(Boolean).join(" · ")}
                </span>
              </Link>
              <span className="text-xs text-graphite/45">
                {view === "terminy" && l.nextContactAt ? `kontakt: ${when(l.nextContactAt)}` : ago(l.createdAt)}
                {who && ` · ${who.split(" ")[0]}`}
              </span>
              <Badge tone={leadTone[l.status]}>{label(leadStatuses, l.status)}</Badge>
              <div className="flex gap-1.5">
                {l.url && (
                  <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full border border-graphite/15 px-3 py-1.5 text-xs font-semibold hover:border-plum-700">Ogłoszenie ↗</a>
                )}
                {INBOX.includes(l.status) && (
                  <>
                    <form action={quickLeadStatus}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="status" value="w_kontakcie" />
                      <button className="rounded-full bg-plum-900 px-3 py-1.5 text-xs font-semibold text-pearl hover:bg-plum-700">Biorę</button>
                    </form>
                    <form action={quickLeadStatus}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="status" value="odrzucony" />
                      <button className="rounded-full border border-graphite/15 px-3 py-1.5 text-xs font-semibold text-graphite/60 hover:text-red-800">Odrzuć</button>
                    </form>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>{view === "" ? "Nic nie czeka na kontakt." : "Brak zgłoszeń w tym widoku."}</Empty>
      )}
    </>
  );
}
