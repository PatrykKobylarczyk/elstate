import "server-only";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { categoriesCrm, deals, label } from "./labels";
import { mailReady, sendMail } from "./mail";
import { describe, matchLead } from "./match";
import { notify } from "./push";
import { clientSearches, clients, leads, searchMatches, users, type ClientSearch, type LeadRow } from "./schema";

// Nowe ogłoszenia z nbota → poszukiwania klientów → powiadomienie agenta.
// Wywoływane po każdym imporcie z nbota (automat z Gmaila i ręczne wklejenie). Nigdy nie rzuca błędem,
// żeby problem z dopasowaniem nie zablokował zapisu ogłoszeń.

const pricePl = (n: number | null) => (n ? `${n.toLocaleString("pl-PL")} zł` : null);
const leadLine = (l: LeadRow) => [l.location, pricePl(l.price), l.area ? `${l.area.toLocaleString("pl-PL")} m²` : null, l.rooms ? `${l.rooms} pok.` : null].filter(Boolean).join(" · ");
export const searchLabel = (s: ClientSearch) => describe(s, { deal: s.deal ? label(deals, s.deal) : undefined, category: s.category ? label(categoriesCrm, s.category) : undefined });

export async function matchNewLeads(leadIds: number[]) {
  if (!leadIds.length) return 0;
  try {
    const d = await db();
    const [ls, searches] = await Promise.all([
      d.select().from(leads).where(inArray(leads.id, leadIds)),
      d.select({ s: clientSearches, client: clients.name }).from(clientSearches).innerJoin(clients, eq(clients.id, clientSearches.clientId)).where(eq(clientSearches.active, true)),
    ]);
    // ogłoszenia pominięte w poczekalni nie wracają jako dopasowania
    const pool = ls.filter((l) => l.status !== "pominiety");
    const hits: { s: ClientSearch; client: string; lead: LeadRow }[] = [];
    for (const { s, client } of searches) for (const lead of pool) if (matchLead(s, lead).ok) hits.push({ s, client, lead });
    if (!hits.length) return 0;

    // zapis; para (poszukiwanie, ogłoszenie) już znana nie powiadamia drugi raz
    const fresh: typeof hits = [];
    for (const h of hits) {
      const [row] = await d.insert(searchMatches).values({ searchId: h.s.id, clientId: h.s.clientId, leadId: h.lead.id }).onConflictDoNothing().returning({ id: searchMatches.id });
      if (row) fresh.push(h);
    }
    if (!fresh.length) return 0;
    await sendAlerts(fresh);
    return fresh.length;
  } catch (e) {
    console.error("[dopasowania]", (e as Error).message);
    return 0;
  }
}

async function sendAlerts(hits: { s: ClientSearch; client: string; lead: LeadRow }[]) {
  // jedno powiadomienie na klienta, nawet gdy w mailu z nbota było kilka pasujących ogłoszeń
  const byClient = new Map<number, typeof hits>();
  for (const h of hits) byClient.set(h.s.clientId, [...(byClient.get(h.s.clientId) ?? []), h]);
  const d = await db();
  const team = await d.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.active, true));

  for (const [clientId, list] of byClient) {
    const leadsFor = [...new Map(list.map((h) => [h.lead.id, h.lead])).values()];
    const first = leadsFor[0];
    const msg = {
      title: `Pasuje do klienta: ${list[0].client}`.slice(0, 120),
      body: leadsFor.length === 1 ? [first.title, leadLine(first)].filter(Boolean).join("\n").slice(0, 200) : `Nowe pasujące ogłoszenia: ${leadsFor.length}`,
      url: leadsFor.length === 1 ? `/crm/leady/${first.id}` : `/crm/klienci/${clientId}`,
      tag: `elstate-match-${clientId}`,
    };
    // opiekun z poszukiwań; gdy któreś poszukiwanie nie ma opiekuna, dostaje cały zespół
    const agents = [...new Set(list.map((h) => h.s.agentId))];
    if (agents.includes(null)) await notify(msg);
    else for (const a of agents) await notify(msg, a!);

    if (list.some((h) => h.s.notifyEmail) && mailReady()) {
      const to = agents.includes(null) ? team : team.filter((u) => agents.includes(u.id));
      const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://elstate.pl";
      const mail = matchMail(list[0].client, clientId, leadsFor, base);
      for (const u of to) {
        try {
          await sendMail(u.email, mail.subject, mail.text, mail.html);
        } catch (e) {
          console.error("[dopasowania] mail", (e as Error).message);
        }
      }
    }
  }
}

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

function matchMail(client: string, clientId: number, ls: LeadRow[], base: string) {
  const subject = ls.length === 1 ? `Pasuje do: ${client} · ${ls[0].title ?? "nowe ogłoszenie"}` : `Pasuje do: ${client} · ${ls.length} nowe ogłoszenia`;
  const text = `Nowe ogłoszenia z nbota pasują do poszukiwań klienta ${client}:\n\n${ls
    .map((l) => `• ${l.title ?? "Ogłoszenie"}${leadLine(l) ? ` (${leadLine(l)})` : ""}\n  ${l.url ?? `${base}/crm/leady/${l.id}`}`)
    .join("\n\n")}\n\nKarta klienta: ${base}/crm/klienci/${clientId}`;
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;background:#F9F5EF;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:20px;padding:32px;color:#2A2A2D">
    <p style="margin:0 0 24px;font-size:22px;font-weight:600;color:#C19A5B">elstate<span style="color:#320920">.</span></p>
    <p style="margin:0 0 20px">Nowe ogłoszenia pasują do poszukiwań klienta <b>${esc(client)}</b>:</p>
    ${ls
      .map(
        (l) => `<div style="border-top:1px solid #eee;padding:14px 0">
      <a href="${esc(`${base}/crm/leady/${l.id}`)}" style="color:#320920;font-weight:600;text-decoration:none">${esc(l.title ?? "Ogłoszenie")}</a>
      <div style="font-size:14px;color:#777;margin-top:4px">${esc([l.portal, leadLine(l)].filter(Boolean).join(" · "))}</div>
    </div>`,
      )
      .join("")}
    <p style="margin:20px 0 0"><a href="${esc(`${base}/crm/klienci/${clientId}`)}" style="color:#320920">Karta klienta w CRM →</a></p>
  </div></div>`;
  return { subject: subject.slice(0, 200), text, html };
}

// Po zapisaniu kryteriów: dopasuj ogłoszenia z ostatnich dni, bez powiadomień (agent i tak patrzy na kartę klienta)
export async function backfillSearch(searchId: number, days = 30) {
  const d = await db();
  const [s] = await d.select().from(clientSearches).where(eq(clientSearches.id, searchId));
  if (!s || !s.active) return 0;
  const recent = await d
    .select()
    .from(leads)
    .where(and(eq(leads.source, "nbot"), gte(leads.createdAt, sql`now() - make_interval(days => ${days})`), sql`${leads.status} <> 'pominiety'`))
    .orderBy(desc(leads.createdAt))
    .limit(2000);
  const hits = recent.filter((l) => matchLead(s, l).ok);
  if (!hits.length) return 0;
  const rows = await d
    .insert(searchMatches)
    .values(hits.map((l) => ({ searchId: s.id, clientId: s.clientId, leadId: l.id, backfill: true, seenAt: new Date() })))
    .onConflictDoNothing()
    .returning({ id: searchMatches.id });
  return rows.length;
}

// Po zmianie kryteriów usuwamy dopasowania, które już nie pasują (tylko te jeszcze nieobejrzane i z przeszłości)
export async function pruneSearch(searchId: number) {
  const d = await db();
  const [s] = await d.select().from(clientSearches).where(eq(clientSearches.id, searchId));
  if (!s) return;
  const rows = await d.select({ m: searchMatches, l: leads }).from(searchMatches).innerJoin(leads, eq(leads.id, searchMatches.leadId)).where(eq(searchMatches.searchId, searchId));
  const gone = rows.filter(({ l }) => !matchLead(s, l).ok).map(({ m }) => m.id);
  if (gone.length) await d.delete(searchMatches).where(inArray(searchMatches.id, gone));
}
