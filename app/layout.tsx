import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Motion from "@/components/Motion";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ELSTATE | Butikowa agencja nieruchomości w Łodzi", template: "%s | ELSTATE" },
  description:
    "ELSTATE to butikowa agencja nieruchomości z Łodzi. Sprzedaż i wynajem na rynku pierwotnym i wtórnym, indywidualna strategia i kreatywny marketing.",
  metadataBase: new URL("https://www.elstate.pl"),
  openGraph: { locale: "pl_PL", siteName: "ELSTATE nieruchomości", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={manrope.variable}>
      <body>
        <Nav />
        <main>{children}</main>
        <Footer />
        <Motion />
      </body>
    </html>
  );
}
