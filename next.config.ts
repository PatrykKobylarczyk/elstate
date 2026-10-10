import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (lokalna baza do testów) ładuje własne pliki WASM, więc nie przechodzi przez bundler
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    // zdjęcia ofert z CRM leżą w Vercel Blob
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  experimental: {
    // zdjęcia ofert wysyłamy z CRM pojedynczo, po zmniejszeniu w przeglądarce
    serverActions: { bodySizeLimit: "8mb" },
  },
  // Stare adresy z poprzedniej wersji strony prowadzą do sekcji strony głównej.
  async redirects() {
    return [
      { source: "/uslugi", destination: "/#uslugi", permanent: true },
      { source: "/finanse", destination: "/#finanse", permanent: true },
      { source: "/o-nas", destination: "/#o-nas", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      {
        // CRM: poza wyszukiwarkami, bez osadzania w ramkach, bez cache
        source: "/crm/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cache-Control", value: "no-store" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
