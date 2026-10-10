import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { parseNbotEmail } from "./nbot";
import { audit, leads } from "./schema";

// Zapis zgłoszeń do CRM: z maili nbot i z formularza na stronie.

export async function ingestNbot(mail: { subject?: string; text?: string; html?: string; from?: string }, userId?: number) {
  const parsed = parseNbotEmail(mail);
  const d = await db();
  let added = 0;
  let repeated = 0;
  for (const p of parsed) {
    const values = { ...p, source: "nbot", status: "nowy", message: mail.subject ?? null };
    if (!p.urlKey) {
      await d.insert(leads).values(values);
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
          updatedAt: sql`now()`,
        },
      })
      .returning({ seen: leads.seenCount });
    if (row.seen > 1) repeated++;
    else added++;
  }
  await d.insert(audit).values({ action: "lead_import", userId: userId ?? null, subject: mail.subject?.slice(0, 200), meta: { added, repeated, from: mail.from ?? null } });
  return { added, repeated, total: parsed.length };
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
}
