"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Galeria oferty: mozaika zdjęć na stronie i pełnoekranowy podgląd (strzałki, klawiatura, przesunięcie palcem).
// Przycisk „Zobacz zdjęcia” w hero otwiera podgląd przez zdarzenie "elstate-gallery".
export const GALLERY_EVENT = "elstate-gallery";

export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const touch = useRef<number | null>(null);
  const n = images.length;
  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + n) % n)), [n]);

  useEffect(() => {
    const onOpen = (e: Event) => setOpen((e as CustomEvent<number>).detail ?? 0);
    window.addEventListener(GALLERY_EVENT, onOpen);
    return () => window.removeEventListener(GALLERY_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    const lenis = (window as unknown as { lenis?: { stop(): void; start(): void } }).lenis;
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, go]);

  // mozaika: pierwsze zdjęcie duże, kolejne mniejsze; nadmiar chowa się pod „+N”
  const shown = images.slice(0, 5);
  const rest = n - shown.length;
  const tile = [
    "col-span-2 row-span-2 md:col-span-2 md:row-span-2",
    "md:col-span-1 md:row-span-1",
    "md:col-span-1 md:row-span-1",
    "md:col-span-1 md:row-span-1",
    "md:col-span-1 md:row-span-1",
  ];

  return (
    <>
      {n > 1 && (
      <div className={`grid auto-rows-[38vw] grid-cols-2 gap-2 md:auto-rows-[min(19vw,17rem)] md:gap-3 ${shown.length >= 3 ? "md:grid-cols-4" : "md:grid-cols-2"}`}>
        {shown.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpen(i)}
            data-cursor="Powiększ"
            className={`group relative overflow-hidden rounded-[1.25rem] bg-mist ${shown.length >= 3 ? tile[i] : "col-span-1 row-span-2"}`}
          >
            <Image
              src={src}
              alt={`${title}, zdjęcie ${i + 1}`}
              fill
              className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
              sizes={i === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
            />
            {i === shown.length - 1 && rest > 0 && (
              <span className="absolute inset-0 grid place-items-center bg-plum-950/55 font-display text-3xl text-pearl backdrop-blur-[2px] md:text-4xl">+{rest}</span>
            )}
          </button>
        ))}
      </div>
      )}

      {open !== null &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Zdjęcia: ${title}`}
            className="fixed inset-0 z-[100] flex flex-col bg-plum-950/97 text-pearl backdrop-blur-xl animate-[fade_0.3s_ease]"
            onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touch.current === null) return;
              const dx = e.changedTouches[0].clientX - touch.current;
              if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
              touch.current = null;
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 md:px-8">
              <p className="text-sm tabular-nums text-pearl/70">
                <span className="text-pearl">{open + 1}</span> / {n}
              </p>
              <p className="hidden truncate px-6 font-display text-lg md:block">{title}</p>
              <button type="button" onClick={() => setOpen(null)} aria-label="Zamknij" className="grid size-12 place-items-center rounded-full border border-pearl/20 text-xl transition-colors hover:bg-pearl hover:text-plum-900">
                ✕
              </button>
            </div>
            <div className="relative flex-1">
              <Image key={images[open]} src={images[open]} alt={`${title}, zdjęcie ${open + 1}`} fill className="animate-[fade_0.4s_ease] object-contain px-2 md:px-24" sizes="100vw" priority />
              {n > 1 && (
                <>
                  <button type="button" onClick={() => go(-1)} aria-label="Poprzednie zdjęcie" className="absolute left-3 top-1/2 hidden size-14 -translate-y-1/2 place-items-center rounded-full border border-pearl/20 bg-plum-950/40 text-2xl transition-colors hover:bg-pearl hover:text-plum-900 md:left-6 md:grid">←</button>
                  <button type="button" onClick={() => go(1)} aria-label="Następne zdjęcie" className="absolute right-3 top-1/2 hidden size-14 -translate-y-1/2 place-items-center rounded-full border border-pearl/20 bg-plum-950/40 text-2xl transition-colors hover:bg-pearl hover:text-plum-900 md:right-6 md:grid">→</button>
                </>
              )}
            </div>
            {n > 1 && (
              <div className="flex gap-2 overflow-x-auto px-5 py-4 md:justify-center md:px-8">
                {images.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setOpen(i)}
                    aria-label={`Zdjęcie ${i + 1}`}
                    className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition-opacity md:h-16 md:w-24 ${i === open ? "opacity-100 ring-2 ring-gold-500" : "opacity-45 hover:opacity-80"}`}
                  >
                    <Image src={src} alt="" fill className="object-cover" sizes="96px" />
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

export function OpenGallery({ index = 0, className, children }: { index?: number; className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new CustomEvent(GALLERY_EVENT, { detail: index }))}>
      {children}
    </button>
  );
}
