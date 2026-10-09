import type { Metadata } from "next";
import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import { categories, listings } from "@/lib/data";

export const metadata: Metadata = { title: "Oferty" };

type Search = { transakcja?: string; kategoria?: string; lokalizacja?: string };

function href(current: Search, patch: Search) {
  const next = { ...current, ...patch };
  const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
  return qs ? `/oferty?${qs}` : "/oferty";
}

function Chip({ active, to, children }: { active: boolean; to: string; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      scroll={false}
      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
        active ? "border-plum-900 bg-plum-900 text-pearl" : "border-graphite/20 hover:border-plum-900 hover:text-plum-900"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function Oferty({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const districts = [...new Set(listings.map((l) => l.district))].sort((a, b) => a.localeCompare(b, "pl"));
  const results = listings.filter(
    (l) =>
      (!sp.transakcja || l.deal === sp.transakcja) &&
      (!sp.kategoria || l.category === sp.kategoria) &&
      (!sp.lokalizacja || l.district === sp.lokalizacja),
  );

  return (
    <>
      <section className="bg-pearl pt-36 pb-16">
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <p className="eyebrow text-plum-900">oferty · Łódź</p>
          <h1 className="mt-4 font-display text-[clamp(3rem,7vw,6rem)] leading-[0.95]">
            Znajdź swoje <em className="text-plum-900">miejsce.</em>
          </h1>
        </div>
      </section>
      <section className="min-h-[60vh] bg-mist py-16 text-graphite">
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <div className="flex flex-col gap-5 border-b border-graphite/15 pb-8">
            <div className="flex flex-wrap gap-2">
              <Chip active={!sp.transakcja} to={href(sp, { transakcja: "" })}>Wszystkie</Chip>
              <Chip active={sp.transakcja === "sprzedaz"} to={href(sp, { transakcja: "sprzedaz" })}>Kupno</Chip>
              <Chip active={sp.transakcja === "wynajem"} to={href(sp, { transakcja: "wynajem" })}>Wynajem</Chip>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip active={!sp.kategoria} to={href(sp, { kategoria: "" })}>Każdy typ</Chip>
              {categories.map((c) => (
                <Chip key={c.value} active={sp.kategoria === c.value} to={href(sp, { kategoria: c.value })}>{c.label}</Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip active={!sp.lokalizacja} to={href(sp, { lokalizacja: "" })}>Cała Łódź</Chip>
              {districts.map((d) => (
                <Chip key={d} active={sp.lokalizacja === d} to={href(sp, { lokalizacja: d })}>{d}</Chip>
              ))}
            </div>
          </div>
          <p className="mt-8 text-sm text-graphite/60">Wyniki: {results.length}</p>
          {results.length ? (
            <div className="mt-8 grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
              {results.map((l) => (
                <ListingCard key={l.slug} listing={l} />
              ))}
            </div>
          ) : (
            <div className="mt-8 border border-graphite/15 p-10">
              <p className="font-display text-3xl">Brak ofert dla tych filtrów.</p>
              <p className="mt-3 text-graphite/70">Zostaw nam kontakt, a powiadomimy Cię, gdy pojawi się coś dla Ciebie.</p>
              <Link href="/#kontakt" data-topic="kontakt" className="btn-primary mt-6">Napisz do nas</Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
