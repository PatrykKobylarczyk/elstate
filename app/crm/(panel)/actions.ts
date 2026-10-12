"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, log, randomPassword, requireUser } from "@/lib/crm/auth";
import { db } from "@/lib/crm/db";
import { categoriesCrm, clientKinds, deals, leadStatuses, listingStatuses } from "@/lib/crm/labels";
import { ingestNbot } from "@/lib/crm/leads";
import { clients, leads, listings, notes, sessions, users } from "@/lib/crm/schema";
import { removeImage, saveImage } from "@/lib/crm/storage";

type State = { error?: string; ok?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const opt = (f: FormData, k: string) => str(f, k) || null;
const int = (f: FormData, k: string) => {
  const v = str(f, k).replace(/[\s zł]/g, "");
  if (!v) return null;
  const n = Math.round(Number(v.replace(",", ".")));
  return Number.isFinite(n) ? n : null;
};
const dec = (f: FormData, k: string) => {
  const v = str(f, k).replace(/\s/g, "").replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const oneOf = (list: readonly (readonly [string, string])[], v: string, fallback: string) => (list.some(([k]) => k === v) ? v : fallback);
const idOf = (f: FormData, k = "id") => {
  const n = Number(f.get(k));
  return Number.isInteger(n) && n > 0 ? n : null;
};

function slugify(s: string) {
  const map: Record<string, string> = { ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" };
  return s
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => map[c])
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function refreshSite(slugs: string[]) {
  revalidatePath("/");
  revalidatePath("/oferty");
  for (const s of slugs) if (s) revalidatePath(`/oferty/${s}`);
}

// ——— Oferty ———

export async function uploadPhoto(f: FormData): Promise<{ url?: string; error?: string }> {
  await requireUser();
  const file = f.get("file");
  if (!(file instanceof File) || !file.size) return { error: "Brak pliku." };
  try {
    return { url: await saveImage(file, (slugify(str(f, "prefix"))) || "oferta") };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Nie udało się zapisać zdjęcia." };
  }
}

export async function saveListing(_: State, f: FormData): Promise<State> {
  const user = await requireUser();
  const d = await db();
  const id = idOf(f);
  const title = str(f, "title");
  if (!title) return { error: "Podaj tytuł oferty." };
  let slug = (slugify(str(f, "slug") || title)) || `oferta-${Date.now()}`;
  const taken = await d.select({ id: listings.id }).from(listings).where(id ? and(eq(listings.slug, slug), ne(listings.id, id)) : eq(listings.slug, slug));
  if (taken.length) {
    if (str(f, "slug")) return { error: "Taki adres oferty już istnieje. Zmień końcówkę adresu." };
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }
  let images: string[] = [];
  try {
    images = (JSON.parse(str(f, "images") || "[]") as unknown[]).filter((x): x is string => typeof x === "string" && /^(https:\/\/|\/crm-pliki\/|\/zdjecia\/oferty\/|\/oferty\/)/.test(x)).slice(0, 60);
  } catch {}
  const status = oneOf(listingStatuses, str(f, "status"), "szkic");
  const values = {
    slug,
    status,
    title: title.slice(0, 200),
    deal: oneOf(deals, str(f, "deal"), "sprzedaz"),
    category: oneOf(categoriesCrm, str(f, "category"), "mieszkania"),
    city: str(f, "city") || "Łódź",
    district: str(f, "district"),
    street: opt(f, "street"),
    price: int(f, "price") ?? 0,
    area: dec(f, "area") ?? 0,
    rooms: int(f, "rooms") ?? 1,
    floor: int(f, "floor") ?? 0,
    floorsTotal: int(f, "floorsTotal"),
    year: int(f, "year"),
    description: opt(f, "description"),
    features: str(f, "features").split(/[\n,]/).map((x) => x.trim()).filter(Boolean).slice(0, 30),
    images,
    featured: f.get("featured") === "on",
    ownerId: idOf(f, "ownerId"),
    agentId: idOf(f, "agentId"),
    commission: opt(f, "commission"),
    internalNotes: opt(f, "internalNotes"),
    sortOrder: int(f, "sortOrder") ?? 0,
    updatedAt: new Date(),
  };
  if ((status === "aktywna" || status === "rezerwacja") && (!values.price || !values.area || !values.district)) {
    return { error: "Żeby opublikować ofertę, uzupełnij cenę, powierzchnię i dzielnicę." };
  }
  let oldSlug = "";
  let savedId = id;
  if (id) {
    const [old] = await d.select().from(listings).where(eq(listings.id, id));
    if (!old) return { error: "Oferta nie istnieje." };
    oldSlug = old.slug;
    await d.update(listings).set(values).where(eq(listings.id, id));
    for (const url of old.images) if (!images.includes(url)) await removeImage(url);
  } else {
    const [row] = await d.insert(listings).values(values).returning({ id: listings.id });
    savedId = row.id;
  }
  // tylko jedna oferta wyróżniona na stronie głównej
  if (values.featured) await d.update(listings).set({ featured: false }).where(and(eq(listings.featured, true), ne(listings.id, savedId!)));
  await log("listing_saved", { userId: user.id, subject: slug, meta: { id: savedId, status } });
  refreshSite([slug, oldSlug]);
  if (!id) redirect(`/crm/oferty/${savedId}?zapisano=1`);
  return { ok: status === "aktywna" || status === "rezerwacja" ? "Zapisano. Oferta jest na stronie." : "Zapisano. Oferta nie jest widoczna na stronie (status: " + listingStatuses.find(([k]) => k === status)?.[1].toLowerCase() + ")." };
}

export async function deleteListing(f: FormData) {
  const user = await requireUser();
  const id = idOf(f);
  if (!id) return;
  const d = await db();
  const [old] = await d.select().from(listings).where(eq(listings.id, id));
  if (!old) redirect("/crm/oferty");
  await d.delete(listings).where(eq(listings.id, id));
  for (const url of old.images) await removeImage(url);
  await log("listing_deleted", { userId: user.id, subject: old.slug });
  refreshSite([old.slug]);
  redirect("/crm/oferty");
}

export async function quickListingStatus(f: FormData) {
  const user = await requireUser();
  const id = idOf(f);
  const status = oneOf(listingStatuses, str(f, "status"), "");
  if (!id || !status) return;
  const d = await db();
  if (status === "aktywna" || status === "rezerwacja") {
    const [cur] = await d.select().from(listings).where(eq(listings.id, id));
    // niekompletnej oferty nie publikujemy z listy; edytor pokaże, czego brakuje
    if (!cur?.price || !cur.area || !cur.district) redirect(`/crm/oferty/${id}`);
  }
  const [row] = await d.update(listings).set({ status, updatedAt: new Date() }).where(eq(listings.id, id)).returning({ slug: listings.slug });
  await log("listing_saved", { userId: user.id, subject: row?.slug, meta: { id, status } });
  refreshSite([row?.slug ?? ""]);
}

// ——— Leady ———

export async function updateLead(_: State, f: FormData): Promise<State> {
  const user = await requireUser();
  const id = idOf(f);
  if (!id) return { error: "Brak zgłoszenia." };
  const d = await db();
  const next = str(f, "nextContactAt");
  await d
    .update(leads)
    .set({
      status: oneOf(leadStatuses, str(f, "status"), "nowy"),
      title: opt(f, "title"),
      contactName: opt(f, "contactName"),
      phone: opt(f, "phone"),
      email: opt(f, "email"),
      location: opt(f, "location"),
      price: int(f, "price"),
      area: dec(f, "area"),
      rooms: int(f, "rooms"),
      assignedTo: idOf(f, "assignedTo"),
      nextContactAt: next ? new Date(`${next}:00${warsawOffset(next)}`) : null,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, id));
  await log("lead_saved", { userId: user.id, subject: String(id) });
  revalidatePath("/crm", "layout");
  return { ok: "Zapisano." };
}

// przesunięcie strefy czasowej Warszawy dla podanej daty (lato +02:00, zima +01:00)
function warsawOffset(local: string) {
  const probe = new Date(`${local}:00Z`);
  const tz = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Warsaw", timeZoneName: "shortOffset" }).formatToParts(probe).find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const h = Number(tz.replace("GMT", "")) || 1;
  return `+0${h}:00`;
}

export async function quickLeadStatus(f: FormData) {
  const user = await requireUser();
  const id = idOf(f);
  const status = oneOf(leadStatuses, str(f, "status"), "");
  if (!id || !status) return;
  const d = await db();
  await d.update(leads).set({ status, updatedAt: new Date(), ...(status === "w_kontakcie" ? { assignedTo: user.id } : {}) }).where(eq(leads.id, id));
  await log("lead_saved", { userId: user.id, subject: String(id), meta: { status } });
  revalidatePath("/crm", "layout");
}

export async function createLead(_: State, f: FormData): Promise<State> {
  const user = await requireUser();
  const d = await db();
  const [row] = await d
    .insert(leads)
    .values({
      source: "recznie",
      status: "nowy",
      title: opt(f, "title") ?? "Nowe zgłoszenie",
      contactName: opt(f, "contactName"),
      phone: opt(f, "phone"),
      email: opt(f, "email"),
      url: opt(f, "url"),
      message: opt(f, "message"),
      assignedTo: user.id,
    })
    .returning({ id: leads.id });
  await log("lead_saved", { userId: user.id, subject: String(row.id), meta: { created: true } });
  redirect(`/crm/leady/${row.id}`);
}

export async function importNbot(_: State, f: FormData): Promise<State> {
  const user = await requireUser();
  const body = str(f, "mail");
  if (body.length < 10) return { error: "Wklej treść maila z nbot." };
  const html = /<\/?(a|p|div|table|br)\b/i.test(body) ? body : undefined;
  const r = await ingestNbot({ subject: opt(f, "subject") ?? undefined, text: html ? undefined : body, html }, user.id);
  revalidatePath("/crm", "layout");
  return { ok: `Dodano: ${r.added}${r.repeated ? `, powtórki już znanych ogłoszeń: ${r.repeated}` : ""}.` };
}

export async function leadToClient(f: FormData) {
  const user = await requireUser();
  const id = idOf(f);
  if (!id) return;
  const d = await db();
  const [l] = await d.select().from(leads).where(eq(leads.id, id));
  if (!l) return;
  if (l.clientId) redirect(`/crm/klienci/${l.clientId}`);
  const [c] = await d
    .insert(clients)
    .values({ name: l.contactName || l.title || `Klient z leada ${id}`, phone: l.phone, email: l.email, kind: l.source === "nbot" ? "sprzedajacy" : "kupujacy", notes: l.url ? `Ogłoszenie: ${l.url}` : l.message })
    .returning({ id: clients.id });
  await d.update(leads).set({ clientId: c.id, updatedAt: new Date() }).where(eq(leads.id, id));
  await log("client_saved", { userId: user.id, subject: String(c.id), meta: { fromLead: id } });
  redirect(`/crm/klienci/${c.id}`);
}

export async function leadToListing(f: FormData) {
  const user = await requireUser();
  const id = idOf(f);
  if (!id) return;
  const d = await db();
  const [l] = await d.select().from(leads).where(eq(leads.id, id));
  if (!l) return;
  if (l.listingId) redirect(`/crm/oferty/${l.listingId}`);
  const title = l.title?.slice(0, 120) || "Nowa oferta";
  const [row] = await d
    .insert(listings)
    .values({
      slug: `${(slugify(title)) || "oferta"}-${Date.now().toString(36).slice(-4)}`,
      status: "szkic",
      title,
      price: l.price ?? 0,
      area: l.area ?? 0,
      rooms: l.rooms ?? 1,
      district: "",
      ownerId: l.clientId,
      agentId: user.id,
      internalNotes: [l.location && `Lokalizacja z ogłoszenia: ${l.location}`, l.url && `Źródło: ${l.url}`].filter(Boolean).join("\n") || null,
    })
    .returning({ id: listings.id });
  await d.update(leads).set({ listingId: row.id, status: "pozyskany", updatedAt: new Date() }).where(eq(leads.id, id));
  await log("listing_saved", { userId: user.id, subject: String(row.id), meta: { fromLead: id } });
  redirect(`/crm/oferty/${row.id}`);
}

// ——— Notatki ———

export async function addNote(_: State, f: FormData): Promise<State> {
  const user = await requireUser();
  const body = str(f, "body");
  if (!body) return { error: "Notatka jest pusta." };
  const d = await db();
  await d.insert(notes).values({ body: body.slice(0, 5000), userId: user.id, leadId: idOf(f, "leadId"), clientId: idOf(f, "clientId"), listingId: idOf(f, "listingId") });
  const leadId = idOf(f, "leadId");
  // notatka przy nowym zgłoszeniu oznacza, że ktoś się nim zajął
  if (leadId) await d.update(leads).set({ status: sql`case when ${leads.status} = 'nowy' then 'w_kontakcie' else ${leads.status} end`, assignedTo: sql`coalesce(${leads.assignedTo}, ${user.id})`, updatedAt: new Date() }).where(eq(leads.id, leadId));
  revalidatePath("/crm", "layout");
  return { ok: "Dodano notatkę." };
}

// ——— Klienci ———

export async function saveClient(_: State, f: FormData): Promise<State> {
  const user = await requireUser();
  const name = str(f, "name");
  if (!name) return { error: "Podaj imię i nazwisko lub nazwę." };
  const d = await db();
  const id = idOf(f);
  const values = { name: name.slice(0, 200), phone: opt(f, "phone"), email: opt(f, "email"), kind: oneOf(clientKinds, str(f, "kind"), "inny"), notes: opt(f, "notes"), updatedAt: new Date() };
  if (id) {
    await d.update(clients).set(values).where(eq(clients.id, id));
    await log("client_saved", { userId: user.id, subject: String(id) });
    revalidatePath(`/crm/klienci/${id}`);
    return { ok: "Zapisano." };
  }
  const [row] = await d.insert(clients).values(values).returning({ id: clients.id });
  await log("client_saved", { userId: user.id, subject: String(row.id), meta: { created: true } });
  redirect(`/crm/klienci/${row.id}`);
}

export async function deleteClient(f: FormData) {
  const user = await requireUser();
  const id = idOf(f);
  if (!id) return;
  const d = await db();
  await d.delete(clients).where(eq(clients.id, id));
  await log("client_saved", { userId: user.id, subject: String(id), meta: { deleted: true } });
  redirect("/crm/klienci");
}

// ——— Użytkownicy ———

export async function createUser(_: State, f: FormData): Promise<State> {
  const user = await requireUser();
  const name = str(f, "name");
  const email = str(f, "email").toLowerCase();
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Podaj imię i poprawny e-mail." };
  const d = await db();
  const [exists] = await d.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (exists) return { error: "Ten e-mail ma już konto." };
  const temp = randomPassword();
  await d.insert(users).values({ name, email, passwordHash: await hashPassword(temp), mustChangePassword: true });
  await log("user_created", { userId: user.id, subject: email });
  revalidatePath("/crm/ustawienia");
  return { ok: `Konto utworzone. Przekaż ${name} osobiście (nie mailem):\nadres: /crm/logowanie\nhasło tymczasowe: ${temp}\nPrzy pierwszym logowaniu ustawi własne hasło i kod 2FA.` };
}

export async function toggleUser(f: FormData) {
  const user = await requireUser();
  const id = idOf(f);
  if (!id || id === user.id) return;
  const d = await db();
  await d.update(users).set({ active: sql`not ${users.active}` }).where(eq(users.id, id));
  await d.delete(sessions).where(eq(sessions.userId, id));
  await log("user_toggled", { userId: user.id, subject: String(id) });
  revalidatePath("/crm/ustawienia");
}

export async function resetUser2fa(_: State, f: FormData): Promise<State> {
  const user = await requireUser();
  const id = idOf(f);
  if (!id || id === user.id) return { error: "Nie można zresetować własnego konta." };
  const d = await db();
  const temp = randomPassword();
  await d.update(users).set({ totpEnabled: false, totpSecret: null, mustChangePassword: true, passwordHash: await hashPassword(temp) }).where(eq(users.id, id));
  await d.delete(sessions).where(eq(sessions.userId, id));
  await log("user_toggled", { userId: user.id, subject: String(id), meta: { reset: true } });
  revalidatePath("/crm/ustawienia");
  return { ok: `Zresetowano. Nowe hasło tymczasowe (przekaż osobiście): ${temp}\nPrzy logowaniu ta osoba ustawi nowe hasło i ponownie zeskanuje kod 2FA.` };
}

// Przeniesienie ofert startowych (z lib/data.ts) do CRM, żeby dalej zarządzać nimi tutaj
export async function importStarterListings() {
  const user = await requireUser();
  const { listings: starter } = await import("@/lib/data");
  const d = await db();
  const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(listings);
  if (n > 0) redirect("/crm/oferty");
  for (const [i, s] of starter.entries()) {
    await d.insert(listings).values({
      slug: s.slug,
      status: "aktywna",
      title: s.title,
      deal: s.deal,
      category: s.category,
      city: s.city,
      district: s.district,
      price: s.price,
      area: s.area,
      rooms: s.rooms,
      floor: s.floor,
      year: s.year ?? null,
      floorsTotal: s.floorsTotal ?? null,
      street: s.street ?? null,
      description: s.description ?? null,
      features: s.features ?? [],
      images: s.images?.length ? s.images : s.image ? [s.image] : [],
      featured: Boolean(s.featured),
      agentId: user.id,
      sortOrder: i,
    });
  }
  await log("listing_saved", { userId: user.id, subject: "import-startowych", meta: { count: starter.length } });
  refreshSite(starter.map((s) => s.slug));
  redirect("/crm/oferty");
}

// Kod e-mailem jako druga metoda logowania obok aplikacji
export async function toggleEmailOtp(f: FormData) {
  const user = await requireUser();
  const on = f.get("on") === "1";
  // bez aplikacji e-mail jest jedynym drugim krokiem i nie można go wyłączyć
  if (!on && !user.totpEnabled) return;
  const d = await db();
  await d.update(users).set({ emailOtp: on }).where(eq(users.id, user.id));
  await log(on ? "email_otp_enabled" : "user_toggled", { userId: user.id, subject: user.email, meta: { emailOtp: on } });
  revalidatePath("/crm/ustawienia");
}
