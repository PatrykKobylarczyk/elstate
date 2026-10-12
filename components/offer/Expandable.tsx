"use client";

import { useEffect, useRef, useState } from "react";
import Arrow from "@/components/Arrow";

const BUTTON = 80; // odstęp + wysokość przycisku „Zobacz więcej”

// Długi opis oferty: zwinięty z wygaszeniem na dole i przyciskiem „Zobacz więcej”.
// Na desktopie z `alignWith` (id kolumny obok) i `column` (id własnej kolumny) wysokość zwiniętego opisu
// dobiera się tak, żeby obie kolumny kończyły się na tej samej wysokości.
// Krótki opis (mieści się w całości) wyświetla się bez przycisku.
export default function Expandable({
  children,
  collapsed = 420,
  alignWith,
  column,
}: {
  children: React.ReactNode;
  collapsed?: number;
  alignWith?: string;
  column?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(collapsed);
  const [long, setLong] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = box.current;
    const wrap = root.current;
    if (!el || !wrap) return;
    const side = alignWith ? document.getElementById(alignWith) : null;
    const col = column ? document.getElementById(column) : null;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const check = () => {
      let max = collapsed;
      if (side && col && desktop.matches) {
        // to, co w kolumnie jest pod opisem (np. atuty), też musi się zmieścić
        const tail = col.getBoundingClientRect().bottom - wrap.getBoundingClientRect().bottom;
        const btn = wrap.querySelector("button");
        const button = btn ? wrap.getBoundingClientRect().bottom - el.getBoundingClientRect().bottom : BUTTON;
        max = Math.max(160, Math.floor(side.getBoundingClientRect().bottom - el.getBoundingClientRect().top - tail - button));
        setLong(el.scrollHeight > max + button);
      } else {
        setLong(el.scrollHeight > max + 80);
      }
      setLimit(max);
    };
    check();
    const ro = new ResizeObserver(check);
    [el, side, col].forEach((n) => n && ro.observe(n));
    desktop.addEventListener("change", check);
    return () => {
      ro.disconnect();
      desktop.removeEventListener("change", check);
    };
  }, [collapsed, alignWith, column]);

  const shut = long && !open;
  return (
    <div ref={root}>
      <div
        ref={box}
        className="relative overflow-hidden transition-[max-height] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ maxHeight: shut ? limit : long ? box.current?.scrollHeight : undefined }}
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
