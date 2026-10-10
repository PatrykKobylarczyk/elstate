// Migracje bazy CRM przed buildem na Vercelu. Bez DATABASE_URL nic nie robi.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] brak DATABASE_URL, pomijam migracje");
  process.exit(0);
}
const client = postgres(url, { max: 1, ssl: url.includes("localhost") ? false : "require" });
await migrate(drizzle(client), { migrationsFolder: "drizzle" });
await client.end();
console.log("[migrate] baza aktualna");
