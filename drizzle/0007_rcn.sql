-- IF NOT EXISTS: tabela mogła już powstać z wcześniejszej wersji tej migracji (0004_rcn z podglądu PR #7 na tej samej bazie)
CREATE TABLE IF NOT EXISTS "rcn_transakcje" (
	"id" text PRIMARY KEY NOT NULL,
	"rodzaj" text NOT NULL,
	"teryt_powiat" text NOT NULL,
	"powiat" text NOT NULL,
	"gmina" text,
	"miejscowosc" text,
	"ulica" text,
	"numer" text,
	"data" date NOT NULL,
	"rynek" text,
	"cena" double precision NOT NULL,
	"pow" real,
	"pow_dzialki" real,
	"cena_m2" real,
	"pokoje" integer,
	"pietro" integer,
	"funkcja" text,
	"uwagi" text,
	"lat" double precision,
	"lng" double precision,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rcn_rodzaj_data_idx" ON "rcn_transakcje" USING btree ("rodzaj","data");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rcn_powiat_idx" ON "rcn_transakcje" USING btree ("teryt_powiat","data");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rcn_miejscowosc_idx" ON "rcn_transakcje" USING btree ("miejscowosc");--> statement-breakpoint
ALTER TABLE "rcn_transakcje" ADD COLUMN IF NOT EXISTS "pow_dzialki" real;--> statement-breakpoint
ALTER TABLE "rcn_transakcje" ADD COLUMN IF NOT EXISTS "uwagi" text;
