"use client";

import { useEffect, useRef, useState } from "react";
import Arrow from "@/components/Arrow";

// Długi opis oferty: zwinięty do wysokości `collapsed` z wygaszeniem na dole i przyciskiem „Zobacz więcej”.
// Krótki opis (mieści się w całości) wyświetla się bez przycisku.
export default function Expandable({ children, collapsed = 420 }: { children: React.ReactNode; collapsed?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [long, setLong] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const check = () => setLong(el.scrollHeight > collapsed + 80);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [collapsed]);

  const shut = long && !open;
  return (
    <div>
      <div
        ref={box}
        className="relative overflow-hidden transition-[max-height] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ maxHeight: shut ? collapsed : long ? box.current?.scrollHeight : undefined }}
      >
        {children}
        <div aria-hidden className={`pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-pearl to-transparent transition-opacity duration-500 ${shut ? "opacity-100" : "opacity-0"}`} />
      </div>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="btn-ghost mt-8 text-plum-900">
          {open ? "Zwiń opis" : "Zobacz więcej"}
          <Arrow dir="down" className={`transition-transform duration-500 ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}
