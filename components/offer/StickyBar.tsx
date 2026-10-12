"use client";

import { useEffect, useState } from "react";

// Pływający pasek z ceną i przyciskiem prezentacji. Pojawia się po zjechaniu poniżej hero,
// znika przy formularzu (#prezentacja) i w stopce, żeby nie zasłaniać tego, do czego prowadzi.
export default function StickyBar({ title, price, phoneHref }: { title: string; price: string; phoneHref: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const form = document.getElementById("prezentacja");
    const footer = document.querySelector("footer");
    const onScroll = () => {
      const past = window.scrollY > window.innerHeight * 0.85;
      const near = [form, footer].some((el) => el && el.getBoundingClientRect().top < window.innerHeight * 0.9 && el.getBoundingClientRect().bottom > 0);
      setShow(past && !near);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toForm = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById("prezentacja");
    const lenis = (window as unknown as { lenis?: { scrollTo(t: HTMLElement, o?: { offset?: number }): void } }).lenis;
    if (el && lenis) {
      e.preventDefault();
      lenis.scrollTo(el, { offset: -90 });
    }
  };

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:bottom-6 ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[150%] opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 rounded-full bg-plum-900/95 py-2 pl-6 pr-2 text-pearl shadow-[0_20px_60px_rgba(29,4,18,0.35)] backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <p className="hidden truncate text-xs text-pearl/60 sm:block">{title}</p>
          <p className="truncate font-display text-lg tabular-nums md:text-xl">{price}</p>
        </div>
        <a href={phoneHref} tabIndex={show ? 0 : -1} aria-label="Zadzwoń" className="grid size-12 shrink-0 place-items-center rounded-full border border-pearl/20 transition-colors hover:bg-pearl hover:text-plum-900">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
        </a>
        <a href="#prezentacja" onClick={toForm} tabIndex={show ? 0 : -1} className="shrink-0 rounded-full bg-gold-500 px-5 py-3.5 text-sm font-semibold text-plum-950 transition-colors hover:bg-gold-400 md:px-7">
          Umów prezentację
        </a>
      </div>
    </div>
  );
}
