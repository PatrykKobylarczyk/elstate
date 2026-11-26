CREATE TABLE "rcn_transakcje" (
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
CREATE INDEX "rcn_rodzaj_data_idx" ON "rcn_transakcje" USING btree ("rodzaj","data");--> statement-breakpoint
CREATE INDEX "rcn_powiat_idx" ON "rcn_transakcje" USING btree ("teryt_powiat","data");--> statement-breakpoint
CREATE INDEX "rcn_miejscowosc_idx" ON "rcn_transakcje" USING btree ("miejscowosc");