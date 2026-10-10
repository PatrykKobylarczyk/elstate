import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Arrow from "@/components/Arrow";
import ContactForm from "@/components/ContactForm";
import FloorPlan from "@/components/FloorPlan";
import { getListing, getListings } from "@/lib/listings";
import { contact, floorLabel, formatArea, formatPrice, pricePerM2, roomsLabel } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

// strona odświeża się sama po zapisie oferty w CRM (revalidatePath), a dodatkowo co 10 minut
export const revalidate = 600;

export async function generateStaticParams() {
  return (await getListings()).map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const l = await getListing(slug);
  return l ? { title: `${l.title}, ${l.district}` } : {};
}

export default async function Oferta({ params }: Props) {
  const { slug } = await params;
  const l = await getListing(slug);
  if (!l) notFound();
  const facts = [
    ["Cena", formatPrice(l)],
    ["Cena za m²", pricePerM2(l)],
    ["Powierzchnia", formatArea(l.area)],
    ["Pokoje", roomsLabel(l.rooms)],
    ["Piętro", l.floorsTotal ? `${floorLabel(l.floor)} z ${l.floorsTotal}` : floorLabel(l.floor)],
    ["Rok budowy", l.year ? String(l.year) : null],
    ["Lokalizacja", `${l.district}, ${l.city}`],
    ["Transakcja", l.deal === "sprzedaz" ? "Sprzedaż" : "Wynajem"],
  ].filter((f): f is [string, string] => Boolean(f[1]));
  const gallery = (l.images ?? []).slice(1, 9);

  return (
    <>
      <section className="bg-pearl pt-32 pb-16">
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <Link href="/oferty" className="eyebrow text-plum-900 hover:text-plum-700"><Arrow dir="left" /> Wszystkie oferty</Link>
          <div className="mt-8 grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="eyebrow text-plum-900">
                {[l.district, l.city].filter(Boolean).join(" · ")}
                {l.reserved && <span className="ml-3 rounded-full bg-gold px-3 py-1 text-pearl">rezerwacja</span>}
              </p>
              <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.98]">{l.title}</h1>
            </div>
            <p className="font-display text-4xl tabular-nums text-plum-900 lg:text-right">{formatPrice(l)}</p>
          </div>
          <div className="relative mt-12 aspect-[16/9] overflow-hidden rounded-[2rem] bg-mist text-graphite">
            {l.image ? (
              <Image src={l.image} alt={l.title} fill priority className="object-cover" sizes="100vw" />
            ) : (
              <FloorPlan rooms={l.rooms} area={l.area} seed={l.slug} gapClass="stroke-mist" className="absolute inset-0 m-auto h-full w-full p-6 md:p-12" />
            )}
          </div>
          {gallery.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {gallery.map((src, i) => (
                <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-mist">
                  <Image src={src} alt={`${l.title}, zdjęcie ${i + 2}`} fill className="object-cover" sizes="(min-width: 768px) 25vw, 50vw" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      {(l.description || l.features?.length) && (
        <section className="bg-pearl pt-8 text-graphite">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 md:px-10 lg:grid-cols-[1.2fr_0.8fr]">
            {l.description && (
              <div>
                <p className="eyebrow text-plum-900">opis</p>
                <div className="mt-5 space-y-4 text-lg leading-relaxed text-graphite/80">
                  {l.description.split(/\n{2,}/).map((p, i) => (
                    <p key={i} className="whitespace-pre-line">{p}</p>
                  ))}
                </div>
              </div>
            )}
            {l.features?.length ? (
              <div>
                <p className="eyebrow text-plum-900">atuty</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {l.features.map((f) => (
                    <li key={f} className="rounded-full border border-graphite/15 px-4 py-2 text-sm font-semibold">{f}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      )}
      <section className="bg-pearl py-20 text-graphite">
        <div className="mx-auto grid max-w-7xl gap-16 px-5 md:px-10 lg:grid-cols-[1fr_1fr]">
          <dl className="grid grid-cols-2 gap-px self-start overflow-hidden rounded-[2rem] bg-graphite/15 [&>*:last-child:nth-child(odd)]:col-span-2">
            {facts.map(([k, v]) => (
              <div key={k} className="bg-pearl p-6">
                <dt className="text-sm font-semibold text-graphite/60">{k}</dt>
                <dd className="mt-2 font-display text-2xl tabular-nums text-plum-900">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="rounded-[2rem] bg-white p-8 text-graphite shadow-[0_20px_60px_rgba(42,42,45,0.08)] md:p-10">
            <p className="eyebrow text-plum-900">zapytaj o ofertę</p>
            <p className="mt-3 font-display text-3xl">Umówmy prezentację</p>
            <p className="mt-2 mb-8 text-sm text-graphite/60">lub zadzwoń: <a href={contact.phoneHref} className="text-plum-900">{contact.phone}</a></p>
            <ContactForm topic="oferta" subject={`Prezentacja: ${l.title}`} heading={false} />
          </div>
        </div>
      </section>
    </>
  );
}
