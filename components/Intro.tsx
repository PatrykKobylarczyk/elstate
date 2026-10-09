// Ekran startowy: złote „elstate” z fioletową kropką i napisem „nieruchomości”, potem kurtyna zjeżdża w dół i odsłania hero.
// Pokazuje się tylko przy pierwszym wejściu w danej wizycie (sessionStorage). Skrypt w <head> ustawia klasę `intro`
// na <html> przed pierwszym malowaniem, więc nie ma mignięcia strony; animacje hero czekają (globals.css) do jej zdjęcia.

export const introScript = `(function(){try{var d=document.documentElement;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var s=null;try{s=sessionStorage}catch(e){}if(s&&s.getItem("elstate-intro"))return;if(s)s.setItem("elstate-intro","1");d.classList.add("intro");setTimeout(function(){d.classList.remove("intro")},2900)}catch(e){}})();`;

export default function Intro() {
  return (
    <div aria-hidden className="intro-screen fixed inset-0 z-[100] hidden flex-col items-center justify-center bg-pearl">
      <p className="intro-logo font-display text-[clamp(4rem,14vw,10rem)] font-bold leading-none tracking-[-0.03em] text-gold-500">
        elstate<span className="intro-dot inline-block text-plum-900">.</span>
      </p>
      <p className="intro-sub mt-4 text-xs font-light uppercase tracking-[0.5em] text-plum-900 md:mt-6 md:text-sm">nieruchomości</p>
    </div>
  );
}
