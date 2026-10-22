// Wspólne dla lib/region.ts i middleware.ts (middleware nie może importować next/headers).
export type Region = "lodz" | "gdansk";

export const REGION_COOKIE = "elstate_panorama";

export function isRegion(v?: string): v is Region {
  return v === "lodz" || v === "gdansk";
}
