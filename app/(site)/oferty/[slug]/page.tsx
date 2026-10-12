import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Arrow from "@/components/Arrow";
import ContactForm from "@/components/ContactForm";
import FloorPlan from "@/components/FloorPlan";
import ListingCard from "@/components/ListingCard";
import MortgageCalculator from "@/components/MortgageCalculator";
import Gallery, { OpenGallery } from "@/components/offer/Gallery";
import ShareButton from "@/components/offer/ShareButton";
import StickyBar from "@/components/offer/StickyBar";
import { getListing, getListings } from "@/lib/listings";
import { contact, floorLabel, formatArea, formatPrice, pricePerM2, roomsLabel, team } from "@/lib/data";

const kind: Record<string, string> = { mieszkania: "Mieszkanie", domy: "Dom", dzialki: "Działka", lokale: "Lokal" };

type Props = { params: Promise<{ slug: string }> };

// strona odświeża się sama po zapisie oferty w CRM (revalidatePath), a dodatkowo co 10 minut
export const revalidate = 600;

export async function generateStaticParams() {
  return (await getListings()).map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const l = await getListing(slug);
  if (!l) return {};
  const description = `${formatArea(l.area)}, ${roomsLabel(l.rooms)}, ${l.district}, ${l.city}. ${formatPrice(l)}.`;
  return {
    title: `${l.title}, ${l.district}`,
    description,
    openGraph: { title: l.title, description, images: l.image ? [l.image] : undefined },
  };
}

export default async function Oferta({ params }: Props) {
  const { slug } = await params;
  const all = await getListings();
  const l = all.find((x) => x.slug === slug);
  if (!l) notFound();

  const images = l.images?.length ? l.images : l.image ? [l.image] : [];
  const hasPhoto = images.length > 0;
  const perM2 = pricePerM2(l);
  const floor = l.floorsTotal ? `${floorLabel(l.floor)} z ${l.floorsTotal}` : floorLabel(l.floor);
  const deal = l.deal === "sprzedaz" ? "Sprzedaż" : "Wynajem";
  const agent = team.find((t) => t.email === l.agentEmail) ?? team[0];
  const paragraphs = l.description?.split(/\n{2,}/).filter(Boolean) ?? [];
  const place = [l.street, l.district, l.city].filter(Boolean).join(", ");
  const mapQuery = encodeURIComponent([l.street, l.district, l.city].filter(Boolean).join(", "));
  const similar = all
    .filter((x) => x.slug !== l.slug && x.deal === l.deal)
    .sort((a, b) => Number(b.district === l.district) - Number(a.district === l.district) || Math.abs(a.price - l.price) - Math.abs(b.price - l.price))
    .slice(0, 3);

  // duże liczby pod hero
  const stats = [
    { value: l.area.toLocaleString("pl-PL"), unit: "m²", label: "powierzchnia" },
    { value: String(l.rooms), unit: "", label: l.rooms === 1 ? "pokój" : l.rooms < 5 ? "pokoje" : "pokoi" },
    { value: l.floor === 0 ? "0" : String(l.floor), unit: l.floorsTotal ? `/${l.floorsTotal}` : "", label: l.floor === 0 ? "parter" : "piętro" },
    l.year ? { value: String(l.year), unit: "", label: "rok budowy" } : null,
  ].filter((s): s is { value: string; unit: string; label: string } => Boolean(s));

  const facts = [
    ["Transakcja", deal],
    ["Rodzaj", kind[l.category] ?? l.category],
    ["Cena", formatPrice(l)],
    ["Cena za m²", perM2],
    ["Powierzchnia", formatArea(l.area)],
    ["Pokoje", roomsLabel(l.rooms)],
    ["Piętro", floor],
    ["Rok budowy", l.year ? String(l.year) : null],
    ["Lokalizacja", place],
  ].filter((f): f is [string, string] => Boolean(f[1]));

  return (
    <>
      {/* HERO: zdjęcie na cały ekran albo złoty rzut na fiolecie */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-plum-950 text-pearl">
        {hasPhoto ? (
          <div className="absolute inset-x-0 -top-[8%] -z-10 h-[116%]" data-parallax="-0.12">
            <Image src={images[0]} alt={l.title} fill priority className="animate-[offer-zoom_2.4s_cubic-bezier(0.16,1,0.3,1)_both] object-cover" sizes="100vw" />
          </div>
        ) : (
          <div aria-hidden className="absolute inset-0 -z-10 bg-plum-900">
            <div className="absolute right-[-10%] top-[8%] w-[min(1100px,112vw)] text-gold-500/35 md:right-[-4%] md:top-[14%] md:w-[min(1000px,58vw)]" data-depth="14">
              <FloorPlan rooms={l.rooms} area={l.area} seed={l.slug} className="w-full" gapClass="stroke-plum-900" />
            </div>
          </div>
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(29,4,18,0.95),rgba(29,4,18,0.55)_38%,rgba(29,4,18,0.1)_65%,rgba(29,4,18,0.45))]" />

        <div className="mx-auto mt-auto w-full max-w-[96rem] px-5 pb-8 pt-32 md:px-10 md:pb-12">
          <div className="flex animate-rise flex-wrap items-center gap-2">
            <Link href="/oferty" className="mr-2 inline-flex items-center gap-2 text-sm text-pearl/70 transition-colors hover:text-pearl">
              <Arrow dir="left" /> Oferty
            </Link>
            <span className="rounded-full bg-pearl px-3.5 py-1.5 text-xs font-semibold text-plum-900">{deal}</span>
            {l.reserved && <span className="rounded-full bg-gold-500 px-3.5 py-1.5 text-xs font-semibold text-plum-950">Rezerwacja</span>}
            <span className="rounded-full border border-pearl/25 px-3.5 py-1.5 text-xs text-pearl/85">{[l.district, l.city].filter(Boolean).join(" · ")}</span>
          </div>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <h1 className="max-w-[16ch] animate-rise font-display text-[clamp(2.6rem,6.4vw,6.5rem)] leading-[0.95] [animation-delay:120ms] lg:text-[clamp(3rem,min(6vw,10vh),6.5rem)]">
              {l.title}
            </h1>
            <div className="animate-rise [animation-delay:220ms] lg:text-right">
              <p className="font-display text-[clamp(2.2rem,4vw,3.6rem)] leading-none tabular-nums text-gold-300">{formatPrice(l)}</p>
              {perM2 && <p className="mt-2 text-sm tabular-nums text-pearl/60">{perM2}</p>}
            </div>
          </div>
          <div className="mt-10 flex animate-rise flex-wrap items-center justify-between gap-4 border-t border-pearl/15 pt-6 [animation-delay:300ms]">
            <ul className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-pearl/80 md:text-base">
              <li>{formatArea(l.area)}</li>
              <li>{roomsLabel(l.rooms)}</li>
              <li>{floor}</li>
              {l.year && <li>rok {l.year}</li>}
            </ul>
            <div className="flex flex-wrap gap-2">
              {images.length > 0 && (
                <OpenGallery className="btn-light py-3">
                  {images.length > 1 ? `Zobacz ${images.length} zdjęć` : "Powiększ zdjęcie"}
                </OpenGallery>
              )}
              <ShareButton title={l.title} className="btn-ghost py-3 text-pearl" />
            </div>
          </div>
        </div>
      </section>

      {/* LICZBY */}
      <section className="border-b border-graphite/10 bg-pearl text-graphite">
        <dl className="mx-auto grid max-w-[96rem] grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} data-reveal className={`px-5 py-10 md:px-10 md:py-14 ${i % 2 ? "border-l" : ""} ${i >= 2 ? "border-t md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""} border-graphite/10`}>
              <dt className="text-sm text-graphite/55">{s.label}</dt>
              <dd className="mt-3 font-display text-[clamp(2.8rem,5.5vw,5.5rem)] leading-none tabular-nums text-plum-900">
                {s.value}
                {s.unit && <span className="ml-1 text-[0.4em] text-graphite/45">{s.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* OPIS + ATUTY */}
      <section className="bg-pearl py-24 text-graphite md:py-36">
        <div className="mx-auto grid max-w-[96rem] gap-12 px-5 md:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-36 lg:self-start">
            <p className="eyebrow text-plum-900">o nieruchomości</p>
            <h2 className="mt-6 font-display text-[clamp(2.2rem,4vw,4rem)] leading-[1]">
              Wszystko, co <em className="text-plum-900">warto wiedzieć.</em>
            </h2>
            <dl className="mt-10 divide-y divide-graphite/10 border-y border-graphite/10">
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-6 py-3.5">
                  <dt className="text-sm text-graphite/55">{k}</dt>
                  <dd className="text-right font-medium tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            {paragraphs.length > 0 ? (
              <div className="space-y-6">
                <p data-words className="font-display text-[clamp(1.6rem,2.6vw,2.4rem)] leading-[1.2]">{paragraphs[0]}</p>
                {paragraphs.slice(1).map((p, i) => (
                  <p key={i} className="whitespace-pre-line text-lg leading-relaxed text-graphite/75">{p}</p>
                ))}
              </div>
            ) : (
              <p data-words className="font-display text-[clamp(1.6rem,2.6vw,2.4rem)] leading-[1.2]">
                {roomsLabel(l.rooms)}, {formatArea(l.area)}, {floor}. {l.district ? `${l.district}, ${l.city}.` : `${l.city}.`} Pełny opis, zdjęcia i rzut
                prześlemy po krótkiej rozmowie. Zapytaj o termin prezentacji.
              </p>
            )}
            {l.features?.length ? (
              <div className="mt-16">
                <p className="eyebrow text-plum-900">atuty</p>
                <ul className="mt-6 grid gap-x-8 sm:grid-cols-2">
                  {l.features.map((f) => (
                    <li key={f} className="flex items-center gap-4 border-b border-graphite/10 py-4 text-lg">
                      <span aria-hidden className="size-2 shrink-0 rounded-full bg-gold-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* GALERIA (tylko gdy jest więcej niż jedno zdjęcie; podgląd działa zawsze) */}
      <section className={images.length > 1 ? "bg-pearl pb-24 md:pb-36" : ""}>
        <div className="mx-auto max-w-[96rem] px-3 md:px-10">
          {images.length > 1 && (
            <div className="mb-8 flex items-end justify-between gap-6 px-2 md:mb-12 md:px-0">
              <h2 className="font-display text-[clamp(2.2rem,4vw,4rem)] leading-[1] text-graphite">
                Zobacz <em className="text-plum-900">wnętrza.</em>
              </h2>
              <OpenGallery className="btn-ghost shrink-0 text-plum-900">Wszystkie zdjęcia ({images.length})</OpenGallery>
            </div>
          )}
          <Gallery images={images} title={l.title} />
        </div>
      </section>

      {/* LOKALIZACJA */}
      <section className="bg-pearl px-3 pb-3 md:px-4 md:pb-4">
        <div className="relative isolate mx-auto grid max-w-[96rem] overflow-hidden rounded-[2rem] bg-plum-900 text-pearl md:rounded-[2.5rem] lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col justify-between gap-10 p-8 md:p-14">
            <div>
              <p className="eyebrow text-gold-300">lokalizacja</p>
              <h2 className="mt-6 font-display text-[clamp(2.4rem,4.4vw,4.4rem)] leading-[1]">
                {l.district || l.city}
                <em className="block text-gold-400">{l.city}</em>
              </h2>
            </div>
            <div>
              {l.street && <p className="text-lg text-pearl/80">{l.street}</p>}
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-pearl/55">Mapa pokazuje okolicę. Dokładny adres podajemy przy umawianiu prezentacji.</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost mt-8 text-pearl"
              >
                Otwórz w Mapach Google <Arrow />
              </a>
            </div>
          </div>
          <div className="relative min-h-[22rem] lg:min-h-[34rem]">
            <iframe
              title={`Mapa: ${place}`}
              src={`https://maps.google.com/maps?q=${mapQuery}&z=14&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full border-0 [filter:grayscale(1)_sepia(0.35)_contrast(1.05)_brightness(0.92)]"
            />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-plum-900/15 mix-blend-multiply" />
          </div>
        </div>
      </section>

      {/* KREDYT (tylko sprzedaż) */}
      {l.deal === "sprzedaz" && (
        <section className="bg-mist py-24 text-graphite md:py-36">
          <div className="mx-auto grid max-w-[96rem] gap-12 px-5 md:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow text-plum-900">finansowanie</p>
              <h2 className="mt-6 font-display text-[clamp(2.2rem,4vw,4rem)] leading-[1]">
                Ile wyniesie <em className="text-plum-900">rata?</em>
              </h2>
              <p className="mt-6 max-w-md leading-relaxed text-graphite/65">Kalkulator startuje od ceny tej nieruchomości. Doradca kredytowy policzy to dokładnie i znajdzie najlepszą ofertę.</p>
              <Link href="/#kontakt" data-topic="kredyt" className="btn-primary mt-10">Umów konsultację</Link>
            </div>
            <MortgageCalculator initialPrice={l.price} />
          </div>
        </section>
      )}

      {/* OPIEKUN + FORMULARZ */}
      <section id="prezentacja" className="scroll-mt-24 bg-pearl p-3 md:p-4">
        <div className="mx-auto grid max-w-[96rem] gap-10 overflow-hidden rounded-[2rem] bg-plum-900 p-6 text-pearl md:rounded-[2.5rem] md:p-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="flex flex-col">
            <p className="eyebrow text-gold-300">opiekun oferty</p>
            <h2 className="mt-6 font-display text-[clamp(2.4rem,4.4vw,4.4rem)] leading-[1]">
              Umówmy <em className="text-gold-400">prezentację.</em>
            </h2>
            <div className="mt-10 flex items-center gap-5">
              {agent.photo && (
                <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-plum-800 md:size-28">
                  <Image src={agent.photo} alt={agent.name} fill className="object-cover" sizes="112px" />
                </div>
              )}
              <div>
                <p className="font-display text-2xl">{agent.name}</p>
                <p className="mt-1 text-sm text-pearl/60">{agent.role}</p>
              </div>
            </div>
            <dl className="mt-10 grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-pearl/55">telefon</dt>
                <dd className="mt-1 text-lg"><a href={`tel:${agent.phone.replace(/\s/g, "")}`} className="hover:text-gold-300">{agent.phone}</a></dd>
              </div>
              <div>
                <dt className="text-sm text-pearl/55">e-mail</dt>
                <dd className="mt-1 text-lg"><a href={`mailto:${agent.email}`} className="hover:text-gold-300">{agent.email}</a></dd>
              </div>
            </dl>
          </div>
          <div className="rounded-[1.5rem] bg-pearl p-6 text-graphite md:p-10">
            <p className="font-display text-3xl">Zapytaj o tę ofertę</p>
            <p className="mt-2 mb-8 text-sm text-graphite/60">Odezwiemy się i zaproponujemy termin. Możesz też zadzwonić: <a href={contact.phoneHref} className="text-plum-900">{contact.phone}</a></p>
            <ContactForm topic="oferta" subject={`Prezentacja: ${l.title}`} heading={false} />
          </div>
        </div>
      </section>

      {/* PODOBNE */}
      {similar.length > 0 && (
        <section className="bg-pearl py-24 text-graphite md:py-36">
          <div className="mx-auto max-w-[96rem] px-5 md:px-10">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="font-display text-[clamp(2.2rem,4vw,4rem)] leading-[1]">
                Może też <em className="text-plum-900">to?</em>
              </h2>
              <Link href={`/oferty?transakcja=${l.deal}`} className="btn-ghost text-plum-900">Wszystkie oferty <Arrow /></Link>
            </div>
            <ul className="mt-12 grid gap-x-6 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
              {similar.map((s) => (
                <li key={s.slug} data-cursor="Zobacz" className="flex">
                  <ListingCard listing={s} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <StickyBar title={l.title} price={formatPrice(l)} phoneHref={`tel:${agent.phone.replace(/\s/g, "")}`} />
    </>
  );
}
