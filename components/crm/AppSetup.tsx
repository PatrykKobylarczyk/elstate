"use client";

import { useEffect, useState } from "react";
import { INSTALL_EVENT } from "./CrmApp";
import { btn, btnGhost } from "./ui";

type Push = "loading" | "unsupported" | "ios-browser" | "denied" | "off" | "on";

const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function keyBytes(base64: string) {
  const s = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/crm")) ?? (await navigator.serviceWorker.register("/crm-sw.js", { scope: "/crm" }));
}

// Ustawienia → „Aplikacja na telefonie”: instalacja CRM na ekranie głównym i powiadomienia push na tym urządzeniu.
export default function AppSetup() {
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [ios, setIos] = useState(false);
  const [push, setPush] = useState<Push>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    setInstalled(standalone());
    setIos(isIos());
    const sync = () => setCanPrompt(Boolean(window.__crmInstall));
    sync();
    window.addEventListener(INSTALL_EVENT, sync);
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // iPhone obsługuje powiadomienia tylko w aplikacji dodanej do ekranu początkowego
        return setPush(isIos() && !standalone() ? "ios-browser" : "unsupported");
      }
      if (Notification.permission === "denied") return setPush("denied");
      const sub = await (await registration()).pushManager.getSubscription();
      setPush(sub ? "on" : "off");
    })().catch(() => setPush("unsupported"));
    return () => window.removeEventListener(INSTALL_EVENT, sync);
  }, []);

  async function install() {
    const p = window.__crmInstall;
    if (!p) return;
    await p.prompt();
    const { outcome } = await p.userChoice;
    window.__crmInstall = null;
    setCanPrompt(false);
    if (outcome === "accepted") setInstalled(true);
  }

  async function enable() {
    setBusy(true);
    setNote("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setPush(perm === "denied" ? "denied" : "off");
      const r = await fetch("/api/crm/push", { cache: "no-store" });
      const { publicKey } = (await r.json()) as { publicKey: string };
      const reg = await registration();
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      const saved = await fetch("/api/crm/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      if (!saved.ok) throw new Error();
      setPush("on");
      setNote("Gotowe. Przy nowym zgłoszeniu telefon pokaże powiadomienie.");
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
        await fetch("/api/crm/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
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
    const r = await fetch("/api/crm/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ test: true }) }).catch(() => null);
    setNote(r?.ok ? "Wysłane. Powiadomienie powinno pojawić się za chwilę." : "Nie doszło. Wyłącz i włącz powiadomienia ponownie.");
    setBusy(false);
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/crm-icons/icon-192.png" alt="" className="size-14 shrink-0 rounded-[1rem] shadow-[0_8px_20px_rgba(29,4,18,0.18)]" />
        <div className="min-w-0 text-sm">
          <p className="font-semibold">Elstate CRM na ekranie głównym</p>
          {installed === null ? null : installed ? (
            <p className="mt-1 text-emerald-800">Aplikacja jest zainstalowana na tym urządzeniu.</p>
          ) : canPrompt ? (
            <>
              <p className="mt-1 text-graphite/60">Własna ikona, pełny ekran bez paska przeglądarki i powiadomienia o zgłoszeniach.</p>
              <button type="button" onClick={install} className={`${btn} mt-3`}>Zainstaluj aplikację</button>
            </>
          ) : ios ? (
            <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-graphite/65">
              <li>Otwórz CRM w Safari.</li>
              <li>Stuknij <b>Udostępnij</b> (kwadrat ze strzałką w górę).</li>
              <li>Wybierz <b>Do ekranu początkowego</b> i potwierdź <b>Dodaj</b>.</li>
            </ol>
          ) : (
            <p className="mt-1 text-graphite/60">
              Na Androidzie: menu przeglądarki ⋮ → <b>Zainstaluj aplikację</b> (albo „Dodaj do ekranu głównego”). Na komputerze: ikona instalacji w pasku adresu.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-graphite/10 pt-5 text-sm">
        <p className="font-semibold">Powiadomienia na tym urządzeniu</p>
        <p className="mt-1 text-graphite/60">Nowe wiadomości ze strony i ogłoszenia z nbota do przejrzenia, także gdy CRM jest zamknięty.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {push === "off" && <button type="button" disabled={busy} onClick={enable} className={btn}>Włącz powiadomienia</button>}
          {push === "on" && (
            <>
              <span className="mr-1 inline-flex items-center gap-2 font-semibold text-emerald-800"><span className="size-2 rounded-full bg-emerald-600" />Włączone</span>
              <button type="button" disabled={busy} onClick={test} className={btnGhost}>Wyślij próbne</button>
              <button type="button" disabled={busy} onClick={disable} className={btnGhost}>Wyłącz</button>
            </>
          )}
          {push === "denied" && <p className="text-graphite/60">Zablokowane w ustawieniach telefonu lub przeglądarki. Zezwól na powiadomienia dla Elstate i wróć tutaj.</p>}
          {push === "ios-browser" && <p className="text-graphite/60">Na iPhonie powiadomienia działają po dodaniu CRM do ekranu początkowego. Otwórz go potem z ikony i wróć tutaj.</p>}
          {push === "unsupported" && <p className="text-graphite/60">Ta przeglądarka nie obsługuje powiadomień push.</p>}
        </div>
        {note && <p className="mt-2 text-graphite/70">{note}</p>}
      </div>
    </div>
  );
}
