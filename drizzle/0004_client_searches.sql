CREATE TABLE "client_searches" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"deal" text,
	"category" text,
	"locations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_min" integer,
	"price_max" integer,
	"area_min" real,
	"area_max" real,
	"rooms_min" integer,
	"rooms_max" integer,
	"exclude" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"agent_id" integer,
	"notify_email" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"search_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"lead_id" integer NOT NULL,
	"backfill" boolean DEFAULT false NOT NULL,
	"seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_searches" ADD CONSTRAINT "client_searches_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_searches" ADD CONSTRAINT "client_searches_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_matches" ADD CONSTRAINT "search_matches_search_id_client_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."client_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_matches" ADD CONSTRAINT "search_matches_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_matches" ADD CONSTRAINT "search_matches_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_searches_client_idx" ON "client_searches" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "search_matches_pair_idx" ON "search_matches" USING btree ("search_id","lead_id");--> statement-breakpoint
CREATE INDEX "search_matches_client_idx" ON "search_matches" USING btree ("client_id","seen_at");