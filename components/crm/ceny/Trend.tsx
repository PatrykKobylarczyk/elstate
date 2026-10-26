// Mediana ceny za m² w kolejnych kwartałach: pasek od 25. do 75. percentyla i kropka mediany (zwykłe SVG, bez bibliotek).
type Row = { okres: string; n: number; med: number | null; p25: number | null; p75: number | null };

export default function Trend({ data }: { data: Row[] }) {
  const rows = data.filter((r) => r.med);
  if (rows.length < 2) return null;
  const hi = Math.max(...rows.map((r) => r.p75 ?? r.med!));
  const lo = Math.min(...rows.map((r) => r.p25 ?? r.med!));
  const step = niceStep((hi - lo) / 4);
  const min = Math.max(0, Math.floor(lo / step) * step);
  const max = Math.ceil(hi / step) * step;
  const W = 720;
  const H = 220;
  const L = 52;
  const B = 28;
  const colW = (W - L) / rows.length;
  const y = (v: number) => 8 + (H - B - 8) * (1 - (v - min) / (max - min || 1));
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step);
  const every = Math.ceil(rows.length / 12);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Mediana ceny za metr kwadratowy w kolejnych kwartałach">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W} y1={y(v)} y2={y(v)} className="stroke-graphite/10" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" className="fill-graphite/50 text-[11px] tabular-nums">
            {(v / 1000).toLocaleString("pl-PL")} tys.
          </text>
        </g>
      ))}
      {rows.map((r, i) => {
        const x = L + colW * (i + 0.5);
        const faint = r.n < 10;
        return (
          <g key={r.okres} className={faint ? "opacity-40" : ""}>
            <title>{`${r.okres}: mediana ${Math.round(r.med!).toLocaleString("pl-PL")} zł/m², ${r.n} transakcji`}</title>
            {r.p25 && r.p75 && <rect x={x - Math.min(colW * 0.28, 9)} width={Math.min(colW * 0.56, 18)} y={y(r.p75)} height={Math.max(y(r.p25) - y(r.p75), 1)} rx={4} className="fill-gold-300" />}
            <circle cx={x} cy={y(r.med!)} r={4} className="fill-plum-900" />
            {i % every === 0 && (
              <text x={x} y={H - 8} textAnchor="middle" className="fill-graphite/50 text-[11px]">
                {r.okres.replace(" ", " ")}
              </text>
            )}
          </g>
        );
      })}
      <polyline
        fill="none"
        strokeWidth={1.5}
        className="stroke-plum-900/40"
        points={rows.map((r, i) => `${L + colW * (i + 0.5)},${y(r.med!)}`).join(" ")}
      />
    </svg>
  );
}

function niceStep(raw: number) {
  const p = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}
