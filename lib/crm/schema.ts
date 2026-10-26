// Schemat bazy CRM (Postgres, Drizzle). Zmiany: edytuj ten plik i uruchom `npm run db:generate`,
// migracje w drizzle/ wykonują się same przy buildzie (scripts/migrate.mjs).
import { sql } from "drizzle-orm";
import { boolean, date, doublePrecision, index, integer, jsonb, pgTable, real, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  // sekret TOTP; dopóki totp_enabled = false, logowanie wymusza konfigurację 2FA
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  // drugi krok kodem wysyłanym e-mailem (zamiast albo obok aplikacji)
  emailOtp: boolean("email_otp").notNull().default(false),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const sessions = pgTable("sessions", {
  // sha256 tokenu z ciasteczka; sam token nigdy nie trafia do bazy
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // false = hasło sprawdzone, czeka na kod 2FA
  verified: boolean("verified").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
});

// Jednorazowe kody logowania wysyłane e-mailem; w bazie tylko skrót sha256
export const loginCodes = pgTable("login_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  // sprzedający, kupujący, wynajmujący, najemca, inny
  kind: text("kind").notNull().default("sprzedajacy"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const listings = pgTable(
  "listings",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    // szkic | aktywna (na stronie) | rezerwacja (na stronie z plakietką) | sprzedana | archiwum
    status: text("status").notNull().default("szkic"),
    title: text("title").notNull(),
    deal: text("deal").notNull().default("sprzedaz"),
    category: text("category").notNull().default("mieszkania"),
    city: text("city").notNull().default("Łódź"),
    district: text("district").notNull().default(""),
    street: text("street"),
    price: integer("price").notNull().default(0),
    area: real("area").notNull().default(0),
    rooms: integer("rooms").notNull().default(1),
    floor: integer("floor").notNull().default(0),
    floorsTotal: integer("floors_total"),
    year: integer("year"),
    description: text("description"),
    features: jsonb("features").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    images: jsonb("images").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    featured: boolean("featured").notNull().default(false),
    // dane wewnętrzne, nigdy nie trafiają na stronę
    ownerId: integer("owner_id").references(() => clients.id, { onDelete: "set null" }),
    agentId: integer("agent_id").references(() => users.id, { onDelete: "set null" }),
    commission: text("commission"),
    internalNotes: text("internal_notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("listings_status_idx").on(t.status)],
);

export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    // nbot | strona | recznie
    source: text("source").notNull(),
    // nowy | do_kontaktu | w_kontakcie | umowione | odrzucony | pozyskany
    status: text("status").notNull().default("nowy"),
    title: text("title"),
    url: text("url"),
    // znormalizowany adres ogłoszenia; po nim łączymy duplikaty
    urlKey: text("url_key"),
    portal: text("portal"),
    price: integer("price"),
    area: real("area"),
    rooms: integer("rooms"),
    location: text("location"),
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    message: text("message"),
    raw: text("raw"),
    assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
    clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
    listingId: integer("listing_id").references(() => listings.id, { onDelete: "set null" }),
    nextContactAt: timestamp("next_contact_at", { withTimezone: true }),
    seenCount: integer("seen_count").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("leads_url_key_idx").on(t.urlKey), index("leads_status_idx").on(t.status)],
);

// Notatki i historia kontaktu przy leadzie, kliencie lub ofercie
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }),
  listingId: integer("listing_id").references(() => listings.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

// Dziennik zdarzeń: logowania (także nieudane), zmiany danych. Służy też do limitu prób logowania.
export const audit = pgTable(
  "audit",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    subject: text("subject"),
    ip: text("ip"),
    meta: jsonb("meta"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_action_idx").on(t.action, t.createdAt)],
);

// Ustawienia aplikacji w bazie (np. klucze VAPID do powiadomień push, tworzone same przy pierwszym użyciu)
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: updatedAt(),
});

// Urządzenia, na których ktoś włączył powiadomienia push z CRM (telefon, laptop)
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("push_endpoint_idx").on(t.endpoint)],
);

// Lista: wspólna lista zadań na dwa telefony (osobna aplikacja pod /lista, bez kont CRM).
// Urządzenie loguje się raz wspólnym hasłem LISTA_HASLO i podaje imię; w bazie tylko skrót sha256 tokenu z ciasteczka.
export const listaDevices = pgTable("lista_devices", {
  id: serial("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  name: text("name").notNull(),
  // ostatnie otwarcie listy na tym urządzeniu; nowsze wpisy innych osób to licznik na ikonie
  seenAt: timestamp("seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
});

export const listaItems = pgTable(
  "lista_items",
  {
    id: serial("id").primaryKey(),
    text: text("text").notNull(),
    author: text("author").notNull(),
    authorDeviceId: integer("author_device_id").references(() => listaDevices.id, { onDelete: "set null" }),
    doneAt: timestamp("done_at", { withTimezone: true }),
    doneBy: text("done_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("lista_items_done_idx").on(t.doneAt, t.createdAt)],
);

export const listaPush = pgTable("lista_push", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => listaDevices.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: createdAt(),
});

// Ceny transakcyjne z Rejestru Cen Nieruchomości (Geoportal, pliki powiatów woj. łódzkiego).
// Jeden wiersz to jeden lokal, budynek albo działka z aktu notarialnego; wypełnia go scripts/rcn-import.mjs.
// id = źródłowy identyfikator obiektu, więc ponowny import tylko nadpisuje wiersze.
export const rcnTransakcje = pgTable(
  "rcn_transakcje",
  {
    id: text("id").primaryKey(),
    // mieszkanie | lokal | dom | budynek | dzialka (lokal = użytkowy i inny, dom = budynek mieszkalny, działka = grunt niezabudowany)
    rodzaj: text("rodzaj").notNull(),
    terytPowiat: text("teryt_powiat").notNull(),
    powiat: text("powiat").notNull(),
    // nazwa gminy (w Łodzi dzielnica-delegatura), z TERYT przez ULDK
    gmina: text("gmina"),
    miejscowosc: text("miejscowosc"),
    ulica: text("ulica"),
    numer: text("numer"),
    data: date("data", { mode: "string" }).notNull(),
    // pierwotny | wtorny
    rynek: text("rynek"),
    cena: doublePrecision("cena").notNull(),
    // powierzchnia użytkowa lokalu/budynku albo pole działki, m²
    pow: real("pow"),
    // pole działki pod domem/budynkiem, m²
    powDzialki: real("pow_dzialki"),
    // pusta, gdy cena nie daje uczciwej ceny za m² (udział, kilka lokali w jednej cenie, sprzedaż z bonifikatą itp.)
    cenaM2: real("cena_m2"),
    pokoje: integer("pokoje"),
    pietro: integer("pietro"),
    funkcja: text("funkcja"),
    // zastrzeżenia do ceny, np. „udział 1/2”, „sprzedaż bezprzetargowa”
    uwagi: text("uwagi"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("rcn_rodzaj_data_idx").on(t.rodzaj, t.data),
    index("rcn_powiat_idx").on(t.terytPowiat, t.data),
    index("rcn_miejscowosc_idx").on(t.miejscowosc),
  ],
);

export type User = typeof users.$inferSelect;
export type ListingRow = typeof listings.$inferSelect;
export type LeadRow = typeof leads.$inferSelect;
export type ClientRow = typeof clients.$inferSelect;
export type ListaItem = typeof listaItems.$inferSelect;
export type ListaDevice = typeof listaDevices.$inferSelect;
export type RcnRow = typeof rcnTransakcje.$inferSelect;
