"use client";

import { useEffect, useState } from "react";
import { logout } from "@/app/lista/actions";

type Push = "loading" | "unsupported" | "ios-browser" | "denied" | "off" | "on";

const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function keyBytes(base64: string) {
  const s = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

const registration = async () =>
  (await navigator.serviceWorker.getRegistration("/lista")) ?? (await navigator.serviceWorker.register("/lista-sw.js", { scope: "/lista" }));

const btn = "inline-flex items-center justify-center rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-pearl disabled:opacity-50";
const ghost = "inline-flex items-center justify-center rounded-full border border-graphite/15 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50";

// Ustawienia tego telefonu: instalacja na ekranie głównym, powiadomienia z licznikiem na ikonie, wylogowanie.
export default function Settings({ me, onClose }: { me: string; onClose: () => void }) {
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [push, setPush] = useState<Push>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    setInstalled(standalone());
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setPush(isIos() && !standalone() ? "ios-browser" : "unsupported");
      }
      if (Notification.permission === "denied") return setPush("denied");
      const sub = await (await registration()).pushManager.getSubscription();
      setPush(sub ? "on" : "off");
    })().catch(() => setPush("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    setNote("");
    try {
      // iPhone pyta o zgodę tylko po stuknięciu przycisku
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setPush(perm === "denied" ? "denied" : "off");
      const { publicKey } = (await (await fetch("/api/lista/push", { cache: "no-store" })).json()) as { publicKey: string };
      const reg = await registration();
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      const saved = await fetch("/api/lista/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      if (!saved.ok) throw new Error();
      setPush("on");
      setNote("Gotowe. Gdy ktoś coś doda, dostaniesz powiadomienie, a na ikonie pojawi się licznik.");
    } catch {
      setNote("Nie udało się włączyć powiadomień. Spróbuj jeszcze raz.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const sub = await (await registration()).pushManager.getSubscription();
      if (sub) {
        await fetch("/api/lista/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setPush("off");
      setNote("");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    const r = await fetch("/api/lista/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ test: true }) }).catch(() => null);
    setNote(r?.ok ? "Wysłane. Zablokuj telefon, powiadomienie przyjdzie za chwilę." : "Nie doszło. Wyłącz i włącz powiadomienia ponownie.");
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-plum-950/50 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Ustawienia"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-t-3xl bg-pearl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-sm sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-plum-900">Ustawienia</h2>
          <button type="button" onClick={onClose} className="px-2 py-1 text-xl text-graphite/50" aria-label="Zamknij">
            ×
          </button>
        </div>

        {installed === false && (
          <div className="mt-5">
            <p className="font-semibold">Ikona na ekranie głównym</p>
            {isIos() ? (
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-graphite/65">
                <li>Otwórz tę stronę w Safari.</li>
                <li>Stuknij <b>Udostępnij</b> (kwadrat ze strzałką w górę).</li>
                <li>Wybierz <b>Do ekranu początkowego</b> i <b>Dodaj</b>.</li>
                <li>Otwórz Listę z nowej ikony i zaloguj się w niej jeszcze raz.</li>
              </ol>
            ) : (
              <p className="mt-1 text-graphite/65">Menu przeglądarki ⋮ → <b>Zainstaluj aplikację</b> albo „Dodaj do ekranu głównego”.</p>
            )}
          </div>
        )}

        <div className="mt-5">
          <p className="font-semibold">Powiadomienia i licznik na ikonie</p>
          <p className="mt-1 text-graphite/60">Gdy druga osoba doda coś do listy.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {push === "off" && <button type="button" disabled={busy} onClick={enable} className={btn}>Włącz powiadomienia</button>}
            {push === "on" && (
              <>
                <span className="mr-1 inline-flex items-center gap-2 font-semibold text-emerald-800"><span className="size-2 rounded-full bg-emerald-600" />Włączone</span>
                <button type="button" disabled={busy} onClick={test} className={ghost}>Wyślij próbne</button>
                <button type="button" disabled={busy} onClick={disable} className={ghost}>Wyłącz</button>
              </>
            )}
            {push === "denied" && <p className="text-graphite/60">Zablokowane. Włącz je w Ustawieniach telefonu → Powiadomienia → Lista.</p>}
            {push === "ios-browser" && <p className="text-graphite/60">Na iPhonie powiadomienia działają tylko w aplikacji dodanej do ekranu początkowego (instrukcja wyżej).</p>}
            {push === "unsupported" && <p className="text-graphite/60">Ta przeglądarka nie obsługuje powiadomień.</p>}
          </div>
          {note && <p className="mt-2 text-graphite/70">{note}</p>}
        </div>

        <form action={logout} className="mt-6 flex items-center justify-between border-t border-graphite/10 pt-5">
          <span className="text-graphite/60">Zalogowano jako <b className="text-graphite">{me}</b></span>
          <button type="submit" className={ghost}>Wyloguj</button>
        </form>
      </div>
    </div>
  );
}
