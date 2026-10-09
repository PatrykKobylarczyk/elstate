// Schematyczny rzut mieszkania rysowany z liczby pokoi i metrażu.
// Służy jako grafika oferty, dopóki nie ma zdjęć. To ilustracja, nie rzut techniczny.

type Rect = { x: number; y: number; w: number; h: number };

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const W = 320;
const H = 210;

function layout(rooms: number, seed: string) {
  const rnd = seeded(seed);
  const rects: Rect[] = [{ x: 0, y: 0, w: W, h: H }];
  const pieces = rooms + 2; // pokoje + łazienka + hol
  while (rects.length < pieces) {
    rects.sort((a, b) => b.w * b.h - a.w * a.h);
    const r = rects.shift()!;
    const t = 0.36 + rnd() * 0.28;
    if (r.w >= r.h) {
      const w1 = Math.round(r.w * t);
      rects.push({ x: r.x, y: r.y, w: w1, h: r.h }, { x: r.x + w1, y: r.y, w: r.w - w1, h: r.h });
    } else {
      const h1 = Math.round(r.h * t);
      rects.push({ x: r.x, y: r.y, w: r.w, h: h1 }, { x: r.x, y: r.y + h1, w: r.w, h: r.h - h1 });
    }
  }
  rects.sort((a, b) => b.w * b.h - a.w * a.h);
  return rects;
}

function names(rooms: number) {
  if (rooms === 1) return ["pokój", "hol", "łazienka"];
  const list = ["salon"];
  for (let i = 1; i < rooms; i++) list.push(i === 1 ? "sypialnia" : "pokój");
  return [...list, "hol", "łazienka"];
}

export default function FloorPlan({
  rooms,
  area,
  seed,
  className = "",
  gapClass = "stroke-plum-900",
}: {
  rooms: number;
  area: number;
  seed: string;
  className?: string;
  gapClass?: string;
}) {
  const rects = layout(rooms, seed);
  const labels = names(rooms);
  const total = W * H;

  return (
    <svg
      viewBox={`-14 -14 ${W + 28} ${H + 40}`}
      className={className}
      role="img"
      aria-label={`Schematyczny rzut: ${rooms} pok., ${area} m²`}
      fill="none"
    >
      {rects.map((r, i) => {
        const interiorRight = r.x + r.w < W;
        const interiorBottom = r.y + r.h < H;
        // drzwi na wewnętrznej ścianie: prawej albo dolnej
        const door = interiorRight
          ? { x1: r.x + r.w, y1: r.y + r.h / 2 - 9, x2: r.x + r.w, y2: r.y + r.h / 2 + 9, arc: `M${r.x + r.w} ${r.y + r.h / 2 - 9} A18 18 0 0 0 ${r.x + r.w - 18} ${r.y + r.h / 2 + 9}` }
          : interiorBottom
            ? { x1: r.x + r.w / 2 - 9, y1: r.y + r.h, x2: r.x + r.w / 2 + 9, y2: r.y + r.h, arc: `M${r.x + r.w / 2 - 9} ${r.y + r.h} A18 18 0 0 1 ${r.x + r.w / 2 + 9} ${r.y + r.h - 18}` }
            : null;
        const m2 = (r.w * r.h * area) / total;
        return (
          <g key={i}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} stroke="currentColor" strokeWidth={1.2} />
            {door && (
              <>
                <line x1={door.x1} y1={door.y1} x2={door.x2} y2={door.y2} className={gapClass} strokeWidth={3} />
                <path d={door.arc} stroke="currentColor" strokeWidth={0.6} strokeDasharray="2 2" />
              </>
            )}
            {r.w > 54 && r.h > 34 && (
              <text
                x={r.x + r.w / 2}
                y={r.y + r.h / 2}
                textAnchor="middle"
                fill="currentColor"
                className="font-sans"
                style={{ fontSize: 9, letterSpacing: "0.12em" }}
              >
                <tspan x={r.x + r.w / 2} dy="-0.2em" style={{ textTransform: "uppercase", opacity: 0.7 }}>
                  {labels[i]}
                </tspan>
                <tspan x={r.x + r.w / 2} dy="1.4em" style={{ fontSize: 10 }}>
                  {m2.toFixed(1).replace(".", ",")} m²
                </tspan>
              </text>
            )}
          </g>
        );
      })}
      <rect x={0} y={0} width={W} height={H} stroke="currentColor" strokeWidth={3.5} />
      <g fill="currentColor" className="font-sans" style={{ fontSize: 8, letterSpacing: "0.2em" }}>
        <line x1={0} y1={H + 18} x2={60} y2={H + 18} stroke="currentColor" strokeWidth={1} />
        <line x1={0} y1={H + 14} x2={0} y2={H + 22} stroke="currentColor" strokeWidth={1} />
        <line x1={60} y1={H + 14} x2={60} y2={H + 22} stroke="currentColor" strokeWidth={1} />
        <text x={68} y={H + 21} opacity={0.6}>RZUT POGLĄDOWY</text>
        <text x={W} y={H + 21} textAnchor="end" opacity={0.6}>N ↑</text>
      </g>
    </svg>
  );
}
