"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { categories } from "@/lib/data";
import { sorts, type OfferQuery } from "@/lib/offers-filter";

// Pasek filtrów listy ofert. To zwykły formularz GET (działa bez JavaScriptu); z JavaScriptem
// wyniki odświeżają się same po każdej zmianie, a pola liczbowe chwilę po skończeniu pisania.
export default function OffersFilters({ query, districts }: { query: OfferQuery; districts: string[] }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [pending, start] = useTransition();
  const [more, setMore] = useState(Boolean(query.cenaOd || query.cenaDo || query.metrazOd || query.pokoje));

  const apply = () => {
    const data = new FormData(form.current!);
    const qs = new URLSearchParams([...data.entries()].filter(([, v]) => String(v).trim()) as [string, string][]).toString();
    start(() => router.replace(qs ? `/oferty?${qs}` : "/oferty", { scroll: false }));
  };
  const later = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(apply, 600);
  };

  const select = "w-full appearance-none bg-transparent pr-6 font-semibold text-plum-900 outline-none";
  const cell = "relative flex flex-col gap-1 rounded-[1.25rem] px-5 py-3.5 transition-colors hover:bg-graphite/[0.04] lg:px-7";
  const label = "text-[0.7rem] font-bold uppercase tracking-[0.14em] text-plum-900/70";
  const chevron = <span aria-hidden className="pointer-events-none absolute bottom-4 right-5 text-plum-900/50 lg:right-7">▾</span>;

  return (
    <form
      ref={form}
      action="/oferty"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      data-pending={pending || undefined}
      className="rounded-[1.75rem] border border-graphite/10 bg-pearl p-2 shadow-[0_20px_60px_rgba(29,4,18,0.18)]"
    >
      {/* miasto przychodzi z kafli „Łódź” / „Trójmiasto” na stronie głównej; zostaje przy zmianie filtrów */}
      {query.miasto && <input type="hidden" name="miasto" value={query.miasto} />}
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-[1fr_1fr_1.1fr_1fr_auto]">
        <label className={cell}>
          <span className={label}>Transakcja</span>
          <select name="transakcja" defaultValue={query.transakcja ?? ""} onChange={apply} className={select}>
            <option value="">Dowolna</option>
            <option value="sprzedaz">Kupno</option>
            <option value="wynajem">Wynajem</option>
          </select>
          {chevron}
        </label>
        <label className={cell}>
          <span className={label}>Kategoria</span>
          <select name="kategoria" defaultValue={query.kategoria ?? ""} onChange={apply} className={select}>
            <option value="">Wszystkie</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {chevron}
        </label>
        <label className={cell}>
          <span className={label}>Lokalizacja</span>
          <select name="lokalizacja" defaultValue={query.lokalizacja ?? ""} onChange={apply} className={select}>
            <option value="">Wszędzie</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {chevron}
        </label>
        <label className={cell}>
          <span className={label}>Sortuj</span>
          <select name="sort" defaultValue={query.sort ?? ""} onChange={apply} className={select}>
            {sorts.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {chevron}
        </label>
        <button
          type="button"
          onClick={() => setMore((m) => !m)}
          aria-expanded={more}
          className="col-span-2 flex items-center justify-center gap-2 rounded-full border border-plum-900/20 px-7 py-3.5 text-sm font-semibold text-plum-900 transition-colors hover:border-plum-900 lg:col-span-1 lg:my-1.5 lg:mr-1.5"
        >
          {more ? "Mniej filtrów" : "Więcej filtrów"}
          <span aria-hidden className={`transition-transform duration-300 ${more ? "rotate-45" : ""}`}>+</span>
        </button>
      </div>

      {/* ukryte pola i tak trafiają do adresu, więc zwinięty panel nie gubi filtrów */}
      <div className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${more ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="mt-1 grid grid-cols-2 gap-1 border-t border-graphite/10 pt-1 lg:grid-cols-4">
            <label className={cell}>
              <span className={label}>Cena od</span>
              <input name="cenaOd" inputMode="numeric" defaultValue={query.cenaOd} onChange={later} placeholder="zł" className={`${select} placeholder:font-normal placeholder:text-graphite/35`} />
            </label>
            <label className={cell}>
              <span className={label}>Cena do</span>
              <input name="cenaDo" inputMode="numeric" defaultValue={query.cenaDo} onChange={later} placeholder="zł" className={`${select} placeholder:font-normal placeholder:text-graphite/35`} />
            </label>
            <label className={cell}>
              <span className={label}>Metraż od</span>
              <input name="metrazOd" inputMode="decimal" defaultValue={query.metrazOd} onChange={later} placeholder="m²" className={`${select} placeholder:font-normal placeholder:text-graphite/35`} />
            </label>
            <fieldset className={cell}>
              <legend className={`${label} float-left mb-1`}>Pokoje</legend>
              <div className="clear-left flex gap-1 sm:gap-1.5">
                {["1", "2", "3", "4"].map((n) => (
                  <label key={n} className="cursor-pointer">
                    <input type="radio" name="pokoje" value={n} defaultChecked={query.pokoje === n} onChange={apply} className="peer sr-only" />
                    <span className="grid size-8 place-items-center sm:size-9 rounded-full border border-graphite/15 text-sm font-semibold text-plum-900 transition-colors peer-checked:border-plum-900 peer-checked:bg-plum-900 peer-checked:text-pearl peer-focus-visible:ring-2 peer-focus-visible:ring-gold-500">
                      {n === "4" ? "4+" : n}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
      </div>
      <noscript>
        <button type="submit" className="btn-primary m-2">Pokaż wyniki</button>
      </noscript>
    </form>
  );
}
