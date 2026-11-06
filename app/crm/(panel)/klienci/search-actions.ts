"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { log, requireUser } from "@/lib/crm/auth";
import { db } from "@/lib/crm/db";
import { categoriesCrm, deals } from "@/lib/crm/labels";
import { splitList } from "@/lib/crm/match";
import { backfillSearch, pruneSearch } from "@/lib/crm/matches";
import { clientSearches, clients, searchMatches } from "@/lib/crm/schema";

// Poszukiwania klienta: czego szuka (lokalizacja, cena, metraż, pokoje, rodzaj).
// Osobny plik, żeby nie mieszać z akcjami ofert i leadów.

type State = { error?: string; ok?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string, round = true) => {
  let v = str(f, k).replace(/[\s zł]/g, "").replace(",", ".");
  if (!v) return null;
  // „600.000” to sześćset tysięcy, nie sześćset
  if (/^\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, "");
  // „600 tys.” albo „0,6 mln” też przejdą
  const m = v.match(/^([\d.]+)(tys\.?|k|mln|m)?$/i);
  if (!m) return null;
  let n = Number(m[1]);
  if (/^(tys|k)/i.test(m[2] ?? "")) n *= 1000;
  if (/^m/i.test(m[2] ?? "") && m[2]!.toLowerCase() !== "m") n *= 1000000;
  if (!Number.isFinite(n) || n < 0) return null;
  return round ? Math.round(n) : Math.round(n * 10) / 10;
};
const idOf = (f: FormData, k = "id") => {
  const n = Number(f.get(k));
  return Number.isInteger(n) && n > 0 ? n : null;
};
const pick = (list: readonly (readonly [string, string])[], v: string) => (list.some(([k]) => k === v) ? v : null);

export async function saveSearch(_: State, f: FormData): Promise<State> {
  const user = await requireUser();
  const clientId = idOf(f, "clientId");
  if (!clientId) return { error: "Brak klienta." };
  const values = {
    clientId,
    active: f.get("active") !== null,
    deal: pick(deals, str(f, "deal")),
    category: pick(categoriesCrm, str(f, "category")),
    locations: splitList(str(f, "locations")),
    priceMin: num(f, "priceMin"),
    priceMax: num(f, "priceMax"),
    areaMin: num(f, "areaMin", false),
    areaMax: num(f, "areaMax", false),
    roomsMin: num(f, "roomsMin"),
    roomsMax: num(f, "roomsMax"),
    exclude: splitList(str(f, "exclude")),
    agentId: idOf(f, "agentId"),
    notifyEmail: f.get("notifyEmail") !== null,
    updatedAt: new Date(),
  };
  const empty = !values.locations.length && values.priceMax == null && values.priceMin == null && values.areaMin == null && values.areaMax == null && values.roomsMin == null && !values.category;
  if (empty) return { error: "Podaj przynajmniej lokalizację, cenę, metraż, pokoje albo rodzaj. Inaczej pasowałoby każde ogłoszenie." };
  for (const [a, b, what] of [[values.priceMin, values.priceMax, "Cena"], [values.areaMin, values.areaMax, "Metraż"], [values.roomsMin, values.roomsMax, "Pokoje"]] as const) {
    if (a != null && b != null && a > b) return { error: `${what}: „od” jest większe niż „do”.` };
  }
  const d = await db();
  const id = idOf(f);
  let searchId: number;
  if (id) {
    const [row] = await d.update(clientSearches).set(values).where(and(eq(clientSearches.id, id), eq(clientSearches.clientId, clientId))).returning({ id: clientSearches.id });
    if (!row) return { error: "Nie ma takich poszukiwań." };
    searchId = row.id;
    await pruneSearch(searchId);
  } else {
    const [row] = await d.insert(clientSearches).values(values).returning({ id: clientSearches.id });
    searchId = row.id;
    // kupujący od razu, gdy ma poszukiwania (jeśli był oznaczony jako „inny”)
    await d.update(clients).set({ kind: "kupujacy" }).where(and(eq(clients.id, clientId), eq(clients.kind, "inny")));
  }
  const found = await backfillSearch(searchId);
  await log("search_saved", { userId: user.id, subject: String(clientId), meta: { searchId, created: !id } });
  revalidatePath(`/crm/klienci/${clientId}`);
  revalidatePath("/crm");
  return { ok: `Zapisano. Nowe ogłoszenia z nbota będą sprawdzane z tymi kryteriami.${found ? ` Z ostatnich 30 dni pasuje: ${found}.` : ""}` };
}

export async function deleteSearch(f: FormData) {
  const user = await requireUser();
  const id = idOf(f);
  const clientId = idOf(f, "clientId");
  if (!id || !clientId) return;
  const d = await db();
  await d.delete(clientSearches).where(and(eq(clientSearches.id, id), eq(clientSearches.clientId, clientId)));
  await log("search_saved", { userId: user.id, subject: String(clientId), meta: { searchId: id, deleted: true } });
  revalidatePath(`/crm/klienci/${clientId}`);
  revalidatePath("/crm");
}

// „Przejrzane”: znika z pulpitu, zostaje na karcie klienta
export async function markMatchesSeen(f: FormData) {
  await requireUser();
  const clientId = idOf(f, "clientId");
  if (!clientId) return;
  const d = await db();
  await d.update(searchMatches).set({ seenAt: new Date() }).where(and(eq(searchMatches.clientId, clientId), isNull(searchMatches.seenAt)));
  revalidatePath(`/crm/klienci/${clientId}`);
  revalidatePath("/crm");
}
