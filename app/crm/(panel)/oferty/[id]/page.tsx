import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import Notes from "@/components/crm/Notes";
import LocationMap from "@/components/offer/LocationMap";
import { Badge, PageHead, btnGhost, card, listingTone, pln, when } from "@/components/crm/ui";
import { requireUser } from "@/lib/crm/auth";
import { db } from "@/lib/crm/db";
import { categoriesCrm, clientKinds, deals, label, listingStatuses } from "@/lib/crm/labels";
import { clients, listings, users } from "@/lib/crm/schema";
import { geocode } from "@/lib/geocode";
import { nearby } from "@/lib/nearby";

export const metadata: Metadata = { title: "Oferta" };

// Karta oferty w CRM: wszystkie dane (także wewnętrzne), notatki i mapa okolicy z odległościami.
// Edycja jest pod /crm/oferty/[id]/edycja.
export default async function Oferta({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const d = await db();
  const [row] = await d.select({ l: listings, agent: users.name, agentEmail: users.email }).from(listings).leftJoin(users, eq(users.id, listings.agentId)).where(eq(listings.id, id));
  if (!row) notFound();
  const { l } = row;
  const [owner] = l.ownerId ? await d.select().from(clients).where(eq(clients.id, l.ownerId)) : [];

  const spot = l.lat != null && l.lng != null ? { lat: l.lat, lng: l.lng } : await geocode({ street: l.street ?? undefined, district: l.district, city: l.city });
  const around = spot ? await nearby(spot) : [];
  const queries = [[l.street, l.district, l.city], [l.street, l.city], [l.district, l.city], [l.city]]
    .map((q) => q.filter(Boolean).join(", "))
    .filter((q, i, all) => q && all.indexOf(q) === i);
  const place = [l.street, l.district, l.city].filter(Boolean).join(", ");
  const isPublic = l.status === "aktywna" || l.status === "rezerwacja";
  const perM2 = l.deal === "sprzedaz" && l.price && l.area ? `${Math.round(l.price / l.area).toLocaleString("pl-PL")} zł/m²` : null;

  const facts: [string, string | null | undefined][] = [
    ["Transakcja", label(deals, l.deal)],
    ["Rodzaj", label(categoriesCrm, l.category)],
    ["Cena", l.deal === "wynajem" ? `${pln(l.price)} / mies.` : pln(l.price)],
    ["Cena za m²", perM2],
    ["Powierzchnia", l.area ? `${l.area.toLocaleString("pl-PL")} m²` : null],
    ["Pokoje", String(l.rooms)],
    ["Piętro", l.floorsTotal ? `${l.floor} z ${l.floorsTotal}` : String(l.floor)],
    ["Rok budowy", l.year ? String(l.year) : null],
    ["Adres", place],
    ["Wyróżniona", l.featured ? "tak" : null],
    ["Utworzona", when(l.createdAt)],
    ["Zmieniona", when(l.updatedAt)],
  ];

  return (
    <>
      <Link href="/crm/oferty" className="text-sm font-semibold text-graphite/55 hover:text-plum-900">← Oferty</Link>
      <PageHead title={l.title} sub={<Badge tone={listingTone[l.status]}>{label(listingStatuses, l.status)}</Badge>}>
        <Link href={`/crm/oferty/${l.id}/edycja`} className="inline-flex rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-pearl hover:bg-plum-700">Edytuj ofertę</Link>
        {isPublic && (
          <a href={`/oferty/${l.slug}`} target="_blank" rel="noreferrer" className={btnGhost}>Zobacz na stronie ↗</a>
        )}
      </PageHead>

      {l.images.length > 0 && (
        <div className="-mx-4 mb-6 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
          {l.images.map((src) => (
            <a key={src} href={src} target="_blank" rel="noreferrer" className="h-40 w-60 shrink-0 snap-start overflow-hidden rounded-xl bg-mist md:h-48 md:w-72">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-6">
          <section className={card}>
            <h2 className="mb-3 font-display text-xl text-plum-900">Dane oferty</h2>
            <dl className="divide-y divide-graphite/8">
              {facts.filter((f): f is [string, string] => Boolean(f[1])).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-6 py-2.5 text-sm">
                  <dt className="text-graphite/55">{k}</dt>
                  <dd className="text-right font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          {(l.description || l.features.length > 0) && (
            <section className={card}>
              <h2 className="mb-3 font-display text-xl text-plum-900">Opis</h2>
              {l.description && <p className="whitespace-pre-line text-sm leading-relaxed text-graphite/80">{l.description}</p>}
              {l.features.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {l.features.map((f) => <li key={f}><Badge tone="gold">{f}</Badge></li>)}
                </ul>
              )}
            </section>
          )}
        </div>
        <div className="grid content-start gap-6">
          <section className={card}>
            <h2 className="mb-3 font-display text-xl text-plum-900">Wewnętrzne</h2>
            <dl className="grid gap-4 text-sm">
              <div>
                <dt className="text-graphite/55">Właściciel</dt>
                <dd className="mt-1 font-semibold">
                  {owner ? (
                    <>
                      <Link href={`/crm/klienci/${owner.id}`} className="hover:text-plum-900 hover:underline">{owner.name}</Link>
                      <span className="ml-2 font-normal text-graphite/55">{label(clientKinds, owner.kind)}</span>
                      <span className="mt-1 flex flex-wrap gap-x-4 font-normal">
                        {owner.phone && <a href={`tel:${owner.phone.replace(/\s/g, "")}`} className="text-plum-900 hover:underline">{owner.phone}</a>}
                        {owner.email && <a href={`mailto:${owner.email}`} className="text-plum-900 hover:underline">{owner.email}</a>}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-graphite/55">Opiekun</dt>
                <dd className="mt-1 font-semibold">{row.agent ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-graphite/55">Prowizja / umowa</dt>
                <dd className="mt-1 font-semibold">{l.commission || "—"}</dd>
              </div>
              <div>
                <dt className="text-graphite/55">Notatki wewnętrzne</dt>
                <dd className="mt-1 whitespace-pre-line">{l.internalNotes || "—"}</dd>
              </div>
            </dl>
          </section>
          <Notes listingId={l.id} />
        </div>
      </div>

      <section className="mt-6">
        <LocationMap home={spot} queries={queries} pinLabel={l.street || l.district || l.city} categories={around} details zoom={l.street ? 16 : 14}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">Okolica</p>
            <h2 className="mt-3 font-display text-3xl">{place || l.city}</h2>
            <p className="mt-3 text-sm leading-relaxed text-pearl/55">Rozwiń kategorię, aby zobaczyć miejsca na mapie. Odległości w linii prostej, czas przejścia orientacyjny.</p>
          </div>
        </LocationMap>
      </section>
    </>
  );
}
