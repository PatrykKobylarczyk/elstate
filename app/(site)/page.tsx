import Image from "next/image";
import Link from "next/link";
import Arrow from "@/components/Arrow";
import ContactForm from "@/components/ContactForm";
import FloorPlan from "@/components/FloorPlan";
import HeroDrawing from "@/components/HeroDrawing";
import ListingCard from "@/components/ListingCard";
import MortgageCalculator from "@/components/MortgageCalculator";
import SearchBar from "@/components/SearchBar";
import { districtsOf, getListings } from "@/lib/listings";
import { visitorRegion } from "@/lib/region";
import { contact, formatArea, formatPrice, markets, marquee, media, process, roomsLabel, services, team, values } from "@/lib/data";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("");
}

export default async function Home({ searchParams }: { searchParams: Promise<{ panorama?: string }> }) {
  const region = await visitorRegion((await searchParams).panorama);
  const listings = await getListings();
  const featured = listings.find((l) => l.featured) ?? listings[0];
  const stats = [
    { value: listings.length, label: "aktualnych ofert" },
    { value: process.length, label: "kroków do kluczy" },
    { value: markets.length, label: "rynki: Łódź i Trójmiasto" },
  ];

  return (
    <>
      {/* HERO: film albo złota panorama Łodzi na fiolecie */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-plum-900 text-pearl">
        {media.heroVideo ? (
          <video className="absolute inset-0 -z-10 h-full w-full object-cover" src={media.heroVideo} poster={media.heroPoster} autoPlay muted loop playsInline />
        ) : (
          <HeroDrawing region={region} className="relative -z-10 mt-24 h-[32svh] w-full lg:absolute lg:inset-x-0 lg:bottom-[11rem] lg:mt-0 lg:h-auto lg:[mask-image:linear-gradient(to_right,rgba(0,0,0,0.2),rgba(0,0,0,0.3)_40%,black_62%)]" />
        )}
        
        <div className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col justify-end px-5 pt-4 pb-10 md:px-10 lg:justify-center lg:pt-[max(6rem,13vh)] lg:pb-[3vh]" data-hero-fade>
          <p className="eyebrow animate-rise text-gold-300">butikowa agencja nieruchomości · Łódź</p>
          <h1 className="mt-6 max-w-[14ch] animate-rise font-display text-[clamp(2.8rem,7vw,7.5rem)] lg:mt-[2.5vh] lg:text-[clamp(3.2rem,min(6.2vw,10.5vh),7rem)] leading-[0.95] text-pearl [animation-delay:120ms]">
            Sprzedajemy <em className="text-gold-400">przestrzeń,</em> która ma znaczenie.
          </h1>
          <p className="mt-8 max-w-md animate-rise text-base leading-relaxed text-pearl/75 [animation-delay:220ms] md:text-lg lg:mt-[3.5vh]">
            Strategia, obraz i negocjacje w jednych rękach. Twoja nieruchomość dostaje własną historię, a Ty spokój.
          </p>
          <div className="mt-10 flex animate-rise flex-wrap gap-3 [animation-delay:300ms] lg:mt-[4vh]">
            <Link href="/oferty" className="btn-light" data-cursor="Oferty">Zobacz oferty <Arrow /></Link>
            <Link href="/#kontakt" data-topic="wycena" className="btn-ghost text-pearl">Otrzymaj wycenę</Link>
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[96rem] px-3 pb-6 md:px-10 md:pb-10 lg:pb-[4vh]">
          <SearchBar districts={districtsOf(listings)} />
        </div>
      </section>

      {/* TAŚMA */}
      <section aria-label="Usługi w skrócie" className="marquee-host overflow-hidden border-y border-graphite/10 bg-pearl py-6">
        <div className="marquee">
          {[0, 1].map((k) => (
            <ul key={k} aria-hidden={k === 1} className="flex shrink-0 items-center">
              {marquee.map((m) => (
                <li key={m} className="flex items-center gap-8 pr-8 font-display text-3xl text-graphite md:text-5xl">
                  {m}
                  <span aria-hidden className="size-2 rounded-full bg-gold-500" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* O NAS */}
      <section id="o-nas" className="bg-pearl py-36 md:py-60">
        <div className="mx-auto max-w-[96rem] px-5 md:px-10">
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
            <p className="eyebrow text-plum-900">o nas</p>
            <div>
              <p data-words className="font-display text-[clamp(1.9rem,3.6vw,3.8rem)] leading-[1.1] text-graphite">
                W świecie pełnym ogłoszeń wygrywa obraz. Każdą nieruchomość traktujemy jak premierę: najpierw strategia i cena, potem
                zdjęcia, film i kampania, która trafia do właściwych ludzi.
              </p>
              <ul className="mt-12 flex flex-wrap gap-2">
                {values.map((v) => (
                  <li key={v} className="rounded-full border border-graphite/15 px-5 py-2.5 text-sm">{v}</li>
                ))}
              </ul>
            </div>
          </div>
          <dl className="mt-24 grid gap-10 border-t border-graphite/10 pt-12 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span data-count={s.value} className="block font-display text-7xl tabular-nums text-plum-900 md:text-8xl">{s.value}</span>
                  <span className="mt-3 block text-graphite/60">{s.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* OFERTY: przypięta sekcja przewijana w poziomie */}
      <section id="oferty" data-hscroll className="relative bg-mist">
        <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden md:h-screen">
          <div data-track className="flex w-max gap-4 px-5 will-change-transform md:gap-6 md:px-10">
            <div className="flex w-[78vw] shrink-0 flex-col justify-between md:w-[30vw]">
              <div>
                <p className="eyebrow text-plum-900">oferty</p>
                <h2 className="mt-6 font-display text-[clamp(2.6rem,5vw,5.5rem)] leading-[0.95] text-graphite">
                  Wybrane <em className="text-plum-900">adresy</em>
                </h2>
                <p className="mt-6 max-w-sm leading-relaxed text-graphite/65">Od kamienic w Śródmieściu po nowe osiedla. Przewiń, aby zobaczyć kolejne.</p>
              </div>
              <Link href="/oferty" className="btn-ghost mt-10 self-start">Wszystkie oferty <Arrow /></Link>
            </div>
            {listings.map((l) => (
              <div key={l.slug} className="w-[78vw] shrink-0 md:w-[28vw]" data-cursor="Zobacz">
                <ListingCard listing={l} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USŁUGI: jedyny pełny blok fioletu */}
      <section id="uslugi" className="bg-plum-900 py-28 text-pearl md:py-40">
        <div className="mx-auto max-w-[96rem] px-5 md:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow text-gold-300">usługi</p>
              <h2 className="mt-6 font-display text-[clamp(2.4rem,5.2vw,5.5rem)] leading-[0.98]">
                Każda nieruchomość ma swoją <em className="text-gold-300">scenę.</em>
              </h2>
            </div>
            <p className="max-w-sm leading-relaxed text-pearl/65 lg:justify-self-end">My ją dla Ciebie tworzymy. Wybierz pojedynczą usługę albo oddaj nam całość.</p>
          </div>
          <ul className="mt-20 border-t border-pearl/15">
            {services.map((s) => (
              <li key={s.title} data-reveal className="group relative overflow-hidden border-b border-pearl/15">
                <span aria-hidden className="absolute inset-0 origin-bottom scale-y-0 bg-pearl transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100" />
                <div className="relative grid gap-3 px-1 py-8 transition-colors duration-500 group-hover:text-plum-900 md:grid-cols-[1.1fr_1fr_auto] md:items-center md:gap-10 md:px-6 md:py-10">
                  <h3 className="font-display text-3xl md:text-5xl">{s.title}</h3>
                  <p className="max-w-md leading-relaxed text-pearl/65 transition-colors group-hover:text-graphite/75">{s.text}</p>
                  <span aria-hidden className="hidden size-12 place-items-center rounded-full border border-current/25 text-xl transition-transform duration-500 group-hover:rotate-45 md:grid"><Arrow /></span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FILM / SPACER 3D */}
      <section className="bg-pearl px-3 pt-12 md:px-10 md:pt-20">
        <div className="relative isolate mx-auto h-[85svh] max-w-[91rem] min-h-[32rem] overflow-hidden rounded-[2rem] bg-graphite text-pearl md:rounded-[2.5rem]">
          {media.showreel ? (
            // film jest pionowy, więc na szerokim panelu widać środek kadru
            <video
              className="absolute inset-x-0 -top-[15%] -z-10 h-[130%] w-full object-cover"
              data-parallax="0.15"
              src={media.showreel}
              poster={media.showreelPoster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="absolute inset-0 -z-10">
              <div className="absolute left-1/2 top-1/2 w-[min(1200px,150vw)] -translate-x-1/2 -translate-y-1/2 text-pearl/25" data-parallax="0.18">
                <FloorPlan rooms={4} area={95} seed="film" className="w-full" gapClass="stroke-graphite" />
              </div>
            </div>
          )}
          <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(42,42,45,0.94),rgba(42,42,45,0.55)_28%,rgba(42,42,45,0)_52%)]" />
          <div className="flex h-full flex-col justify-end p-6 md:p-14">
            <p className="eyebrow text-gold-300">film · fotografia · spacer 3D</p>
            <h2 data-reveal className="mt-6 max-w-5xl font-display text-[clamp(2.4rem,5.6vw,6rem)] leading-[0.98]">
              Kupujący poznaje dom, <em className="text-gold-300">zanim przekroczy próg.</em>
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-pearl/70">Ujęcia z drona, krótkie formy do social mediów i spacer w 4K w standardzie każdej sprzedaży.</p>
          </div>
        </div>
      </section>

      {/* PROCES — kolejność ma znaczenie, stąd numeracja */}
      <section id="proces" className="bg-pearl py-36 md:py-56">
        <div className="mx-auto grid max-w-[96rem] gap-16 px-5 md:px-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="eyebrow text-plum-900">proces</p>
            <h2 className="mt-6 font-display text-[clamp(2.4rem,4.8vw,5rem)] leading-[0.98]">
              Sześć kroków <em className="text-plum-900">do kluczy</em>
            </h2>
            <p className="mt-6 max-w-sm leading-relaxed text-graphite/65">Na każdym etapie wiesz, co się dzieje i co będzie dalej.</p>
          </div>
          <ol className="relative pl-10 md:pl-16">
            <span aria-hidden className="absolute left-0 top-0 h-full w-px bg-graphite/12 md:left-1.5" />
            <span aria-hidden data-progress className="absolute left-0 top-0 h-full w-px bg-plum-900 md:left-1.5" />
            {process.map((p, i) => (
              <li key={p.title} data-reveal className="relative pb-14 last:pb-0">
                <span aria-hidden className="absolute -left-[1.85rem] top-1.5 size-3 rounded-full border border-plum-900 bg-pearl md:-left-[2.75rem]" />
                <span className="text-sm tabular-nums text-graphite/50">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 font-display text-3xl md:text-4xl">{p.title}</h3>
                <p className="mt-3 max-w-lg leading-relaxed text-graphite/65">{p.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* RYNKI */}
      <section className="bg-pearl px-3 pb-3 md:px-4 md:pb-4">
        {/* subgrid: nazwy miast, opisy i przyciski w obu kaflach stoją na tych samych wysokościach */}
        <div className="grid gap-3 md:grid-cols-2 md:grid-rows-[1fr_auto_auto_auto] md:gap-x-4 md:gap-y-0">
          {markets.map((m) => {
            const active = m.status === "Działamy";
            return (
              <article key={m.city} data-reveal="clip" className={`group flex min-h-[30rem] flex-col justify-between overflow-hidden md:row-span-4 md:grid md:grid-rows-subgrid md:gap-y-6 rounded-[2rem] p-8 md:rounded-[2.5rem] md:p-12 ${active ? "bg-plum-900 text-pearl" : "bg-mist text-graphite"}`}>
                <span className={`self-start justify-self-start rounded-full px-6 py-2.5 text-sm ${active ? "bg-pearl text-plum-900" : "border border-graphite/20"}`}>{m.status}</span>
                <div className="mt-10 md:contents">
                  <h3 className="font-display text-[clamp(3.2rem,7vw,7.5rem)] leading-none transition-transform duration-700 group-hover:-translate-y-2">{m.city}</h3>
                  <p className="mt-6 max-w-md leading-relaxed opacity-70 md:mt-0">{m.text}</p>
                  <div>
                  <Link href={`/oferty?miasto=${encodeURIComponent(m.city)}`} className={`${active ? "btn-light" : "btn-primary"} mt-6 md:mt-0`} data-cursor="Oferty">
                    Zobacz oferty <Arrow />
                  </Link>
                  <ul className="mt-8 flex flex-wrap gap-2">
                    {m.areas.map((a) => (
                      <li key={a} className="rounded-full border border-current/20 px-5 py-2.5 text-sm opacity-80">{a}</li>
                    ))}
                  </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* FINANSE */}
      <section id="finanse" className="bg-mist py-36 md:py-56">
        <div className="mx-auto grid max-w-[96rem] gap-12 px-5 md:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="eyebrow text-plum-900">finanse</p>
            <h2 className="mt-6 font-display text-[clamp(2.4rem,4.4vw,4.6rem)] leading-[1]">
              Kredyt bez <em className="text-plum-900">zgadywania.</em>
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-graphite/65">Sprawdź orientacyjną ratę. Umówimy Cię z doradcą kredytowym, który znajdzie najlepszą ofertę.</p>
            <Link href="/#kontakt" data-topic="kredyt" className="btn-primary mt-10">Umów konsultację</Link>
          </div>
          <MortgageCalculator initialPrice={featured.price} />
        </div>
      </section>

      {/* ZESPÓŁ */}
      <section id="zespol" className="bg-pearl py-36 md:py-56">
        <div className="mx-auto max-w-[96rem] px-5 md:px-10">
          <p className="eyebrow text-plum-900">zespół</p>
          <h2 className="mt-6 font-display text-[clamp(2.4rem,4.8vw,5rem)] leading-[0.98]">Poznajmy się.</h2>
          <div className="mt-16 grid gap-10 md:grid-cols-2">
            {team.map((m, i) => (
              <article key={m.name} data-reveal className={i === 1 ? "md:mt-24" : ""}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-mist">
                  {m.photo ? (
                    <div className="absolute inset-x-0 -inset-y-[10%]" data-parallax="0.08">
                      <Image src={m.photo} alt={m.name} fill className="object-cover" sizes="(min-width: 768px) 45vw, 100vw" />
                    </div>
                  ) : (
                    <span className="absolute inset-0 grid place-items-center font-display text-[9rem] text-plum-900/80">{initials(m.name)}</span>
                  )}
                </div>
                <h3 className="mt-6 font-display text-3xl md:text-4xl">{m.name}</h3>
                <p className="mt-1 text-graphite/60">{m.role}</p>
                <p className="mt-4 max-w-md leading-relaxed text-graphite/75">{m.bio}</p>
                <p className="mt-4 flex flex-wrap gap-2 text-sm tabular-nums">
                  <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="rounded-full border border-graphite/15 px-4 py-2 hover:border-plum-900">{m.phone}</a>
                  <a href={`mailto:${m.email}`} className="rounded-full border border-graphite/15 px-4 py-2 hover:border-plum-900">{m.email}</a>
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* KONTAKT */}
      <section id="kontakt" className="bg-pearl p-3 md:p-4">
        <div className="grid gap-12 rounded-[2rem] bg-plum-900 px-6 py-16 text-pearl md:rounded-[2.5rem] md:px-14 md:py-24 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-gold-300">kontakt</p>
            <h2 className="mt-6 font-display text-[clamp(2.6rem,5.2vw,5.6rem)] leading-[0.98]">
              Twoja nieruchomość zasługuje na <em className="text-gold-300">dobrą historię.</em>
            </h2>
            <dl className="mt-12 grid gap-6 text-lg sm:grid-cols-2">
              <div><dt className="text-sm text-pearl/55">telefon</dt><dd className="mt-1"><a href={contact.phoneHref} className="hover:text-gold-300">{contact.phone}</a></dd></div>
              <div><dt className="text-sm text-pearl/55">e-mail</dt><dd className="mt-1"><a href={`mailto:${contact.email}`} className="hover:text-gold-300">{contact.email}</a></dd></div>
            </dl>
            <Link href={`/oferty/${featured.slug}`} className="mt-12 flex items-center gap-5 rounded-[1.5rem] bg-pearl/10 p-4 transition-colors hover:bg-pearl/15" data-cursor="Zobacz">
              <div className="w-28 shrink-0 rounded-[1rem] bg-pearl p-2 text-graphite">
                <FloorPlan rooms={featured.rooms} area={featured.area} seed={featured.slug} className="w-full" gapClass="stroke-pearl" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-pearl/60">oferta wyróżniona</p>
                <p className="mt-1 font-display text-xl leading-tight">{featured.title}</p>
                <p className="mt-1 text-sm text-pearl/60">
                  {formatArea(featured.area)} · {roomsLabel(featured.rooms)} · {formatPrice(featured)}
                </p>
              </div>
            </Link>
          </div>
          <div className="rounded-[1.75rem] bg-pearl p-6 text-graphite md:p-10">
            <ContactForm topic="wycena" live />
          </div>
        </div>
      </section>
    </>
  );
}
