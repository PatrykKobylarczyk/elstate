-- Przykładowe adresy ofert startowych, żeby mapa trafiała w konkretny budynek (tylko tam, gdzie ulicy brak).
UPDATE "listings" SET "street" = 'Piłsudskiego 135' WHERE "slug" = 'jasne-mieszkanie-z-tarasem' AND ("street" IS NULL OR "street" = '');
--> statement-breakpoint
UPDATE "listings" SET "street" = 'Piotrkowska 120' WHERE "slug" = 'stylowy-apartament-w-centrum' AND ("street" IS NULL OR "street" = '');
--> statement-breakpoint
UPDATE "listings" SET "street" = 'Ogrodowa 17' WHERE "slug" = 'loft-w-centrum' AND ("street" IS NULL OR "street" = '');
--> statement-breakpoint
UPDATE "listings" SET "street" = 'Sienkiewicza 46' WHERE "slug" = 'dwa-pokoje-w-centrum' AND ("street" IS NULL OR "street" = '');
--> statement-breakpoint
UPDATE "listings" SET "street" = 'Narutowicza 40' WHERE "slug" = 'trzy-pokoje-w-centrum' AND ("street" IS NULL OR "street" = '');
--> statement-breakpoint
UPDATE "listings" SET "street" = 'Rzgowska 60' WHERE "slug" = 'trzy-pokoje-gorna' AND ("street" IS NULL OR "street" = '');
--> statement-breakpoint
UPDATE "listings" SET "street" = 'Zgierska 90' WHERE "slug" = 'dwa-pokoje-baluty' AND ("street" IS NULL OR "street" = '');
--> statement-breakpoint
UPDATE "listings" SET "street" = 'Rokicińska 50' WHERE "slug" = 'dwa-pokoje-widzew' AND ("street" IS NULL OR "street" = '');
--> statement-breakpoint
UPDATE "listings" SET "street" = 'Paderewskiego 20' WHERE "slug" = 'cztery-pokoje-gorna' AND ("street" IS NULL OR "street" = '');
--> statement-breakpoint
UPDATE "listings" SET "street" = 'Kusocińskiego 80' WHERE "slug" = 'kawalerka-retkinia' AND ("street" IS NULL OR "street" = '');
