// Hero bez filmu: złota panorama Łodzi albo Gdańska nocą (rysunek liniowy na przezroczystym tle, public/hero/panorama*.webp);
// którą pokazać, wybiera lib/region.ts według lokalizacji odwiedzającego.
// Na szerokim ekranie leży na całej szerokości hero, pod napisami; lewa strona jest przygaszona,
// żeby tekst był czytelny. Przy wejściu pojawia się płynnie od zera do 70% krycia, potem lekko podąża za myszą (data-depth).
// Na telefonie kadr pokazuje prawą, najwyższą część panoramy.
// Zostaje, dopóki w lib/data.ts nie ma media.heroVideo.

import type { Region } from "@/lib/region";

const src: Record<Region, string> = { lodz: "/hero/panorama.webp", gdansk: "/hero/panorama-gdansk.webp" };

export default function HeroDrawing({ className = "", region = "lodz" }: { className?: string; region?: Region }) {
  return (
    <div aria-hidden className={className}>
      <div data-depth="18" className="h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src[region]} alt="" className="skyline h-full w-full opacity-70 object-cover object-[78%_100%] lg:object-contain lg:object-bottom" />
      </div>
    </div>
  );
}
