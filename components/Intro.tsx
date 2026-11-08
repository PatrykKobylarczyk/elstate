// Ekran startowy jak w N75: „elstate” rysuje się złotą kreską, wypełnia się, potem wjeżdża „nieruchomości”,
// na końcu fioletowa kropka, a rosnący okrąg odsłania hero. Kliknięcie, klawisz, kółko lub dotyk pomija intro.
// Pokazuje się przy pierwszym wejściu w danej wizycie (sessionStorage). Skrypt w <head> ustawia klasę `intro`
// na <html> przed pierwszym malowaniem, więc nie ma mignięcia strony; animacje hero czekają (globals.css) do otwarcia.
// Podgląd: ?intro wymusza czołówkę, ?intro=kontur pokazuje wariant z kropką rysowaną konturem zamiast wjeżdżającej.

export const introScript = `(function(){try{
var d=document.documentElement,q=location.search,force=/[?&]intro\\b/.test(q);
if(location.pathname.indexOf("/crm")===0||location.pathname.indexOf("/lista")===0||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
var s=null;try{s=sessionStorage}catch(e){}
if(!force&&s&&s.getItem("elstate-intro"))return;if(s)s.setItem("elstate-intro","1");
if(/[?&]intro=kontur\\b/.test(q))d.classList.add("intro-dot-outline");
d.classList.add("intro");
var done=0,t=[];
function end(){d.classList.remove("intro","intro-open","intro-skip","intro-dot-outline")}
function fin(fast){if(done)return;done=1;t.forEach(clearTimeout);d.classList.add(fast?"intro-skip":"intro-open");setTimeout(end,fast?450:1250)}
t.push(setTimeout(function(){fin(0)},3300));
["click","keydown","wheel","touchstart"].forEach(function(e){addEventListener(e,function(){fin(1)},{once:true,passive:true})});
}catch(e){}})();`;

// prettier-ignore
const LETTERS: string[][] = [
  ["M619 2162Q458 2162 337 2091Q215 2021 148 1894Q80 1768 80 1601Q80 1424 147 1294Q213 1164 332 1093Q451 1022 609 1022Q774 1022 890 1099Q1006 1175 1063 1316Q1121 1457 1109 1651H900V1575Q898 1387 828 1297Q759 1207 617 1207Q460 1207 381 1306Q302 1405 302 1592Q302 1770 381 1867Q460 1965 609 1965Q707 1965 778 1920Q850 1876 890 1793L1095 1858Q1032 2003 904 2082Q776 2162 619 2162Z", "M234 1651V1488H1005V1651Z"], // e
  ["M1313 2132V662H1522V2132Z"], // l
  ["M2195 2161Q1998 2161 1874 2074Q1750 1987 1722 1829L1936 1796Q1956 1880 2029 1929Q2101 1977 2209 1977Q2307 1977 2362 1937Q2418 1897 2418 1827Q2418 1786 2399 1761Q2379 1735 2317 1712Q2255 1689 2128 1655Q1989 1619 1907 1578Q1826 1536 1792 1481Q1757 1425 1757 1346Q1757 1248 1809 1175Q1861 1102 1956 1062Q2050 1022 2177 1022Q2301 1022 2398 1061Q2495 1100 2555 1172Q2615 1243 2627 1339L2413 1378Q2402 1300 2340 1255Q2278 1210 2179 1206Q2084 1202 2025 1238Q1966 1273 1966 1335Q1966 1371 1989 1396Q2011 1421 2076 1444Q2141 1467 2268 1499Q2404 1534 2484 1577Q2564 1619 2599 1677Q2633 1736 2633 1819Q2633 1979 2517 2070Q2400 2161 2195 2161Z"], // s
  ["M3432 2132Q3330 2152 3232 2149Q3134 2146 3057 2111Q2980 2076 2941 2001Q2906 1934 2904 1864Q2901 1795 2901 1707V752H3111V1697Q3111 1762 3112 1810Q3114 1858 3133 1891Q3169 1953 3247 1961Q3326 1970 3432 1955Z", "M2694 1220V1052H3432V1220Z"], // t
  ["M3924 2162Q3804 2162 3723 2118Q3642 2073 3600 2000Q3559 1926 3559 1838Q3559 1756 3588 1694Q3617 1632 3674 1588Q3731 1545 3814 1518Q3886 1497 3977 1481Q4068 1465 4168 1451Q4269 1437 4368 1423L4292 1465Q4294 1338 4238 1277Q4183 1215 4048 1215Q3963 1215 3892 1255Q3821 1294 3793 1385L3598 1325Q3638 1186 3750 1104Q3863 1022 4050 1022Q4195 1022 4302 1072Q4410 1121 4460 1228Q4486 1281 4492 1340Q4498 1399 4498 1467V2132H4313V1885L4349 1917Q4282 2041 4178 2101Q4075 2162 3924 2162Z", "M3961 1991Q4050 1991 4114 1960Q4178 1928 4217 1879Q4256 1830 4268 1777Q4285 1729 4287 1669Q4290 1609 4290 1573L4358 1598Q4259 1613 4178 1625Q4097 1637 4032 1649Q3966 1660 3915 1676Q3872 1691 3838 1712Q3805 1733 3785 1763Q3766 1793 3766 1836Q3766 1878 3787 1913Q3808 1949 3851 1970Q3894 1991 3961 1991Z"], // a
  ["M5336 2132Q5234 2152 5136 2149Q5038 2146 4961 2111Q4884 2076 4845 2001Q4810 1934 4808 1864Q4805 1795 4805 1707V752H5015V1697Q5015 1762 5016 1810Q5018 1858 5037 1891Q5073 1953 5151 1961Q5230 1970 5336 1955Z", "M4598 1220V1052H5336V1220Z"], // t
  ["M6002 2162Q5841 2162 5720 2091Q5598 2021 5531 1894Q5463 1768 5463 1601Q5463 1424 5530 1294Q5596 1164 5715 1093Q5834 1022 5992 1022Q6157 1022 6273 1099Q6389 1175 6446 1316Q6504 1457 6492 1651H6283V1575Q6281 1387 6211 1297Q6142 1207 6000 1207Q5843 1207 5764 1306Q5685 1405 5685 1592Q5685 1770 5764 1867Q5843 1965 5992 1965Q6090 1965 6161 1920Q6233 1876 6273 1793L6478 1858Q6415 2003 6287 2082Q6159 2162 6002 2162Z", "M5617 1651V1488H6388V1651Z"], // e
];
const DOT = "M6712 2132V1911H6933V2132Z";

// kolejne litery zaczynają rysowanie co 70 ms, jak w N75
const letterDelay = (i: number) => `${0.15 + i * 0.07}s`;

export default function Intro() {
  return (
    <div aria-hidden className="intro-screen fixed inset-0 z-[100] hidden place-items-center overflow-hidden">
      <div className="intro-iris" />
      <div className="intro-content relative flex flex-col items-center gap-5 md:gap-6">
        <svg className="intro-logo" viewBox="50 632 6914 1560" fill="none">
          <defs>
            <clipPath id="intro-dot-clip">
              <rect x="6600" y="1700" width="440" height="470" />
            </clipPath>
          </defs>
          {/* kontur: każdy fragment litery osobno, żeby kreska biegła po każdym obrysie */}
          {LETTERS.map((outline, i) => (
            <g key={i} className="intro-stroke">
              {outline.map((d, j) => (
                <path key={j} d={d} pathLength={1} style={{ animationDelay: letterDelay(i) }} />
              ))}
            </g>
          ))}
          <g className="intro-fill">
            {LETTERS.map((outline, i) => (
              <path key={i} d={outline.join("")} />
            ))}
          </g>
          <g clipPath="url(#intro-dot-clip)">
            <path className="intro-dot" d={DOT} pathLength={1} />
          </g>
        </svg>
        {/* litery wjeżdżają od dołu jedna po drugiej */}
        <p className="flex overflow-hidden text-[0.8rem] font-extralight uppercase leading-[1.4] tracking-[0.3em] text-plum-900 md:text-[0.95rem]">
          {[..."nieruchomości"].map((c, i) => (
            <span key={i} className="intro-char inline-block" style={{ animationDelay: `${1.7 + i * 0.025}s` }}>
              {c}
            </span>
          ))}
        </p>
      </div>
      <span className="intro-skip-hint absolute inset-x-0 bottom-7 text-center text-[10px] uppercase tracking-[0.25em] text-graphite/60">
        Kliknij, aby pominąć
      </span>
    </div>
  );
}
