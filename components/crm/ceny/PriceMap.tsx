"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Punkt } from "@/lib/crm/ceny";

// Mapa transakcji: kropka w kolorze ceny za m² (pięć przedziałów z widocznych punktów), kliknięcie pokazuje szczegóły.
// Leaflet rysuje na płótnie (canvas), więc kilka tysięcy punktów nie spowalnia strony. Podkład: CARTO Positron (OpenStreetMap).
const COLORS = ["#2f6f73", "#7fa98a", "#dcc193", "#c9824e", "#8a2a3b"];
const NO_PRICE = "#9a9a9e";

const fmt = (n: number) => Math.round(n).toLocaleString("pl-PL");

function breaksOf(points: Punkt[]) {
  const v = points.map((p) => p[2]).filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (v.length < 5) return [];
  return [0.2, 0.4, 0.6, 0.8].map((q) => v[Math.floor(q * (v.length - 1))]);
}

export default function PriceMap({ points }: { points: Punkt[] }) {
  const el = useRef<HTMLDivElement>(null);
  const [breaks] = useState(() => breaksOf(points));

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current) return;
      map = L.map(el.current, { preferCanvas: true, scrollWheelZoom: false, attributionControl: true });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a> · RCN: GUGiK',
      }).addTo(map);
      const renderer = L.canvas({ padding: 0.3 });
      const color = (m2: number | null) => (m2 === null || !breaks.length ? NO_PRICE : COLORS[breaks.filter((b) => m2 > b).length]);
      const layer = L.featureGroup();
      for (const [lat, lng, m2, id] of points) {
        L.circleMarker([lat, lng], { renderer, radius: 5, weight: 1, color: "#fff", fillColor: color(m2), fillOpacity: 0.9 })
          .bindPopup(() => {
            const div = document.createElement("div");
            div.textContent = "Wczytuję…";
            fetch(`/api/crm/ceny/${encodeURIComponent(id)}`)
              .then((r) => r.json())
              .then(({ row }) => {
                if (!row) return;
                const addr = [row.ulica && `${row.ulica} ${row.numer ?? ""}`.trim(), row.miejscowosc].filter(Boolean).join(", ");
                div.innerHTML = "";
                const lines = [
                  [addr || row.powiat, "font-weight:600"],
                  [`${fmt(row.cena)} zł${row.cenaM2 ? ` · ${fmt(row.cenaM2)} zł/m²` : ""}`, "font-weight:600;color:#320920"],
                  [[row.data, row.pow && `${String(Math.round(row.pow * 10) / 10).replace(".", ",")} m²`, row.pokoje && `${row.pokoje} pok.`, row.rynek === "pierwotny" ? "rynek pierwotny" : row.rynek === "wtorny" ? "rynek wtórny" : null, row.funkcja].filter(Boolean).join(" · "), "color:#666"],
                ] as const;
                for (const [t, style] of lines) {
                  const p = document.createElement("div");
                  p.textContent = String(t);
                  p.style.cssText = style;
                  div.append(p);
                }
              })
              .catch(() => (div.textContent = "Nie udało się wczytać szczegółów."));
            return div;
          })
          .addTo(layer);
      }
      layer.addTo(map);
      map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 15 });
      // kółko myszy przybliża dopiero po kliknięciu w mapę, żeby nie przechwytywać przewijania strony
      map.once("click", () => map?.scrollWheelZoom.enable());
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points, breaks]);

  return (
    <div className="overflow-hidden rounded-2xl border border-graphite/10 bg-white">
      <div ref={el} className="z-0 h-[26rem] md:h-[34rem]" />
      {breaks.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-xs text-graphite/65">
          <span className="font-semibold">zł/m²</span>
          {COLORS.map((c, i) => (
            <span key={c} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: c }} />
              {i === 0 ? `do ${fmt(breaks[0])}` : i === COLORS.length - 1 ? `od ${fmt(breaks[i - 1])}` : `${fmt(breaks[i - 1])}–${fmt(breaks[i])}`}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: NO_PRICE }} />
            bez ceny za m²
          </span>
        </div>
      )}
    </div>
  );
}
