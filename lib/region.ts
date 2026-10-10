import { headers } from "next/headers";

// Panorama w hero zależy od tego, skąd ktoś wchodzi: do 150 km od Gdańska pokazujemy Gdańsk, wszędzie indziej Łódź.
// Lokalizację podaje Vercel w nagłówkach x-vercel-ip-latitude / -longitude (przybliżona, z adresu IP; bez pytania o zgodę).
// Lokalnie i gdy nagłówków brak: Łódź. Do sprawdzenia ręcznie: /?panorama=gdansk lub /?panorama=lodz.
export type Region = "lodz" | "gdansk";

const GDANSK = { lat: 54.352, lon: 18.6466 };
const RADIUS_KM = 150;

function distanceKm(lat: number, lon: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat - GDANSK.lat);
  const dLon = rad(lon - GDANSK.lon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(GDANSK.lat)) * Math.cos(rad(lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

export async function visitorRegion(override?: string): Promise<Region> {
  if (override === "gdansk" || override === "lodz") return override;
  const h = await headers();
  const lat = parseFloat(h.get("x-vercel-ip-latitude") ?? "");
  const lon = parseFloat(h.get("x-vercel-ip-longitude") ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lon)) return "lodz";
  return distanceKm(lat, lon) <= RADIUS_KM ? "gdansk" : "lodz";
}
