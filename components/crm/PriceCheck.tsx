"use client";

import { useEffect, useRef, useState } from "react";
import { cenyOkolicy } from "@/app/crm/(panel)/actions";
import type { Porownanie } from "@/lib/crm/porownanie";

// Cena za m² oferty na tle cen transakcyjnych z RCN (ulica, 1 km, dzielnica, miasto).
// W formularzu czyta pola na bieżąco: cena i metraż przeliczają się od razu, a po zmianie adresu
// albo rodzaju dociągamy nowe dane z serwera. Na karcie oferty dostaje gotowe wartości.

type Start = { deal: string; category: string; city: string; district: string; street: string; lat?: number | null; lng?: number | null; price: number; area: number };
type Loc = Pick<Start, "category" | "city" | "district" | "street">;

const num = (v: string) => {
  const n = Number(v.replace(/[\szł]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const WHERE: Record<string, string> = { ulica: " na tej ulicy", okolica: " w promieniu 1 km", dzielnica: " w dzielnicy", miasto: " w całym mieście" };
const zl = (n: number) => `${Math.round(n).toLocaleString("pl-PL")} zł/m²`;

// percentyl wartości w rozkładzie danym kwantylami co 5%
function rank(q: number[], v: number) {
  if (v <= q[0]) return 0;
  if (v >= q[q.length - 1]) return 100;
  const i = q.findIndex((x, k) => v >= x && v < q[k + 1]);
  const span = q[i + 1] - q[i];
  return Math.round((i + (span ? (v - q[i]) / span : 0)) * 5);
}

function verdict(r: number) {
  if (r < 10) return { text: "wyraźnie poniżej rynku", cls: "bg-sky-100 text-sky-900" };
  if (r < 25) return { text: "poniżej typowych cen", cls: "bg-sky-50 text-sky-900" };
  if (r <= 75) return { text: "w typowym przedziale", cls: "bg-emerald-100 text-emerald-900" };
  if (r <= 90) return { text: "powyżej typowych cen", cls: "bg-amber-100 text-amber-900" };
  return { text: "wyraźnie powyżej rynku", cls: "bg-red-100 text-red-900" };
}

export default function PriceCheck({ start, live = false }: { start: Start; live?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [deal, setDeal] = useState(start.deal);
  const [price, setPrice] = useState(start.price);
  const [area, setArea] = useState(start.area);
  const [loc, setLoc] = useState<Loc>({ category: start.category, city: start.city, district: start.district, street: start.street });
  const [data, setData] = useState<Porownanie | null>(null);
  const groups = data?.groups ?? null;

  // pola formularza oferty: nasłuch na całym formularzu, bez przerabiania pól na kontrolowane
  useEffect(() => {
    if (!live) return;
    const form = ref.current?.closest("form");
    if (!form) return;
    const val = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value ?? "";
    const read = () => {
      setDeal(val("deal"));
      setPrice(num(val("price")));
      setArea(num(val("area")));
      setLoc((old) => {
        const next = { category: val("category"), city: val("city").trim(), district: val("district").trim(), street: val("street").trim() };
        return JSON.stringify(next) === JSON.stringify(old) ? old : next;
      });
    };
    read();
    form.addEventListener("input", read);
    form.addEventListener("change", read);
    return () => {
      form.removeEventListener("input", read);
      form.removeEventListener("change", read);
    };
  }, [live]);

  useEffect(() => {
    let stop = false;
    setData(null);
    // zapisane współrzędne pasują tylko do zapisanego adresu
    const same = loc.city === start.city && loc.district === start.district && loc.street === start.street;
    const timer = setTimeout(() => {
      cenyOkolicy({ ...loc, lat: same ? start.lat : null, lng: same ? start.lng : null })
        .then((r) => !stop && setData(r))
        .catch(() => !stop && setData({ groups: [], trend: null }));
    }, 600);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [loc, start.city, start.district, start.street, start.lat, start.lng]);

  const v = price > 0 && area > 0 ? price / area : 0;
  const head = (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <h2 className="font-display text-xl text-plum-900">Cena na tle transakcji</h2>
      <p className="text-sm text-graphite/55">
        {v ? <>Ta oferta: <strong className="font-semibold tabular-nums text-graphite">{zl(v)}</strong></> : "Wpisz cenę i powierzchnię, żeby zobaczyć cenę za m²."}
      </p>
    </div>
  );

  let body: React.ReactNode;
  if (deal !== "sprzedaz") body = <p className="mt-3 text-sm text-graphite/55">Porównanie z cenami transakcyjnymi działa tylko dla sprzedaży.</p>;
  else if (!groups) body = <p className="mt-3 animate-pulse text-sm text-graphite/45">Wczytuję transakcje z okolicy…</p>;
  else if (!groups.length)
    body = (
      <p className="mt-3 text-sm text-graphite/55">
        Brak co najmniej 5 transakcji tego rodzaju dla tej lokalizacji w Rejestrze Cen Nieruchomości. Sprawdź miasto, dzielnicę i ulicę albo rodzaj nieruchomości.
      </p>
    );
  else {
    const all = groups.flatMap((g) => [g.q[1], g.q[19]]).concat(v ? [v] : []);
    const pad = (Math.max(...all) - Math.min(...all)) * 0.06 || 500;
    const lo = Math.max(0, Math.min(...all) - pad);
    const hi = Math.max(...all) + pad;
    const x = (n: number) => `${Math.min(100, Math.max(0, ((n - lo) / (hi - lo)) * 100))}%`;
    const main = groups[0];
    const r = v ? rank(main.q, v) : null;
    const vd = r !== null ? verdict(r) : null;
    body = (
      <>
        {vd && (
          <p className="mt-3 text-sm">
            <span className={`mr-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${vd.cls}`}>{vd.text}</span>
            Taniej za m² sprzedano {r}% z {main.n} transakcji{WHERE[main.key] ?? ""}.
          </p>
        )}
        <div className="mt-5 grid gap-5">
          {groups.map((g) => {
            const med = g.q[10];
            const diff = v ? Math.round((v / med - 1) * 100) : null;
            return (
              <div key={g.key}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                  <a href={g.ceny} className="font-semibold text-graphite hover:text-plum-900 hover:underline">{g.label}</a>
                  <span className="tabular-nums text-graphite/55">
                    mediana {zl(med)}
                    {diff !== null && (
                      <span className={`ml-2 font-semibold ${diff > 10 ? "text-amber-800" : diff < -10 ? "text-sky-800" : "text-emerald-800"}`}>
                        {diff > 0 ? "+" : ""}
                        {diff}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="relative mt-2 h-7" title={`10–90%: ${zl(g.q[2])} – ${zl(g.q[18])} · 25–75%: ${zl(g.q[5])} – ${zl(g.q[15])}`}>
                  <div className="absolute inset-x-0 top-1/2 h-px bg-graphite/10" />
                  <div className="absolute top-1.5 bottom-1.5 rounded-full bg-plum-900/12" style={{ left: x(g.q[2]), right: `calc(100% - ${x(g.q[18])})` }} />
                  <div className="absolute top-1 bottom-1 rounded-full bg-plum-900/30" style={{ left: x(g.q[5]), right: `calc(100% - ${x(g.q[15])})` }} />
                  <div className="absolute top-0.5 bottom-0.5 w-0.5 -translate-x-1/2 bg-plum-900" style={{ left: x(med) }} />
                  {v > 0 && (
                    <div className="absolute inset-y-0 -translate-x-1/2" style={{ left: x(v) }}>
                      <div className="mx-auto h-full w-0.5 bg-gold-500" />
                      <div className="absolute top-1/2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gold-500 shadow" />
                    </div>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap justify-between gap-x-4 text-xs tabular-nums text-graphite/45">
                  <span>
                    połowa transakcji: {Math.round(g.q[5]).toLocaleString("pl-PL")}–{zl(g.q[15])}
                  </span>
                  <span>{g.n} transakcji od {new Date(`${g.od}T12:00:00Z`).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })} ({g.months} mies.)</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-graphite/45">
          {data?.trend ? (
            <>
              Ceny urealnione do dziś: starsze transakcje przeliczone według kwartalnego trendu cen w mieście {data.trend.scope}
              {data.trend.pct12 !== null && (
                <> ({data.trend.pct12 > 0 ? "+" : ""}{data.trend.pct12.toLocaleString("pl-PL")}% w ostatnim roku)</>
              )}
              . Liczymy z ostatnich 6 miesięcy, a z 12 miesięcy lub 2 lat tylko wtedy, gdy transakcji jest za mało.{" "}
            </>
          ) : (
            <>Ceny bez urealnienia (za mało transakcji w mieście, żeby policzyć trend). </>
          )}
          Ciemny pasek: środkowa połowa transakcji (25–75%), jasny: 10–90%, kreska: mediana, złota kropka: ta oferta. Ceny z aktów notarialnych (RCN), bez udziałów i sprzedaży
          z bonifikatą. Kliknij nazwę, żeby otworzyć szczegóły w Cenach transakcyjnych.
        </p>
      </>
    );
  }

  return (
    <section ref={ref} className="rounded-2xl border border-graphite/10 bg-white p-5 md:p-6">
      {head}
      {body}
    </section>
  );
}
