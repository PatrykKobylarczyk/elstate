// Wspólne klocki wyglądu panelu CRM (bez JavaScriptu po stronie przeglądarki).

export const input =
  "w-full rounded-xl border border-graphite/15 bg-white px-3.5 py-2.5 text-[15px] text-graphite outline-none transition placeholder:text-graphite/35 focus:border-plum-700 focus:ring-2 focus:ring-plum-700/15";
export const btn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-pearl transition hover:bg-plum-700 disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border border-graphite/15 bg-white px-4 py-2 text-sm font-semibold text-graphite transition hover:border-plum-700 hover:text-plum-900 disabled:opacity-50";
export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-full border border-red-700/25 bg-white px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-50";
export const card = "rounded-2xl border border-graphite/10 bg-white p-5 md:p-6";

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[13px] font-semibold text-graphite/70">{label}</span>
      {children}
      {hint && <span className="text-xs text-graphite/45">{hint}</span>}
    </label>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-plum-900 md:text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-graphite/55">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

const tones: Record<string, string> = {
  plum: "bg-plum-900 text-pearl",
  gold: "bg-gold-200 text-plum-950",
  green: "bg-emerald-100 text-emerald-900",
  gray: "bg-graphite/8 text-graphite/70",
  red: "bg-red-100 text-red-900",
  blue: "bg-sky-100 text-sky-900",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof tones | string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone] ?? tones.gray}`}>{children}</span>;
}

export const leadTone: Record<string, string> = { nowy: "plum", do_kontaktu: "gold", w_kontakcie: "blue", umowione: "blue", pozyskany: "green", odrzucony: "gray", do_przejrzenia: "gold", pominiety: "gray" };
export const listingTone: Record<string, string> = { szkic: "gray", aktywna: "green", rezerwacja: "gold", sprzedana: "plum", archiwum: "gray" };

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-graphite/20 p-10 text-center text-sm text-graphite/55">{children}</div>;
}

export const pln = (n: number | null | undefined) => (n ? `${n.toLocaleString("pl-PL")} zł` : "—");
export const when = (d: Date | null | undefined, withTime = true) =>
  d ? d.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) }) : "—";

export function ago(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "przed chwilą";
  if (s < 3600) return `${Math.floor(s / 60)} min temu`;
  if (s < 86400) return `${Math.floor(s / 3600)} godz. temu`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} dni temu`;
  return when(d, false);
}
