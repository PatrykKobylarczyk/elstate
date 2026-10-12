// Strzałka jako SVG: znaki ↗ i ← iOS rysuje jako emoji, więc nie używamy ich w tekście.
const paths = {
  "up-right": "M7 17 17 7M8 7h9v9",
  left: "M19 12H5M11 6l-6 6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
};

export default function Arrow({ dir = "up-right", className = "" }: { dir?: keyof typeof paths; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={`inline-block size-[1em] shrink-0 ${className}`}>
      <path d={paths[dir]} />
    </svg>
  );
}
