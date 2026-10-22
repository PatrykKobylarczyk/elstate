import { cookies, headers } from "next/headers";
import { REGION_COOKIE, isRegion, type Region } from "./region-cookie";

// Panorama w hero zależy od tego, skąd ktoś wchodzi: Pomorze (do 150 km od Gdańska) widzi Gdańsk, wszędzie indziej Łódź.
// Wybór odwiedzającego wygrywa z lokalizacją: przełącznik w hero (?panorama=…) zapisuje go w ciasteczku
// (middleware.ts), bo z samego IP często nie da się poznać miasta.
// Lokalizację podaje Vercel w nagłówkach x-vercel-ip-* (przybliżona, z adresu IP; bez pytania o zgodę).
// Same współrzędne bywają mylące: wielu operatorów (zwłaszcza komórkowych) ma w bazach IP punkt w Warszawie
// albo środek Polski, więc najpierw patrzymy na województwo i miasto, a odległość jest dopiero trzecim sygnałem.
// Lokalnie i gdy nagłówków brak: Łódź. Ręcznie: /?panorama=gdansk lub /?panorama=lodz (zostaje zapamiętane),
// a co widzi Vercel: /api/region.

export type { Region };

const GDANSK = { lat: 54.352, lon: 18.6466 };
const RADIUS_KM = 150;
// ISO 3166-2:PL bez prefiksu kraju: 22 = pomorskie
const POMORSKIE = "22";
const POMORZE_CITIES = ["gdansk", "gdynia", "sopot", "rumia", "reda", "wejherowo", "pruszcz gdanski", "tczew", "kartuzy", "starogard gdanski", "slupsk", "malbork", "elblag"];

function distanceKm(lat: number, lon: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat - GDANSK.lat);
  const dLon = rad(lon - GDANSK.lon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(GDANSK.lat)) * Math.cos(rad(lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

// Vercel koduje miasto jak w URL-u („Gda%C5%84sk”); porównujemy bez polskich znaków i wielkości liter
function normalizeCity(raw: string) {
  let city = raw;
  try {
    city = decodeURIComponent(raw);
  } catch {}
  return city.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[-\s]+/g, " ").trim();
}

export type GeoHeaders = { country: string; region: string; city: string; lat: string; lon: string };

export async function geoHeaders(): Promise<GeoHeaders> {
  const h = await headers();
  return {
    country: h.get("x-vercel-ip-country") ?? "",
    region: h.get("x-vercel-ip-country-region") ?? "",
    city: h.get("x-vercel-ip-city") ?? "",
    lat: h.get("x-vercel-ip-latitude") ?? "",
    lon: h.get("x-vercel-ip-longitude") ?? "",
  };
}

export function regionFromGeo(g: GeoHeaders): Region {
  if (g.country && g.country !== "PL") return "lodz";
  if (g.region.replace(/^PL-/i, "") === POMORSKIE) return "gdansk";
  if (g.city && POMORZE_CITIES.includes(normalizeCity(g.city))) return "gdansk";
  const lat = parseFloat(g.lat);
  const lon = parseFloat(g.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return "lodz";
  return distanceKm(lat, lon) <= RADIUS_KM ? "gdansk" : "lodz";
}

export async function visitorRegion(override?: string): Promise<Region> {
  if (isRegion(override)) return override;
  const saved = (await cookies()).get(REGION_COOKIE)?.value;
  if (isRegion(saved)) return saved;
  return regionFromGeo(await geoHeaders());
}
