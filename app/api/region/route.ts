import { NextResponse } from "next/server";
import { geoHeaders, regionFromGeo } from "@/lib/region";

// Podgląd: co Vercel wie o lokalizacji odwiedzającego i którą panoramę z tego wybieramy (lib/region.ts).
export async function GET() {
  const geo = await geoHeaders();
  const city = (() => {
    try {
      return decodeURIComponent(geo.city);
    } catch {
      return geo.city;
    }
  })();
  return NextResponse.json({ ...geo, city, panorama: regionFromGeo(geo) }, { headers: { "Cache-Control": "no-store" } });
}
