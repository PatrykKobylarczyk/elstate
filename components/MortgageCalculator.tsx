"use client";

import { useId, useState } from "react";

const pln = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

function Slider({
  label, value, min, max, step, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm text-graphite/60">{label}</label>
        <span className="font-display text-xl tabular-nums text-graphite">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-plum-900"
      />
    </div>
  );
}

// Rata równa (annuitetowa). Wynik jest orientacyjny; ofertę przygotowuje doradca kredytowy.
export default function MortgageCalculator({ initialPrice = 750000 }: { initialPrice?: number }) {
  const [price, setPrice] = useState(initialPrice);
  const [down, setDown] = useState(20);
  const [years, setYears] = useState(25);
  const [rate, setRate] = useState(7.2);

  const loan = price * (1 - down / 100);
  const r = rate / 100 / 12;
  const n = years * 12;
  const monthly = r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n));

  return (
    <div className="grid gap-10 rounded-[2rem] bg-white text-graphite shadow-[0_20px_60px_rgba(42,42,45,0.08)] p-6 md:grid-cols-[1.3fr_1fr] md:p-10">
      <div className="flex flex-col gap-7">
        <Slider label="Cena nieruchomości" value={price} min={200000} max={3000000} step={10000} format={(v) => `${pln.format(v)} zł`} onChange={setPrice} />
        <Slider label="Wkład własny" value={down} min={10} max={60} step={1} format={(v) => `${v}%`} onChange={setDown} />
        <Slider label="Okres kredytowania" value={years} min={5} max={35} step={1} format={(v) => `${v} lat`} onChange={setYears} />
        <Slider label="Oprocentowanie" value={rate} min={3} max={11} step={0.1} format={(v) => `${v.toFixed(1).replace(".", ",")}%`} onChange={setRate} />
      </div>
      <div className="flex flex-col justify-between gap-8 border-t border-graphite/10 pt-8 md:border-l md:border-t-0 md:pl-10 md:pt-0">
        <div>
          <p className="text-sm text-graphite/60">Szacowana rata</p>
          <p className="mt-3 font-display text-5xl tabular-nums text-plum-900 md:text-6xl" aria-live="polite">
            {pln.format(monthly)} <span className="text-2xl">zł</span>
          </p>
          <p className="mt-2 text-sm text-graphite/55">miesięcznie, raty równe</p>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm tabular-nums">
          <div><dt className="text-graphite/55">Kwota kredytu</dt><dd className="mt-1">{pln.format(loan)} zł</dd></div>
          <div><dt className="text-graphite/55">Wkład własny</dt><dd className="mt-1">{pln.format(price - loan)} zł</dd></div>
        </dl>
        <p className="text-xs leading-relaxed text-graphite/45">
          Wyliczenie orientacyjne, nie jest ofertą banku. Oprocentowanie możesz zmienić suwakiem.
        </p>
      </div>
    </div>
  );
}
