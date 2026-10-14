"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Licznik „Do kontaktu” w menu. Co minutę sprawdza, czy przyszły nowe zgłoszenia (z nbot lub ze strony);
// gdy tak, pokazuje komunikat w panelu, liczbę w tytule karty i (za zgodą) powiadomienie systemowe.
export default function LeadPing({ initial, latest }: { initial: number; latest: number }) {
  const [count, setCount] = useState(initial);
  const [fresh, setFresh] = useState(0);
  const last = useRef(latest);
  const router = useRouter();

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = count ? `(${count}) ${base}` : base;
    // plakietka z liczbą na ikonie zainstalowanej aplikacji (telefon, Mac, Windows)
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    (count ? nav.setAppBadge?.(count) : nav.clearAppBadge?.())?.catch(() => {});
  }, [count]);

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const r = await fetch("/api/crm/licznik", { cache: "no-store" });
        if (!r.ok || stop) return;
        const j = (await r.json()) as { count: number; latest: number };
        setCount(j.count);
        if (j.latest > last.current) {
          const added = j.latest - last.current;
          last.current = j.latest;
          setFresh((f) => f + added);
          router.refresh();
          const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration("/crm") : undefined;
          const pushOn = Boolean(await reg?.pushManager?.getSubscription());
          if (!pushOn && "Notification" in window && Notification.permission === "granted") {
            new Notification("Elstate CRM", { body: added === 1 ? "Nowe zgłoszenie do kontaktu" : `Nowe zgłoszenia do kontaktu: ${added}`, tag: "elstate-leady" });
          }
        }
      } catch {}
    }
    const id = setInterval(tick, 60_000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      stop = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);

  return (
    <>
      {count > 0 && <span className="absolute left-[calc(50%+0.4rem)] top-1 min-w-5 rounded-full bg-gold-500 px-1.5 py-0.5 text-center text-[10px] leading-none font-bold text-plum-950 lg:static lg:ml-auto lg:px-2 lg:text-xs">{count}</span>}
      {fresh > 0 &&
        createPortal(
        <a
          href="/crm/leady"
          onClick={() => setFresh(0)}
          className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 z-50 justify-center lg:left-auto lg:bottom-4 lg:justify-start flex items-center gap-3 rounded-2xl bg-plum-900 px-5 py-4 text-sm font-semibold text-pearl shadow-[0_20px_50px_rgba(29,4,18,0.35)]"
        >
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-gold-500" />
          {fresh === 1 ? "Nowe zgłoszenie do kontaktu" : `Nowe zgłoszenia do kontaktu: ${fresh}`}
        </a>,
          document.body,
        )}
    </>
  );
}
