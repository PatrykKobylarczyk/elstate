// Mediana ceny za m² w kolejnych kwartałach: pasek od 25. do 75. percentyla i kropka mediany (zwykłe SVG, bez bibliotek).
type Row = { okres: string; n: number; med: number | null; p25: number | null; p75: number | null };

export default function Trend({ data }: { data: Row[] }) {
  const known = data.filter((r) => r.med);
  if (known.length < 2) return null;
  // ciągła oś kwartałów: luki w rejestrze (np. Łódź 2019–2024) widać jako puste miejsca, a nie sklejone słupki
  const byQ = new Map(known.map((r) => [r.okres, r]));
  const [y0, q0] = known[0].okres.split(" Q").map(Number);
  const [y1, q1] = known[known.length - 1].okres.split(" Q").map(Number);
  const all: Row[] = [];
  for (let i = y0 * 4 + q0 - 1; i <= y1 * 4 + q1 - 1; i++) {
    const okres = `${Math.floor(i / 4)} Q${(i % 4) + 1}`;
    all.push(byQ.get(okres) ?? { okres, n: 0, med: null, p25: null, p75: null });
  }
  const rows = known;
  const hi = Math.max(...rows.map((r) => r.p75 ?? r.med!));
  const lo = Math.min(...rows.map((r) => r.p25 ?? r.med!));
  const step = niceStep((hi - lo) / 4);
  const min = Math.max(0, Math.floor(lo / step) * step);
  const max = Math.ceil(hi / step) * step;
  const W = 720;
  const H = 220;
  const L = 52;
  const B = 28;
  const colW = (W - L) / all.length;
  const y = (v: number) => 8 + (H - B - 8) * (1 - (v - min) / (max - min || 1));
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step);
  const every = Math.ceil(all.length / 12);
  const xOf = (okres: string) => L + colW * (all.findIndex((r) => r.okres === okres) + 0.5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Mediana ceny za metr kwadratowy w kolejnych kwartałach">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W} y1={y(v)} y2={y(v)} className="stroke-graphite/10" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" className="fill-graphite/50 text-[11px] tabular-nums">
            {max >= 2000 ? `${(v / 1000).toLocaleString("pl-PL")} tys.` : v.toLocaleString("pl-PL")}
          </text>
        </g>
      ))}
      {all.map((r, i) =>
        i % every === 0 ? (
          <text key={r.okres} x={L + colW * (i + 0.5)} y={H - 8} textAnchor="middle" className="fill-graphite/50 text-[11px]">
            {r.okres}
          </text>
        ) : null,
      )}
      {rows.map((r) => {
        const x = xOf(r.okres);
        const faint = r.n < 10;
        return (
          <g key={r.okres} className={faint ? "opacity-40" : ""}>
            <title>{`${r.okres}: mediana ${Math.round(r.med!).toLocaleString("pl-PL")} zł/m², ${r.n} transakcji`}</title>
            {r.p25 && r.p75 && <rect x={x - Math.min(colW * 0.28, 9)} width={Math.min(colW * 0.56, 18)} y={y(r.p75)} height={Math.max(y(r.p25) - y(r.p75), 1)} rx={4} className="fill-gold-300" />}
            <circle cx={x} cy={y(r.med!)} r={4} className="fill-plum-900" />
          </g>
        );
      })}
      {/* linia mediany przerywa się na lukach w danych */}
      {all
        .reduce<Row[][]>((segs, r) => {
          if (!r.med) segs.push([]);
          else segs[segs.length - 1].push(r);
          return segs;
        }, [[]])
        .filter((seg) => seg.length > 1)
        .map((seg) => (
          <polyline key={seg[0].okres} fill="none" strokeWidth={1.5} className="stroke-plum-900/40" points={seg.map((r) => `${xOf(r.okres)},${y(r.med!)}`).join(" ")} />
        ))}
    </svg>
  );
}

function niceStep(raw: number) {
  const p = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}
