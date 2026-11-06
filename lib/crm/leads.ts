import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { matchNewLeads } from "./matches";
import { parseNbotEmail } from "./nbot";
import { notify } from "./push";
import { audit, leads } from "./schema";

// Zapis zgłoszeń do CRM: z maili nbot i z formularza na stronie.

// Maile przychodzące automatem trafiają do poczekalni „Do przejrzenia”. To, co wkleja się ręcznie w CRM
// (wybrana oferta z nbota: link, tekst albo cały mail), idzie od razu do „Do kontaktu”.
export async function ingestNbot(mail: { subject?: string; text?: string; html?: string; from?: string }, userId?: number) {
  const manual = userId !== undefined;
  const status = manual ? "nowy" : "do_przejrzenia";
  const parsed = parseNbotEmail(mail);
  const d = await db();
  let added = 0;
  let repeated = 0;
  // nowe i powtórzone ogłoszenia (np. po obniżce ceny) sprawdzamy z poszukiwaniami klientów
  const ids: number[] = [];
  for (const p of parsed) {
    const values = { ...p, source: "nbot", status, message: mail.subject ?? null };
    if (!p.urlKey) {
      const [row] = await d.insert(leads).values(values).returning({ id: leads.id });
      ids.push(row.id);
      added++;
      continue;
    }
    // to samo ogłoszenie przyszło ponownie (np. po obniżce ceny): liczymy powtórkę i odświeżamy cenę
    const [row] = await d
      .insert(leads)
      .values(values)
      .onConflictDoUpdate({
        target: leads.urlKey,
        set: {
          seenCount: sql`${leads.seenCount} + 1`,
          price: sql`coalesce(excluded.price, ${leads.price})`,
          // ręcznie wklejone ogłoszenie, które czekało w poczekalni albo było pominięte, wraca do „Do kontaktu”
          ...(manual ? { status: sql`case when ${leads.status} in ('do_przejrzenia', 'pominiety') then 'nowy' else ${leads.status} end` } : {}),
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: leads.id, seen: leads.seenCount });
    ids.push(row.id);
    if (row.seen > 1) repeated++;
    else added++;
  }
  await d.insert(audit).values({ action: "lead_import", userId: userId ?? null, subject: mail.subject?.slice(0, 200), meta: { added, repeated, from: mail.from ?? null } });
  // powiadomienie tylko o nowych ogłoszeniach z automatu; ręcznie wklejone dodaje się samemu
  if (!manual && added > 0) {
    await notify({
      title: "Z nbota do przejrzenia",
      body: added === 1 ? parsed.find((p) => p.title)?.title ?? "Nowe ogłoszenie" : `Nowe ogłoszenia: ${added}`,
      url: "/crm/leady?widok=przeglad",
      tag: "elstate-nbot",
    });
  }
  const matched = await matchNewLeads(ids);
  return { added, repeated, total: parsed.length, matched };
}

export async function ingestContactForm(f: { name: string; reach: string; subject?: string; message: string }) {
  const d = await db();
  const email = /@/.test(f.reach) ? f.reach.trim() : null;
  const phone = email ? null : f.reach.trim();
  await d.insert(leads).values({
    source: "strona",
    status: "nowy",
    title: f.subject?.slice(0, 200) || "Wiadomość ze strony",
    contactName: f.name.slice(0, 200),
    email,
    phone,
    message: f.message.slice(0, 5000),
  });
  await notify({ title: `Wiadomość ze strony: ${f.name.slice(0, 60)}`, body: (f.subject ? `${f.subject}: ` : "") + f.message.slice(0, 140), url: "/crm/leady" });
}
