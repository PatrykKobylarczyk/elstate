import type { Metadata } from "next";
import Link from "next/link";
import Arrow from "@/components/Arrow";
import HeroDrawing from "@/components/HeroDrawing";
import ListingCard from "@/components/ListingCard";
import OffersFilters from "@/components/OffersFilters";
import { categories, contact } from "@/lib/data";
import { districtsOf, getListings } from "@/lib/listings";
import { filterOffers, sorts, type OfferQuery } from "@/lib/offers-filter";
import { visitorRegion } from "@/lib/region";

export const metadata: Metadata = {
  title: "Oferty",
  description: "Mieszkania, domy, działki i lokale na sprzedaż i wynajem w Łodzi i Trójmieście. Aktualne oferty Elstate.",
};

const KEYS = ["transakcja", "kategoria", "lokalizacja", "cenaOd", "cenaDo", "metrazOd", "pokoje", "sort"] as const;
const pln = new Intl.NumberFormat("pl-PL");

function offersLabel(n: number) {
  if (n === 1) return "oferta";
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? "oferty" : "ofert";
}

function without(q: OfferQuery, key: keyof OfferQuery) {
  const qs = new URLSearchParams(Object.entries({ ...q, [key]: "" }).filter(([, v]) => v) as [string, string][]).toString();
  return qs ? `/oferty?${qs}` : "/oferty";
}

// czytelne etykiety aktywnych filtrów (do zdejmowania jednym kliknięciem)
function activeChips(q: OfferQuery) {
  const chips: { key: keyof OfferQuery; label: string }[] = [];
  if (q.transakcja) chips.push({ key: "transakcja", label: q.transakcja === "wynajem" ? "Wynajem" : "Kupno" });
  if (q.kategoria) chips.push({ key: "kategoria", label: categories.find((c) => c.value === q.kategoria)?.label ?? q.kategoria });
  if (q.lokalizacja) chips.push({ key: "lokalizacja", label: q.lokalizacja });
  if (q.cenaOd) chips.push({ key: "cenaOd", label: `od ${pln.format(Number(q.cenaOd) || 0)} zł` });
  if (q.cenaDo) chips.push({ key: "cenaDo", label: `do ${pln.format(Number(q.cenaDo) || 0)} zł` });
  if (q.metrazOd) chips.push({ key: "metrazOd", label: `od ${q.metrazOd} m²` });
  if (q.pokoje) chips.push({ key: "pokoje", label: q.pokoje === "4" ? "4+ pokoje" : `${q.pokoje} pok.` });
  if (q.sort) chips.push({ key: "sort", label: sorts.find((s) => s.value === q.sort)?.label ?? q.sort });
  return chips;
}

export default async function Oferty({ searchParams }: { searchParams: Promise<OfferQuery & { panorama?: string }> }) {
  const sp = await searchParams;
  const query: OfferQuery = Object.fromEntries(KEYS.map((k) => [k, typeof sp[k] === "string" ? sp[k] : undefined]).filter(([, v]) => v));
  const [listings, region] = await Promise.all([getListings(), visitorRegion(sp.panorama)]);
  const districts = districtsOf(listings);
  const results = filterOffers(listings, query);
  const chips = activeChips(query);
  const sale = listings.filter((l) => l.deal === "sprzedaz").length;

  return (
    <>
      {/* HERO: fiolet ze złotą panoramą, jak na stronie głównej, tylko niższy */}
      <section className="relative isolate overflow-hidden bg-plum-900 pb-28 pt-36 text-pearl md:pb-40 md:pt-48">
        <HeroDrawing
          region={region}
          className="absolute inset-x-0 bottom-0 -z-10 h-[70%] [mask-image:linear-gradient(to_right,rgba(0,0,0,0.15),rgba(0,0,0,0.35)_45%,black_75%)]"
        />
        <div className="mx-auto max-w-[96rem] px-5 md:px-10">
          <p className="eyebrow animate-rise text-gold-300">oferty · Łódź i Trójmiasto</p>
          <div className="mt-6 flex flex-col gap-10 md:gap-14">
            <h1 className="max-w-[12ch] animate-rise font-display text-[clamp(3rem,7.5vw,7.5rem)] leading-[0.95] [animation-delay:120ms] lg:text-[clamp(3.2rem,min(6.2vw,10.5vh),7rem)]">
              Znajdź swoje <em className="text-gold-400">miejsce.</em>
            </h1>
            <dl className="flex animate-rise gap-10 border-t border-pearl/15 pt-8 [animation-delay:220ms] sm:self-start md:gap-16">
              <div>
                <dd className="font-display text-5xl tabular-nums md:text-6xl">{listings.length}</dd>
                <dt className="mt-2 text-sm text-pearl/60">{offersLabel(listings.length)} w portfelu</dt>
              </div>
              <div>
                <dd className="font-display text-5xl tabular-nums md:text-6xl">{sale}</dd>
                <dt className="mt-2 text-sm text-pearl/60">na sprzedaż</dt>
              </div>
              <div>
                <dd className="font-display text-5xl tabular-nums md:text-6xl">{listings.length - sale}</dd>
                <dt className="mt-2 text-sm text-pearl/60">na wynajem</dt>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="min-h-[60vh] bg-mist pb-28 text-graphite md:pb-40">
        <div className="mx-auto max-w-[96rem] px-3 md:px-10">
          {/* filtry nachodzą na hero */}
          <div className="relative z-10 -mt-14 md:-mt-16">
            <OffersFilters key={JSON.stringify(query)} query={query} districts={districts} />
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 px-2 md:mt-16 md:px-0">
            <p className="font-display text-2xl text-plum-900 md:text-3xl" aria-live="polite">
              <span className="tabular-nums">{results.length}</span> {offersLabel(results.length)}
              {chips.length > 0 && <span className="text-graphite/45"> z {listings.length}</span>}
            </p>
            {chips.length > 0 && (
              <ul className="flex flex-wrap items-center gap-2">
                {chips.map((c) => (
                  <li key={c.key}>
                    <Link
                      href={without(query, c.key)}
                      scroll={false}
                      aria-label={`Usuń filtr: ${c.label}`}
                      className="group inline-flex items-center gap-2 rounded-full border border-plum-900/20 bg-pearl py-1.5 pl-4 pr-2 text-sm text-plum-900 transition-colors hover:border-plum-900"
                    >
                      {c.label}
                      <span aria-hidden className="grid size-5 place-items-center rounded-full bg-plum-900/10 text-xs transition-colors group-hover:bg-plum-900 group-hover:text-pearl">✕</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/oferty" scroll={false} className="px-2 text-sm text-graphite/60 underline-offset-4 hover:text-plum-900 hover:underline">
                    Wyczyść
                  </Link>
                </li>
              </ul>
            )}
          </div>

          {results.length ? (
            <ul data-results className="mt-8 grid gap-x-6 gap-y-14 px-2 transition-opacity sm:grid-cols-2 md:px-0 xl:grid-cols-3">
              {results.map((l) => (
                <li key={l.slug} data-cursor="Zobacz" className="flex">
                  <ListingCard listing={l} />
                </li>
              ))}
            </ul>
          ) : (
            <div data-results className="mt-8 rounded-[2rem] border border-graphite/10 bg-pearl px-6 py-16 text-center md:py-24">
              <p className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-[1.05] text-plum-900">
                Nic tu jeszcze <em>nie pasuje.</em>
              </p>
              <p className="mx-auto mt-4 max-w-md leading-relaxed text-graphite/65">
                Spróbuj poluzować filtry albo powiedz nam, czego szukasz. Część nieruchomości sprzedajemy dyskretnie, bez ogłoszeń.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/oferty" scroll={false} className="btn-ghost text-plum-900">Pokaż wszystkie</Link>
                <Link href="/#kontakt" data-topic="szukam" className="btn-primary">Opisz, czego szukasz <Arrow /></Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA: poszukiwanie na zlecenie */}
      <section className="bg-pearl py-24 md:py-36">
        <div className="mx-auto grid max-w-[96rem] gap-10 px-5 md:px-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow text-plum-900">szukamy dla Ciebie</p>
            <h2 className="mt-6 font-display text-[clamp(2.4rem,5vw,5rem)] leading-[0.98] text-graphite">
              Nie widzisz swojego <em className="text-plum-900">adresu?</em>
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-graphite/65">
              Opisz nam, czego szukasz. Damy znać, zanim oferta trafi na portale, także o tych, które sprzedajemy po cichu.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/#kontakt" data-topic="szukam" className="btn-primary" data-cursor="Napisz">Opisz, czego szukasz <Arrow /></Link>
            <a href={contact.phoneHref} className="btn-ghost text-plum-900">{contact.phone}</a>
          </div>
        </div>
      </section>
    </>
  );
}
