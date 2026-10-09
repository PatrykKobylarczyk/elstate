import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stare adresy z poprzedniej wersji strony prowadzą do sekcji strony głównej.
  async redirects() {
    return [
      { source: "/uslugi", destination: "/#uslugi", permanent: true },
      { source: "/finanse", destination: "/#finanse", permanent: true },
      { source: "/o-nas", destination: "/#o-nas", permanent: true },
    ];
  },
};

export default nextConfig;
