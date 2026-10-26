"use client";

import { useEffect } from "react";

// Service worker Listy: powiadomienia, licznik na ikonie, praca bez sieci
export default function RegisterSw() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/lista-sw.js", { scope: "/lista" }).catch(() => {});
  }, []);
  return null;
}
