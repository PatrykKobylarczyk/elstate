"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Wordmark from "./Wordmark";
import { pickTopic } from "@/lib/contactTopics";
import { contact } from "@/lib/data";

type LenisCtl = { stop(): void; start(): void };

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
  const burger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Okrąg menu rośnie od przycisku (jak otwór w czołówce): środek liczymy z jego położenia
  const toggle = () => {
    const b = burger.current?.getBoundingClientRect();
    if (b && panel.current) {
      panel.current.style.setProperty("--mx", `${b.left + b.width / 2}px`);
      panel.current.style.setProperty("--my", `${b.top + b.height / 2}px`);
    }
    setOpen((v) => !v);
  };

  // Otwarte menu: strona pod spodem stoi, Escape zamyka
  useEffect(() => {
    if (!open) return;
    const lenis = (window as unknown as { lenis?: LenisCtl }).lenis;
    const root = document.documentElement;
    lenis?.stop();
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      root.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // zmiana strony (np. wstecz) zamyka menu
  useEffect(() => setOpen(false), [pathname]);

  // szerokie okno: menu pełnoekranowe nie jest potrzebne
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
  // Otwarte menu też jest fioletowe, więc pasek przechodzi wtedy w jasne barwy
  const onDark = open || ((pathname === "/" || pathname.startsWith("/oferty")) && !scrolled);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
      <nav
        data-menu-open={open || undefined}
        data-on-dark={onDark || undefined}
        className={`relative z-10 mx-auto flex h-[4.25rem] max-w-[96rem] items-center justify-between rounded-full pl-5 pr-2 md:h-[6.125rem] md:pl-12 md:pr-6 transition-colors duration-500 ${
          open ? "bg-transparent" : scrolled ? "bg-pearl/90 shadow-[0_8px_30px_rgba(42,42,45,0.08)] backdrop-blur-xl" : "bg-transparent"
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
          ref={burger}
          type="button"
          className={`menu-burger relative mr-1 h-12 w-12 rounded-full transition-colors duration-500 lg:hidden ${onDark ? "bg-pearl/10 text-pearl" : "bg-graphite/5 text-graphite"}`}
          aria-label={open ? "Zamknij menu" : "Otwórz menu"}
          aria-expanded={open}
          aria-controls="menu"
          onClick={toggle}
        >
          <span />
          <span />
        </button>
      </nav>

      {/* Menu jest zawsze w HTML (wyszukiwarki widzą linki), chowane tylko stylami */}
      <div
        id="menu"
        ref={panel}
        data-open={open || undefined}
        inert={!open}
        className="menu-panel fixed inset-0 overflow-y-auto bg-plum-900 text-pearl lg:hidden"
      >
        <div className="flex min-h-full flex-col px-6 pb-8 pt-[6.5rem] sm:px-10">
          <ul className="flex flex-col">
            {links.map((l, i) => (
              <li key={l.href} className="menu-item border-b border-pearl/10" style={{ "--i": i } as CSSProperties}>
                <Link
                  href={l.href}
                  data-topic={l.topic}
                  onClick={() => setOpen(false)}
                  className="group flex items-baseline gap-4 overflow-hidden py-3.5 sm:py-4"
                >
                  <span className="w-6 shrink-0 text-[0.7rem] font-light tabular-nums tracking-[0.2em] text-gold-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="menu-label font-display text-[clamp(2.4rem,11vw,4rem)] leading-[1.05] transition-colors group-hover:text-gold-300">
                    {l.label}
                    <span className="menu-dot text-gold-500">.</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="menu-foot mt-auto flex flex-col gap-6 pt-10">
            <Link
              href="/#kontakt"
              data-topic="wycena"
              onClick={() => setOpen(false)}
              className="btn-light w-full justify-center sm:w-auto sm:self-start"
            >
              Otrzymaj wycenę
            </Link>
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2 text-sm text-pearl/70">
              <div className="flex flex-col gap-1">
                <a href={contact.phoneHref} className="text-base text-pearl hover:text-gold-300">{contact.phone}</a>
                <a href={`mailto:${contact.email}`} className="hover:text-gold-300">{contact.email}</a>
              </div>
              <a href={contact.instagram} target="_blank" rel="noreferrer" className="text-xs uppercase tracking-[0.2em] hover:text-gold-300">
                Instagram
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
