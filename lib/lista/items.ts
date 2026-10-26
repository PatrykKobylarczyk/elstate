import "server-only";
import { and, desc, eq, gt, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/crm/db";
import { listaDevices, listaItems, type ListaDevice, type ListaItem } from "@/lib/crm/schema";

export type Item = { id: number; text: string; author: string; createdAt: string; doneAt: string | null; doneBy: string | null };
export type ListState = { me: string; seenAt: string; open: Item[]; done: Item[] };

const plain = (i: ListaItem): Item => ({
  id: i.id,
  text: i.text,
  author: i.author,
  createdAt: i.createdAt.toISOString(),
  doneAt: i.doneAt?.toISOString() ?? null,
  doneBy: i.doneBy,
});

const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase("pl") === b.trim().toLocaleLowerCase("pl");

/** Cała lista dla urządzenia. Z markSeen zapisuje, że ktoś na nią patrzy (licznik na ikonie spada do zera). */
export async function listFor(dev: ListaDevice, markSeen: boolean): Promise<ListState> {
  const d = await db();
  const [open, done] = await Promise.all([
    d.select().from(listaItems).where(isNull(listaItems.doneAt)).orderBy(desc(listaItems.createdAt)),
    d.select().from(listaItems).where(isNotNull(listaItems.doneAt)).orderBy(desc(listaItems.doneAt)).limit(40),
  ]);
  if (markSeen) await d.update(listaDevices).set({ seenAt: new Date() }).where(eq(listaDevices.id, dev.id));
  return { me: dev.name, seenAt: dev.seenAt.toISOString(), open: open.map(plain), done: done.map(plain) };
}

export async function addItem(dev: ListaDevice, text: string) {
  const d = await db();
  const [row] = await d.insert(listaItems).values({ text, author: dev.name, authorDeviceId: dev.id }).returning();
  // swój wpis nie podbija własnego licznika
  await d.update(listaDevices).set({ seenAt: new Date() }).where(eq(listaDevices.id, dev.id));
  return plain(row);
}

export async function updateItem(dev: ListaDevice, id: number, patch: { text?: string; done?: boolean }) {
  const d = await db();
  const set: Partial<typeof listaItems.$inferInsert> = { updatedAt: new Date() };
  if (patch.text !== undefined) set.text = patch.text;
  if (patch.done !== undefined) Object.assign(set, patch.done ? { doneAt: new Date(), doneBy: dev.name } : { doneAt: null, doneBy: null });
  const [row] = await d.update(listaItems).set(set).where(eq(listaItems.id, id)).returning();
  return row ? plain(row) : null;
}

export async function deleteItem(id: number) {
  await (await db()).delete(listaItems).where(eq(listaItems.id, id));
}

export async function clearDone() {
  await (await db()).delete(listaItems).where(isNotNull(listaItems.doneAt));
}

/** Liczba niezrobionych wpisów innych osób dodanych od ostatniego otwarcia listy na tym urządzeniu. */
export async function unseenCount(dev: { name: string; seenAt: Date }) {
  const d = await db();
  const [row] = await d
    .select({ n: sql<number>`count(*)::int` })
    .from(listaItems)
    .where(and(isNull(listaItems.doneAt), gt(listaItems.createdAt, dev.seenAt), ne(sql`lower(${listaItems.author})`, dev.name.toLowerCase())));
  return row?.n ?? 0;
}

export { sameName };
