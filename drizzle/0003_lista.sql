CREATE TABLE "lista_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"name" text NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lista_devices_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "lista_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"author" text NOT NULL,
	"author_device_id" integer,
	"done_at" timestamp with time zone,
	"done_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lista_push" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lista_push_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "lista_items" ADD CONSTRAINT "lista_items_author_device_id_lista_devices_id_fk" FOREIGN KEY ("author_device_id") REFERENCES "public"."lista_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lista_push" ADD CONSTRAINT "lista_push_device_id_lista_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."lista_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lista_items_done_idx" ON "lista_items" USING btree ("done_at","created_at");