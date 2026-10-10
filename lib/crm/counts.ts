import "server-only";
import { and, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { db } from "./db";
import { INBOX } from "./labels";
import { leads } from "./schema";

// Liczba zgłoszeń czekających na kontakt: nowe, „oddzwonić” i te z terminem kontaktu na dziś lub wcześniej
export async function inboxCount() {
  const d = await db();
  const [r] = await d
    .select({ n: sql<number>`count(*)::int`, latest: sql<number>`coalesce(max(${leads.id}), 0)::int` })
    .from(leads)
    .where(or(inArray(leads.status, INBOX), and(isNotNull(leads.nextContactAt), lte(leads.nextContactAt, sql`now()`), inArray(leads.status, ["w_kontakcie", "umowione"]))));
  return { count: r?.n ?? 0, latest: r?.latest ?? 0 };
}
