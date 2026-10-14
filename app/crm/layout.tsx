import type { Metadata, Viewport } from "next";
import CrmApp from "@/components/crm/CrmApp";

export const metadata: Metadata = {
  title: { default: "CRM", template: "%s | CRM Elstate" },
  robots: { index: false, follow: false },
  // aplikacja na telefon (PWA): ikona na ekranie głównym, pełny ekran, powiadomienia
  manifest: "/crm.webmanifest",
  applicationName: "Elstate CRM",
  appleWebApp: { capable: true, title: "Elstate", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/crm-icons/icon-192.png", sizes: "192x192" }], apple: "/crm-icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#320920", viewportFit: "cover" };

export const dynamic = "force-dynamic";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-pearl text-graphite">
      {children}
      <CrmApp />
    </div>
  );
}
