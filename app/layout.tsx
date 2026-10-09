import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Motion from "@/components/Motion";
import Intro, { introScript } from "@/components/Intro";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ELSTATE | Butikowa agencja nieruchomości w Łodzi", template: "%s | ELSTATE" },
  description:
    "ELSTATE to butikowa agencja nieruchomości z Łodzi. Sprzedaż i wynajem na rynku pierwotnym i wtórnym, indywidualna strategia i kreatywny marketing.",
  metadataBase: new URL("https://www.elstate.pl"),
  openGraph: { locale: "pl_PL", siteName: "ELSTATE nieruchomości", type: "website" },
};

// Pasek stanu i pasek adresu na iPhonie mają kolor fioletu, jak hero i stopka
export const viewport: Viewport = { themeColor: "#320920" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={manrope.variable} suppressHydrationWarning>
      <head>
        <script id="intro-js" dangerouslySetInnerHTML={{ __html: introScript }} />
      </head>
      <body>
        <Intro />
        <Nav />
        <main>{children}</main>
        <Footer />
        <Motion />
      </body>
    </html>
  );
}
