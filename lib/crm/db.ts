import "server-only";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Połączenie z bazą CRM.
// Produkcja (Vercel): DATABASE_URL z Neon lub Supabase (region UE). Migracje robi scripts/migrate.mjs przy buildzie.
// Lokalnie bez DATABASE_URL, z ELSTATE_LOCAL_DB=1: wbudowany Postgres (PGlite) w katalogu .data/, migracje przy starcie.
// Bez żadnego z nich CRM pokazuje „baza niepodłączona”, a strona bierze oferty z lib/data.ts.

type DB = ReturnType<typeof drizzlePg<typeof schema>>;

const g = globalThis as unknown as { __elstateDb?: Promise<DB> };

export const dbConfigured = () => Boolean(process.env.DATABASE_URL || process.env.ELSTATE_LOCAL_DB);

async function connect(): Promise<DB> {
  if (process.env.DATABASE_URL) {
    const client = postgres(process.env.DATABASE_URL, { max: 5, prepare: false, ssl: process.env.DATABASE_URL.includes("localhost") ? false : "require" });
    return drizzlePg(client, { schema });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.ELSTATE_LOCAL_DB_DIR || ".data/pglite";
  const { mkdir } = await import("node:fs/promises");
  await mkdir(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db as unknown as DB;
}

export function db(): Promise<DB> {
  if (!dbConfigured()) throw new Error("Baza CRM nie jest podłączona (brak DATABASE_URL).");
  // nieudane połączenie nie zostaje w pamięci, następne zapytanie spróbuje od nowa
  g.__elstateDb ??= connect().catch((e) => {
    g.__elstateDb = undefined;
    throw e;
  });
  return g.__elstateDb;
}
