"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Map as LMap, LayerGroup, Marker } from "leaflet";
import { CATEGORY_TABS, fetchNearby, hasPlaces, type NearbyCategory, type Poi } from "@/lib/nearby-core";

// Mapa okolicy oferty jak w N75: znacznik pod adresem oferty, a po rozwinięciu kategorii
// (edukacja, zdrowie, zieleń…) punkty na mapie z linią do oferty i odległością.

// odległość w linii prostej i szacunkowy czas pieszo (droga ok. 1,3× dłuższa, 80 m/min)
export function distTxt(m: number) {
  const mins = Math.max(1, Math.round((m * 1.3) / 80));
  const d = m < 995 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;
  return `${d} · ok. ${mins} min pieszo`;
}

const GOLD = "#c19a5b";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function MapInner({
  home,
  pinLabel,
  categories: initial = [],
  details: detailsProp = false,
  crmProbe = false,
  slug,
  zoom = 16,
  children,
}: {
  home: { lat: number; lng: number };
  pinLabel: string;
  // details: zakładki z okolicą (edukacja, zdrowie, zieleń…) i odległości; na stronie publicznej sama pinezka
  details?: boolean;
  // crmProbe: strona publiczna pyta, czy oglądający jest zalogowany w CRM; jeśli tak, pokazuje okolicę
  crmProbe?: boolean;
  // slug oferty: okolica pobrana raz zapisuje się przy ofercie w CRM
  slug?: string;
  categories?: NearbyCategory[];
  zoom?: number;
  children: ReactNode;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const [open, setOpen] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [details, setDetails] = useState(detailsProp);
  const [serverCats, setServerCats] = useState(initial);
  const hasData = serverCats.some((c) => c.items.length > 0);
  const [categories, setCategories] = useState(hasData ? initial : []);
  const [status, setStatus] = useState<"ok" | "loading" | "error">(hasData ? "ok" : "loading");
  // przyczyny porażek (serwer i przeglądarka), widoczne w CRM pod komunikatem o błędzie
  const [why, setWhy] = useState<{ server: string[]; browser: string[] }>({ server: [], browser: [] });

  // strona publiczna: okolica z odległościami tylko dla zalogowanych w CRM (sama strona zostaje statyczna)
  useEffect(() => {
    if (!crmProbe) return;
    let alive = true;
    fetch(`/api/crm/okolica?slug=${encodeURIComponent(slug ?? "")}&lat=${home.lat}&lng=${home.lng}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { categories: NearbyCategory[]; errors?: string[] } | null) => {
        if (!alive || !j) return;
        if (j.errors?.length) setWhy((w) => ({ ...w, server: j.errors! }));
        if (j.categories.some((c) => c.items.length > 0)) {
          setServerCats(j.categories);
          setCategories(j.categories);
          setStatus("ok");
        }
        setDetails(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [crmProbe, slug, home.lat, home.lng]);
  const [attempt, setAttempt] = useState(0);

  // serwer nie dostał miejsc z Overpass: pobierz je z przeglądarki (wszystkie serwery naraz)
  // i zapisz przy ofercie, żeby następnym razem były od razu
  useEffect(() => {
    if (hasData || !details) return;
    let alive = true;
    setStatus("loading");
    const errors: string[] = [];
    fetchNearby({ lat: home.lat, lng: home.lng }, 30000, {}, errors).then((cats) => {
      if (!alive) return;
      setWhy((w) => ({ ...w, browser: errors }));
      if (hasPlaces(cats)) {
        setCategories(cats);
        setStatus("ok");
        if (slug) fetch("/api/crm/okolica", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, categories: cats }) }).catch(() => {});
      } else setStatus(cats ? "ok" : "error");
    });
    return () => {
      alive = false;
    };
  }, [hasData, details, slug, home.lat, home.lng, attempt]);

  useEffect(() => {
    let alive = true;
    let ro: ResizeObserver | null = null;
    import("leaflet").then((mod) => {
      const Lf = (mod as unknown as { default?: typeof import("leaflet") }).default ?? mod;
      if (!alive || !el.current || map.current) return;
      L.current = Lf;
      const m = Lf.map(el.current, { center: [home.lat, home.lng], zoom, zoomSnap: 0.1, zoomDelta: 0.5, minZoom: 12, maxZoom: 18.5, scrollWheelZoom: false });
      Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        subdomains: "abc",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      Lf.marker([home.lat, home.lng], {
        icon: Lf.divIcon({ className: "offer-pin", html: `<span>${esc(pinLabel)}</span><i></i>`, iconSize: [0, 0], iconAnchor: [0, 0] }),
        keyboard: false,
        title: pinLabel,
        zIndexOffset: 1000,
      }).addTo(m);
      // przycisk powrotu do oferty po przesunięciu mapy
      const Home = Lf.Control.extend({
        options: { position: "topright" },
        onAdd() {
          const b = Lf.DomUtil.create("button", "offer-map__home");
          b.type = "button";
          b.textContent = "Oferta";
          b.setAttribute("aria-label", "Wróć do oferty");
          Lf.DomEvent.on(b, "click", (e) => {
            Lf.DomEvent.stop(e);
            m.flyTo([home.lat, home.lng], zoom, { duration: 0.6 });
          });
          return b;
        },
      });
      m.addControl(new Home());
      map.current = m;
      ro = new ResizeObserver(() => m.invalidateSize());
      ro.observe(el.current);
      setReady(true);
    });
    return () => {
      alive = false;
      ro?.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, [home.lat, home.lng, pinLabel, zoom]);

  // rozwinięta kategoria: punkty, przerywane linie do oferty i kadr obejmujący wszystko
  useEffect(() => {
    const m = map.current;
    const Lf = L.current;
    if (!ready || !m || !Lf) return;
    layer.current?.remove();
    layer.current = null;
    markers.current.clear();
    const cat = categories.find((c) => c.key === open);
    if (!cat) {
      m.flyTo([home.lat, home.lng], zoom, { duration: 0.6 });
      return;
    }
    const g = Lf.layerGroup();
    cat.items.forEach((p, i) => {
      Lf.polyline([[home.lat, home.lng], [p.lat, p.lng]], { color: GOLD, weight: 1.5, dashArray: "4 6", opacity: 0.95 }).addTo(g);
      const mk = Lf.marker([p.lat, p.lng], {
        icon: Lf.divIcon({ className: "poi-pin", html: "<i></i>", iconSize: [18, 18], iconAnchor: [9, 9] }),
        title: p.name,
      }).addTo(g);
      mk.bindTooltip(`<b>${esc(p.name)}</b><br>${distTxt(p.m)}`, { direction: "top", offset: [0, -8], className: "poi-tip", permanent: cat.items.length <= 2 });
      markers.current.set(`${cat.key}-${i}`, mk);
    });
    g.addTo(m);
    layer.current = g;
    m.flyToBounds(Lf.latLngBounds([[home.lat, home.lng], ...cat.items.map((p) => [p.lat, p.lng] as [number, number])]).pad(0.25), { duration: 0.7, maxZoom: 17 });
  }, [open, ready, categories, home.lat, home.lng, zoom]);

  const focus = (key: string, p: Poi) => {
    const mk = markers.current.get(key);
    if (!mk || !map.current) return;
    map.current.flyTo([p.lat, p.lng], 17, { duration: 0.6 });
    mk.openTooltip();
  };

  return (
    <div className="relative isolate mx-auto grid max-w-[96rem] overflow-hidden rounded-[2rem] bg-plum-900 text-pearl md:rounded-[2.5rem] lg:grid-cols-[0.8fr_1.2fr]">
      <div className="flex flex-col gap-10 p-8 md:p-14">
        {children}
        {details && crmProbe && !detailsProp && <p className="-mt-4 text-xs uppercase tracking-[0.18em] text-gold-300">Widoczne tylko dla zalogowanych w CRM</p>}
        {details && (
        <div className="border-t border-pearl/15">
            {CATEGORY_TABS.map((t) => ({ ...t, items: categories.find((c) => c.key === t.key)?.items ?? [] })).map((c) => (
              <details
                key={c.key}
                open={open === c.key}
                className="group border-b border-pearl/15"
                onToggle={(e) => {
                  const isOpen = (e.currentTarget as HTMLDetailsElement).open;
                  setOpen((cur) => (isOpen ? c.key : cur === c.key ? null : cur));
                }}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 [&::-webkit-details-marker]:hidden">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">{c.label}</span>
                  <span className="inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.18em] text-gold-300">
                    Odkryj
                    <span aria-hidden className="text-lg leading-none transition-transform duration-300 group-open:rotate-45">+</span>
                  </span>
                </summary>
                {c.items.length === 0 && (
                  <p className="pb-5 text-sm text-pearl/55">
                    {status === "loading" && "Wczytuję miejsca w okolicy…"}
                    {status === "ok" && "Brak takich miejsc w najbliższej okolicy."}
                    {status === "error" && (
                      <>
                        Nie udało się wczytać miejsc.{" "}
                        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="text-gold-300 underline underline-offset-4">
                          Spróbuj ponownie
                        </button>
                        {(why.server.length > 0 || why.browser.length > 0) && (
                          <span className="mt-2 block text-xs text-pearl/40">
                            {why.server.length > 0 && <>Serwer: {why.server.join("; ")}. </>}
                            {why.browser.length > 0 && <>Telefon: {why.browser.join("; ")}.</>}
                          </span>
                        )}
                      </>
                    )}
                  </p>
                )}
                <ul className="space-y-2.5 pb-5">
                  {c.items.map((p, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => focus(`${c.key}-${i}`, p)}
                        onMouseEnter={() => markers.current.get(`${c.key}-${i}`)?.openTooltip()}
                        className="flex w-full flex-col gap-0.5 text-left text-sm text-pearl/80 transition-colors hover:text-gold-300 sm:flex-row sm:justify-between sm:gap-4"
                      >
                        <span>{p.name}</span>
                        <span className="shrink-0 tabular-nums text-gold-300 sm:text-[0.8rem]">{distTxt(p.m)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
      </div>
      <div className="relative min-h-[22rem] lg:min-h-[38rem]">
        <div ref={el} className="offer-map absolute inset-0" role="region" aria-label={`Mapa: ${pinLabel}`} />
      </div>
    </div>
  );
}

// Gdy serwer nie znalazł współrzędnych adresu (np. Nominatim odrzuca zapytania z Vercel),
// szukamy ich w przeglądarce, od najdokładniejszego zapytania do samego miasta.
export default function LocationMap({
  home,
  queries,
  ...rest
}: Omit<Parameters<typeof MapInner>[0], "home"> & { home: { lat: number; lng: number } | null; queries: string[] }) {
  const [pos, setPos] = useState(home);
  const [failed, setFailed] = useState(false);
  const key = queries.join("|");
  useEffect(() => {
    if (pos) return;
    let alive = true;
    (async () => {
      for (const q of key.split("|")) {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=pl&accept-language=pl&q=${encodeURIComponent(q)}`, {
            signal: AbortSignal.timeout(8000),
          });
          if (!r.ok) continue;
          const [hit] = (await r.json()) as { lat: string; lon: string }[];
          if (hit && alive) {
            setPos({ lat: Number(hit.lat), lng: Number(hit.lon) });
            return;
          }
        } catch {
          // spróbuj ogólniejszego zapytania
        }
      }
      if (alive) setFailed(true);
    })();
    return () => {
      alive = false;
    };
  }, [pos, key]);

  if (pos) return <MapInner home={pos} {...rest} />;
  return (
    <div className="relative isolate mx-auto grid max-w-[96rem] overflow-hidden rounded-[2rem] bg-plum-900 text-pearl md:rounded-[2.5rem] lg:grid-cols-[0.8fr_1.2fr]">
      <div className="flex flex-col gap-10 p-8 md:p-14">
        {rest.children}
        {rest.details && (
        <div className="border-t border-pearl/15">
          {CATEGORY_TABS.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-6 border-b border-pearl/15 py-4">
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">{t.label}</span>
              <span className="text-xs uppercase tracking-[0.18em] text-pearl/40">{failed ? "Brak adresu" : "Wczytuję…"}</span>
            </div>
          ))}
        </div>
        )}
      </div>
      <div className="relative min-h-[22rem] bg-mist lg:min-h-[38rem]" />
    </div>
  );
}
