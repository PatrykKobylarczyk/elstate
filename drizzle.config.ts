import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/crm/schema.ts",
  out: "./drizzle",
});
