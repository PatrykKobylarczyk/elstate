"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Wordmark from "./Wordmark";
import { pickTopic } from "@/lib/contactTopics";

const links = [
  { href: "/#o-nas", label: "O nas" },
  { href: "/oferty", label: "Oferty" },
  { href: "/#uslugi", label: "Usługi" },
  { href: "/#proces", label: "Proces" },
  { href: "/#finanse", label: "Finanse" },
  { href: "/#kontakt", label: "Kontakt", topic: "kontakt" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Każdy link z data-topic (navbar, hero, finanse, stopka) ustawia nagłówek formularza na dole strony głównej
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element).closest<HTMLAnchorElement>("a[data-topic]");
      if (!el) return;
      pickTopic(el.dataset.topic!);
      // ten sam adres /#kontakt drugi raz nie przewija, więc przewijamy sami
      if (location.pathname === "/" && location.hash === el.hash) {
        e.preventDefault();
        setOpen(false);
        const target = document.querySelector<HTMLElement>(el.hash);
        const lenis = (window as unknown as { lenis?: { scrollTo(t: HTMLElement, o?: { offset?: number }): void } }).lenis;
        if (target && lenis) lenis.scrollTo(target, { offset: -80 });
        else target?.scrollIntoView({ behavior: "smooth" });
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Na stronie głównej i liście ofert menu leży na fioletowym hero, dopóki nie przewiniesz
  const onDark = (pathname === "/" || pathname === "/oferty") && !scrolled && !open;

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
      <nav
        data-on-dark={onDark || undefined}
        className={`mx-auto flex h-[4.25rem] max-w-[96rem] items-center justify-between rounded-full pl-5 pr-2 md:h-[6.125rem] md:pl-12 md:pr-6 transition-colors duration-500 ${
          open ? "bg-pearl shadow-[0_8px_30px_rgba(42,42,45,0.08)]" : scrolled ? "bg-pearl/90 shadow-[0_8px_30px_rgba(42,42,45,0.08)] backdrop-blur-xl" : "bg-transparent"
        }`}
      >
        <Link href="/" className={`text-[1.7rem] transition-colors ${onDark ? "text-pearl" : "text-plum-900"}`} onClick={() => setOpen(false)}>
          <Wordmark />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                data-topic={l.topic}
                className={`rounded-full px-4 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.12em] transition-colors ${
                  onDark ? "text-pearl hover:bg-pearl/10" : "text-graphite hover:bg-plum-900/10 hover:text-plum-900"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/#kontakt"
          data-topic="wycena"
          className={`hidden h-14 items-center rounded-full px-12 text-[0.95rem] font-semibold transition-colors lg:inline-flex ${
            onDark ? "bg-pearl text-plum-900 hover:bg-white" : "bg-plum-900 text-pearl hover:bg-plum-700"
          }`}
        >
          Otrzymaj wycenę
        </Link>

        <button
          type="button"
          className={`relative mr-1 h-12 w-12 rounded-full lg:hidden ${onDark ? "bg-pearl/10 text-pearl" : "bg-graphite/5 text-graphite"}`}
          aria-label={open ? "Zamknij menu" : "Otwórz menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`absolute left-3.5 right-3.5 h-0.5 bg-current transition-transform ${open ? "top-1/2 rotate-45" : "top-[42%]"}`} />
          <span className={`absolute left-3.5 right-3.5 h-0.5 bg-current transition-transform ${open ? "top-1/2 -rotate-45" : "top-[58%]"}`} />
        </button>
      </nav>

      {open && (
        <div className="mx-auto mt-2 max-w-[96rem] rounded-[1.75rem] bg-pearl px-6 pt-6 pb-10 shadow-[0_8px_30px_rgba(42,42,45,0.08)] lg:hidden">
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href} className="border-b border-graphite/10 last:border-b-0">
                <Link href={l.href} data-topic={l.topic} onClick={() => setOpen(false)} className="block py-5 font-display text-3xl text-plum-900">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
