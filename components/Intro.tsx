// Ekran startowy: złote „elstate” z fioletową kropką i napisem „nieruchomości”, potem kurtyna zjeżdża w dół i odsłania hero.
// Pokazuje się tylko przy pierwszym wejściu w danej wizycie (sessionStorage). Skrypt w <head> ustawia klasę `intro`
// na <html> przed pierwszym malowaniem, więc nie ma mignięcia strony; animacje hero czekają (globals.css) do jej zdjęcia.

export const introScript = `(function(){try{var d=document.documentElement;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var s=null;try{s=sessionStorage}catch(e){}if(s&&s.getItem("elstate-intro"))return;if(s)s.setItem("elstate-intro","1");d.classList.add("intro");setTimeout(function(){d.classList.remove("intro")},3700)}catch(e){}})();`;

export default function Intro() {
  return (
    <div aria-hidden className="intro-screen fixed inset-0 z-[100] hidden flex-col items-center justify-center bg-pearl">
      <div className="intro-content flex flex-col items-center gap-2">
        <p className="intro-logo flex font-display text-[2rem] font-semibold leading-none tracking-[-0.02em] text-gold-500 md:text-[2.5rem]">
          elstate
          <span className="overflow-hidden pb-[0.1em]">
            <span className="intro-dot inline-block text-plum-900">.</span>
          </span>
        </p>
        {/* litery wjeżdżają od dołu jedna po drugiej, jak w loaderze poprzedniej strony */}
        <p className="flex overflow-hidden text-[0.8rem] font-extralight uppercase tracking-[0.3em] text-plum-900 md:text-sm">
          {[..."nieruchomości"].map((c, i) => (
            <span key={i} className="intro-char inline-block" style={{ animationDelay: `${0.3 + i * 0.02}s` }}>
              {c}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
