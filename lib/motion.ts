// Silnik ruchu strony: paralaksa, odsłanianie, poziomy scroll, licznik słów, kursor.
// Bez zależności od Reacta, sterowany atrybutami data-* w HTML. Wywoływany raz z <Motion />.
//
//   data-parallax="0.2"   przesunięcie w pionie względem środka ekranu (ujemne = w przeciwną stronę)
//   data-depth="20"       przesunięcie za kursorem myszy (px), np. warstwy w hero
//   data-reveal           wjazd elementu przy pojawieniu się w kadrze (treść jest widoczna od początku)
//   data-words            słowa rozjaśniają się w miarę przewijania sekcji
//   data-hscroll          sekcja przypięta; jej [data-track] przesuwa się w poziomie przy przewijaniu w dół
//   data-progress         linia (scaleY) wypełnia się wraz z przewijaniem rodzica
//   data-hero-fade        element hero zanika i oddala się przy przewijaniu
//   data-cursor="Zobacz"  etykieta kursora nad elementem
//   data-count="9"        licznik od zera do wartości przy pierwszym pojawieniu się

type LenisLike = { raf(t: number): void; destroy(): void; on(e: string, cb: () => void): void };
type LenisCtor = new (opts?: Record<string, unknown>) => LenisLike;

export function initMotion(opts: { Lenis?: LenisCtor } = {}) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const root = document.documentElement;
  root.classList.add("motion-ready");
  const cleanups: (() => void)[] = [];

  // Słowa: dzielimy tekst na spany raz
  document.querySelectorAll<HTMLElement>("[data-words]").forEach((el) => {
    if (el.dataset.split) return;
    el.dataset.split = "1";
    const words = (el.textContent || "").trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(" ");
  });

  // Odsłanianie przy wejściu w kadr
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
    { rootMargin: "0px 0px -10% 0px" },
  );
  document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
  cleanups.push(() => io.disconnect());

  // Liczniki: wartość z HTML jest docelowa, animujemy od zera przy pierwszym pojawieniu się
  if (!reduce) {
    const cio = new IntersectionObserver((entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        const el = e.target as HTMLElement;
        const to = Number(el.dataset.count);
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / 1400);
          el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    );
    document.querySelectorAll("[data-count]").forEach((el) => cio.observe(el));
    cleanups.push(() => cio.disconnect());
  }

  if (reduce) {
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-in"));
    // bez animacji tor ofert przewija się zwyczajnie, palcem lub kółkiem
    document.querySelectorAll<HTMLElement>("[data-hscroll] [data-track]").forEach((t) => (t.parentElement!.style.overflowX = "auto"));
    document.querySelectorAll<HTMLElement>("[data-words] .word").forEach((w) => (w.style.opacity = "1"));
    return () => cleanups.forEach((c) => c());
  }

  // Płynne przewijanie
  let lenis: LenisLike | null = null;
  if (opts.Lenis) {
    lenis = new opts.Lenis({ lerp: 0.09, smoothWheel: true });
    // dostępny dla przewijania z kodu (np. ponowne kliknięcie „Kontakt” w components/Nav.tsx)
    (window as unknown as { lenis?: LenisLike }).lenis = lenis;
    cleanups.push(() => {
      lenis?.destroy();
      delete (window as unknown as { lenis?: LenisLike }).lenis;
    });
  }

  const parallax = [...document.querySelectorAll<HTMLElement>("[data-parallax]")];
  const depth = [...document.querySelectorAll<HTMLElement>("[data-depth]")];
  const words = [...document.querySelectorAll<HTMLElement>("[data-words]")];
  const hscroll = [...document.querySelectorAll<HTMLElement>("[data-hscroll]")];
  const progress = [...document.querySelectorAll<HTMLElement>("[data-progress]")];
  const heroFade = [...document.querySelectorAll<HTMLElement>("[data-hero-fade]")];

  // Wysokość sekcji z poziomym scrollem = szerokość toru
  const sizeH = () =>
    hscroll.forEach((s) => {
      const track = s.querySelector<HTMLElement>("[data-track]");
      if (!track) return;
      s.style.height = `${track.scrollWidth - window.innerWidth + window.innerHeight}px`;
    });
  sizeH();
  window.addEventListener("resize", sizeH);
  cleanups.push(() => window.removeEventListener("resize", sizeH));

  let mx = 0, my = 0, cx = 0, cy = 0;
  const onMouse = (e: MouseEvent) => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
  };
  window.addEventListener("mousemove", onMouse, { passive: true });
  cleanups.push(() => window.removeEventListener("mousemove", onMouse));

  // Kursor
  let cursor: HTMLElement | null = null;
  let px = -100, py = -100, tx = -100, ty = -100;
  if (fine) {
    cursor = document.createElement("div");
    cursor.className = "cursor";
    cursor.innerHTML = '<span class="cursor-label"></span>';
    document.body.appendChild(cursor);
    const label = cursor.querySelector<HTMLElement>(".cursor-label")!;
    // Kolor kursora zależy od tła pod nim: szukamy pierwszego nieprzezroczystego tła w górę drzewa
    // Kolor tła liczymy w punkcie kursora, przez wszystkie warstwy: przezroczysty navbar leży nad fioletowym hero,
    // a nie w nim, więc samo wspinanie się po rodzicach dawało beżowe body i fioletowy kursor na fioletowym tle.
    const bgDark = (n: Element) => {
      const bg = getComputedStyle(n).backgroundColor;
      const v = (bg.match(/-?[\d.]+/g) || []).map(Number);
      if (v.length < 3) return null;
      const alpha = bg.includes("/") || bg.startsWith("rgba") ? v[v.length - 1] : 1;
      if (alpha < 0.5) return null;
      // rgb() w 0–255, color(srgb) w 0–1, oklab/oklch zaczyna się od jasności 0–1
      if (bg.startsWith("okl")) return v[0] < 0.55;
      const k = bg.startsWith("color(") ? 255 : 1;
      return (0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]) * k < 140;
    };
    const isDark = (x: number, y: number) => {
      for (const n of document.elementsFromPoint(x, y)) {
        if (n === document.documentElement) break;
        const d = bgDark(n);
        if (d !== null) return d;
      }
      return false;
    };
    let lastTarget: Element | null = null;
    let recheck = false;
    const tone = () => cursor!.classList.toggle("on-dark", isDark(tx, ty));
    // przy przewijaniu tło pod nieruchomym kursorem też się zmienia (np. navbar dostaje beżowe tło)
    const onScroll = () => {
      if (recheck) return;
      recheck = true;
      requestAnimationFrame(() => ((recheck = false), tone()));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    cleanups.push(() => window.removeEventListener("scroll", onScroll));
    const move = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (e.target !== lastTarget) {
        lastTarget = e.target as Element;
        tone();
      }
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-cursor], a, button, input, select, textarea");
      const text = t?.dataset.cursor || "";
      cursor!.classList.toggle("is-link", Boolean(t) && !text);
      cursor!.classList.toggle("is-label", Boolean(text));
      label.textContent = text;
    };
    window.addEventListener("mousemove", move, { passive: true });
    cleanups.push(() => {
      window.removeEventListener("mousemove", move);
      cursor?.remove();
    });
  }

  let raf = 0;
  const frame = (t: number) => {
    lenis?.raf(t);
    const vh = window.innerHeight;

    for (const el of parallax) {
      const r = (el.parentElement || el).getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const off = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translate3d(0, ${(-off * Number(el.dataset.parallax)).toFixed(1)}px, 0)`;
    }

    cx += (mx - cx) * 0.06;
    cy += (my - cy) * 0.06;
    for (const el of depth) {
      const d = Number(el.dataset.depth);
      el.style.translate = `${(cx * d).toFixed(1)}px ${(cy * d * 0.6).toFixed(1)}px`;
    }

    const y = window.scrollY;
    for (const el of heroFade) {
      const p = Math.min(1, y / vh);
      el.style.opacity = String(1 - p * 1.1);
      el.style.transform = `translate3d(0, ${p * 120}px, 0) scale(${1 - p * 0.06})`;
    }

    for (const el of words) {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const spans = el.children;
      const lit = p * spans.length;
      for (let i = 0; i < spans.length; i++) {
        (spans[i] as HTMLElement).style.opacity = String(Math.min(1, Math.max(0.16, lit - i + 0.16)));
      }
    }

    for (const s of hscroll) {
      const track = s.querySelector<HTMLElement>("[data-track]");
      if (!track) continue;
      const r = s.getBoundingClientRect();
      const max = track.scrollWidth - window.innerWidth;
      const p = Math.min(1, Math.max(0, -r.top / (r.height - vh)));
      track.style.transform = `translate3d(${(-p * max).toFixed(1)}px, 0, 0)`;
    }

    for (const el of progress) {
      const r = (el.parentElement as HTMLElement).getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height));
      el.style.transform = `scaleY(${p.toFixed(3)})`;
    }

    if (cursor) {
      px += (tx - px) * 0.22;
      py += (ty - py) * 0.22;
      cursor.style.transform = `translate3d(${px}px, ${py}px, 0)`;
    }

    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  cleanups.push(() => cancelAnimationFrame(raf));

  return () => cleanups.forEach((c) => c());
}

