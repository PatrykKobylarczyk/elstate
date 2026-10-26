import type { Metadata, Viewport } from "next";
import RegisterSw from "@/components/lista/RegisterSw";

// Lista: osobna aplikacja na telefon (PWA) ze wspólną listą zadań, własną ikoną, powiadomieniami i licznikiem na ikonie
export const metadata: Metadata = {
  title: "Lista",
  robots: { index: false, follow: false },
  manifest: "/lista.webmanifest",
  applicationName: "Lista",
  appleWebApp: { capable: true, title: "Lista", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/lista-icons/icon-192.png", sizes: "192x192" }], apple: "/lista-icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#320920", viewportFit: "cover" };

export const dynamic = "force-dynamic";

export default function ListaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-pearl text-graphite">
      {children}
      <RegisterSw />
    </div>
  );
}
