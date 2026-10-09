import { categories, listings } from "@/lib/data";

const districts = [...new Set(listings.map((l) => l.district))].sort((a, b) => a.localeCompare(b, "pl"));

// Zwykły formularz GET: działa bez JavaScriptu i prowadzi do /oferty z filtrami w adresie.
export default function SearchBar() {
  return (
    <form action="/oferty" className="grid gap-1 rounded-[1.75rem] border border-graphite/10 bg-pearl p-2.5 lg:rounded-full shadow-[0_20px_60px_rgba(29,4,18,0.25)] sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
      <label className="flex flex-col gap-1 rounded-[1.4rem] px-6 py-4 transition-colors lg:rounded-full lg:px-9 hover:bg-graphite/[0.04]">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-plum-900">Transakcja</span>
        <select name="transakcja" defaultValue="" className="bg-transparent font-semibold text-plum-900 outline-none">
          <option value="" className="bg-pearl">Dowolna</option>
          <option value="sprzedaz" className="bg-pearl">Kupno</option>
          <option value="wynajem" className="bg-pearl">Wynajem</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 rounded-[1.4rem] px-6 py-4 transition-colors lg:rounded-full lg:px-9 hover:bg-graphite/[0.04]">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-plum-900">Kategoria</span>
        <select name="kategoria" defaultValue="" className="bg-transparent font-semibold text-plum-900 outline-none">
          <option value="" className="bg-pearl">Wszystkie</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value} className="bg-pearl">{c.label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 rounded-[1.4rem] px-6 py-4 transition-colors lg:rounded-full lg:px-9 hover:bg-graphite/[0.04]">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-plum-900">Lokalizacja</span>
        <select name="lokalizacja" defaultValue="" className="bg-transparent font-semibold text-plum-900 outline-none">
          <option value="" className="bg-pearl">Cała Łódź</option>
          {districts.map((d) => (
            <option key={d} value={d} className="bg-pearl">{d}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="rounded-full bg-plum-900 px-12 py-4 lg:mr-2.5 lg:h-14 lg:self-center lg:py-0 text-[0.95rem] font-semibold text-pearl transition-colors hover:bg-plum-700 sm:col-span-2 lg:col-span-1">
        Szukaj
      </button>
    </form>
  );
}
