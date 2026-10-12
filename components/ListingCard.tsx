import Link from "next/link";
import Image from "next/image";
import FloorPlan from "./FloorPlan";
import { type Listing, floorLabel, formatArea, formatPrice, pricePerM2, roomsLabel } from "@/lib/data";

export default function ListingCard({ listing: l }: { listing: Listing }) {
  const perM2 = pricePerM2(l);
  return (
    <Link href={`/oferty/${l.slug}`} className="group flex w-full min-w-0 flex-col">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-pearl text-graphite">
        {l.image ? (
          <Image src={l.image} alt={l.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(min-width: 1024px) 33vw, 100vw" />
        ) : (
          <FloorPlan rooms={l.rooms} area={l.area} seed={l.slug} className="absolute inset-0 m-auto h-full w-full p-8 transition-transform duration-700 group-hover:scale-[1.04]" gapClass="stroke-pearl" />
        )}
        <div className="absolute inset-x-4 top-4 flex flex-wrap gap-1.5">
          <span className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${l.deal === "wynajem" ? "bg-graphite text-pearl" : "bg-plum-900 text-pearl"}`}>
            {l.deal === "sprzedaz" ? "Sprzedaż" : "Wynajem"}
          </span>
          {l.reserved && <span className="rounded-full bg-pearl px-3.5 py-1.5 text-xs font-medium text-plum-900">Rezerwacja</span>}
          {l.featured && !l.reserved && <span className="rounded-full bg-gold-500 px-3.5 py-1.5 text-xs font-medium text-plum-950">Polecana</span>}
        </div>
        {(l.images?.length ?? 0) > 1 && (
          <span className="absolute bottom-4 right-4 rounded-full bg-graphite/70 px-3 py-1 text-xs tabular-nums text-pearl backdrop-blur">{l.images!.length} zdjęć</span>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-5">
        <p className="text-sm text-graphite/55">{l.district} · {l.city}</p>
        <h3 className="mt-2 font-display text-[1.6rem] leading-[1.05] text-plum-900 transition-colors group-hover:text-plum-700">{l.title}</h3>
        <dl className="mt-4 grid grid-cols-3 border-y border-graphite/15 py-3 text-sm tabular-nums text-graphite">
          <div><dt className="sr-only">Powierzchnia</dt><dd>{formatArea(l.area)}</dd></div>
          <div><dt className="sr-only">Pokoje</dt><dd>{roomsLabel(l.rooms)}</dd></div>
          <div><dt className="sr-only">Piętro</dt><dd>{floorLabel(l.floor)}</dd></div>
        </dl>
        <div className="mt-4 flex items-baseline justify-between gap-4">
          <span className="font-display text-2xl tabular-nums text-plum-900">{formatPrice(l)}</span>
          {perM2 && <span className="text-xs tabular-nums text-graphite/55">{perM2}</span>}
        </div>
      </div>
    </Link>
  );
}
