"use client";

import { useEffect } from "react";

export type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
declare global {
  interface Window {
    __crmInstall?: InstallPrompt | null;
  }
}
export const INSTALL_EVENT = "elstate-crm-install";

// Rejestruje service worker aplikacji CRM (instalacja na telefonie, powiadomienia push, ekran „Brak połączenia”)
// i zapamiętuje systemowe okienko instalacji (Chrome, Edge, Android), żeby Ustawienia mogły je pokazać na przycisk.
export default function CrmApp() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/crm-sw.js", { scope: "/crm" }).catch(() => {});
    const keep = (e: Event) => {
      e.preventDefault();
      window.__crmInstall = e as InstallPrompt;
      window.dispatchEvent(new Event(INSTALL_EVENT));
    };
    const done = () => {
      window.__crmInstall = null;
      window.dispatchEvent(new Event(INSTALL_EVENT));
    };
    window.addEventListener("beforeinstallprompt", keep);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", keep);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  return null;
}
