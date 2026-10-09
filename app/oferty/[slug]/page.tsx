import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Arrow from "@/components/Arrow";
import ContactForm from "@/components/ContactForm";
import FloorPlan from "@/components/FloorPlan";
import { contact, floorLabel, formatArea, formatPrice, listings, pricePerM2, roomsLabel } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listings.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const l = listings.find((x) => x.slug === slug);
  return l ? { title: `${l.title}, ${l.district}` } : {};
}

export default async function Oferta({ params }: Props) {
  const { slug } = await params;
  const l = listings.find((x) => x.slug === slug);
  if (!l) notFound();
  const facts = [
    ["Cena", formatPrice(l)],
    ["Cena za m²", pricePerM2(l)],
    ["Powierzchnia", formatArea(l.area)],
    ["Pokoje", roomsLabel(l.rooms)],
    ["Piętro", floorLabel(l.floor)],
    ["Rok budowy", l.year ? String(l.year) : null],
    ["Lokalizacja", `${l.district}, ${l.city}`],
    ["Transakcja", l.deal === "sprzedaz" ? "Sprzedaż" : "Wynajem"],
  ].filter((f): f is [string, string] => Boolean(f[1]));

  return (
    <>
      <section className="bg-pearl pt-32 pb-16">
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <Link href="/oferty" className="eyebrow text-plum-900 hover:text-plum-700"><Arrow dir="left" /> Wszystkie oferty</Link>
          <div className="mt-8 grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="eyebrow text-plum-900">{l.district} · {l.city}</p>
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
        </div>
      </section>
      <section className="bg-pearl py-20 text-graphite">
        <div className="mx-auto grid max-w-7xl gap-16 px-5 md:px-10 lg:grid-cols-[1fr_1fr]">
          <dl className="grid grid-cols-2 gap-px self-start overflow-hidden rounded-[2rem] bg-graphite/15">
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
            <ContactForm subject={l.title} />
          </div>
        </div>
      </section>
    </>
  );
}
