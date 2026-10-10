import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "./db";
import { clients, users } from "./schema";

export async function pickers() {
  const d = await db();
  const [c, u] = await Promise.all([
    d.select({ id: clients.id, name: clients.name }).from(clients).orderBy(asc(clients.name)),
    d.select({ id: users.id, name: users.name }).from(users).where(eq(users.active, true)),
  ]);
  return { clients: c, team: u };
}
