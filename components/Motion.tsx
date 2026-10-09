"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { initMotion } from "@/lib/motion";

// Uruchamia ruch strony (lib/motion.ts) i płynne przewijanie po każdej zmianie podstrony.
export default function Motion() {
  const pathname = usePathname();
  useEffect(() => initMotion({ Lenis }), [pathname]);
  return null;
}
