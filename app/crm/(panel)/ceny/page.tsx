import type { Metadata } from "next";
import Link from "next/link";
import AutoSubmitSelect from "@/components/crm/AutoSubmitSelect";
import PriceMap from "@/components/crm/ceny/PriceMap";
import Trend from "@/components/crm/ceny/Trend";
import { Badge, Empty, Field, PageHead, card, input, when } from "@/components/crm/ui";
import { requireUser } from "@/lib/crm/auth";
import { GRUPY, KEYS, PAGE, POWIATY, RODZAJE, RYNKI, compare, lastImport, normalize, points, rows, summary, trend, type CenyQuery } from "@/lib/crm/ceny";

export const metadata: Metadata = { title: "Ceny transakcyjne" };

const zl = (n: number | null | undefined) => (n || n === 0 ? `${Math.round(n).toLocaleString("pl-PL")} zł` : "—");
const m2 = (n: number | null | undefined) => (n ? `${Math.round(n).toLocaleString("pl-PL")} zł/m²` : "—");
const area = (n: number | null | undefined) => (n ? `${(Math.round(n * 10) / 10).toLocaleString("pl-PL")} m²` : "—");
const plDate = (s: string) => new Date(`${s}T12:00:00Z`).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
const rodzajLabel = Object.fromEntries(RODZAJE);
const rynekLabel = Object.fromEntries(RYNKI);

function link(q: CenyQuery, patch: CenyQuery) {
  const all = { ...q, ...patch };
  const qs = new URLSearchParams(KEYS.filter((k) => all[k]).map((k) => [k, all[k]!]));
  return `/crm/ceny?${qs}`;
}

export default async function Ceny({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const q = normalize(await searchParams);
  const [imp, s, tr, cmp, list, pts] = await Promise.all([lastImport(), summary(q), trend(q), compare(q), rows(q), points(q)]);
  const page = Math.max(1, Number(q.strona) || 1);
  const isLand = q.rodzaj === "dzialka";
  const groupBy = (nazwa: string): CenyQuery | null => {
    if (q.grupa === "powiat") return { powiat: POWIATY.find(([, n]) => n === nazwa)?.[0], grupa: "miejscowosc", strona: "" };
    if (q.grupa === "miejscowosc") return { miejscowosc: nazwa, grupa: "ulica", strona: "" };
    if (q.grupa === "ulica" && !nazwa.startsWith("(")) return { ulica: nazwa, grupa: "rok", strona: "" };
    return null;
  };

  if (!imp.n) {
    return (
      <>
        <PageHead title="Ceny transakcyjne" />
        <Empty>
          Baza cen jest jeszcze pusta. Dane z Rejestru Cen Nieruchomości wczytuje zadanie „Import cen RCN” w GitHub Actions (raz w miesiącu albo ręcznie przyciskiem
          „Run workflow”). Szczegóły w README.
        </Empty>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Ceny transakcyjne"
        sub={<>Rejestr Cen Nieruchomości, woj. łódzkie · {imp.n.toLocaleString("pl-PL")} transakcji · import {when(imp.at, false)}</>}
      />

      {/* zwykły formularz GET: adres strony to zapisany widok, można go wysłać komuś z zespołu */}
      <form action="/crm/ceny" className={`${card} mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4`}>
        <input type="hidden" name="grupa" value={q.grupa} />
        <Field label="Rodzaj">
          <AutoSubmitSelect name="rodzaj" defaultValue={q.rodzaj} className={input}>
            {RODZAJE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            <option value="wszystkie">Wszystko</option>
          </AutoSubmitSelect>
        </Field>
        <Field label="Powiat">
          <AutoSubmitSelect name="powiat" defaultValue={q.powiat ?? ""} className={input}>
            <option value="">Całe województwo</option>
            {POWIATY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </AutoSubmitSelect>
        </Field>
        <Field label="Miejscowość">
          <input name="miejscowosc" defaultValue={q.miejscowosc} placeholder="np. Pabianice" className={input} />
        </Field>
        <Field label="Ulica">
          <input name="ulica" defaultValue={q.ulica} placeholder="np. Piotrkowska" className={input} />
        </Field>
        <Field label="Rynek">
          <AutoSubmitSelect name="rynek" defaultValue={q.rynek ?? ""} className={input}>
            <option value="">Oba</option>
            {RYNKI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </AutoSubmitSelect>
        </Field>
        <Field label={isLand ? "Pole działki, m²" : "Powierzchnia, m²"}>
          <span className="flex gap-2">
            <input name="powOd" defaultValue={q.powOd} inputMode="decimal" placeholder="od" className={input} />
            <input name="powDo" defaultValue={q.powDo} inputMode="decimal" placeholder="do" className={input} />
          </span>
        </Field>
        <Field label="Cena za m², zł">
          <span className="flex gap-2">
            <input name="m2Od" defaultValue={q.m2Od} inputMode="numeric" placeholder="od" className={input} />
            <input name="m2Do" defaultValue={q.m2Do} inputMode="numeric" placeholder="do" className={input} />
          </span>
        </Field>
        <Field label="Okres (miesiąc)">
          <span className="flex gap-2">
            <input name="od" type="month" defaultValue={q.od?.slice(0, 7)} className={input} />
            <input name="do" type="month" defaultValue={q.do?.slice(0, 7)} className={input} />
          </span>
        </Field>
        {q.rodzaj === "mieszkanie" && (
          <Field label="Pokoje">
            <AutoSubmitSelect name="pokoje" defaultValue={q.pokoje ?? ""} className={input}>
              <option value="">Dowolnie</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4 i więcej</option>
            </AutoSubmitSelect>
          </Field>
        )}
        <Field label="Cena całkowita, zł">
          <span className="flex gap-2">
            <input name="cenaOd" defaultValue={q.cenaOd} inputMode="numeric" placeholder="od" className={input} />
            <input name="cenaDo" defaultValue={q.cenaDo} inputMode="numeric" placeholder="do" className={input} />
          </span>
        </Field>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1 lg:col-start-4">
          <button className="inline-flex flex-1 items-center justify-center rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-pearl hover:bg-plum-700">Pokaż</button>
          <Link href="/crm/ceny" className="rounded-full px-3 py-2.5 text-sm font-semibold text-graphite/60 hover:text-plum-900">Wyczyść</Link>
        </div>
      </form>

      {/* najważniejsze liczby */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile big={m2(s.med)} label={`mediana ceny za m² (${s.nM2.toLocaleString("pl-PL")} tr.)`} hot />
        <Tile big={s.p25 ? `${Math.round(s.p25).toLocaleString("pl-PL")}–${Math.round(s.p75!).toLocaleString("pl-PL")}` : "—"} label="połowa transakcji mieści się w tym przedziale, zł/m²" />
        <Tile big={zl(s.medCena)} label="mediana ceny całkowitej" />
        <Tile big={area(s.medPow)} label={`mediana ${isLand ? "pola działki" : "powierzchni"} · ${s.n.toLocaleString("pl-PL")} transakcji`} />
      </div>

      {tr.length > 1 && (
        <section className={`${card} mb-6`}>
          <h2 className="font-semibold">Mediana ceny za m² kwartał po kwartale</h2>
          <p className="mb-4 text-sm text-graphite/55">Pasek to przedział od 25. do 75. percentyla, kropka to mediana. Blade kwartały mają mniej niż 10 transakcji.</p>
          <Trend data={tr} />
        </section>
      )}

      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Porównanie</h2>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
            {Object.entries(GRUPY).map(([k, l]) => (
              <Link key={k} href={link(q, { grupa: k, strona: "" })} scroll={false} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${q.grupa === k ? "bg-plum-900 text-pearl" : "bg-white text-graphite/70 hover:text-plum-900"}`}>
                wg: {l.toLowerCase()}
              </Link>
            ))}
          </div>
        </div>
        {cmp.length ? (
          <div className="overflow-x-auto rounded-2xl border border-graphite/10 bg-white">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-graphite/50">
                <tr className="border-b border-graphite/10">
                  <th className="px-4 py-3 font-semibold">{GRUPY[q.grupa as keyof typeof GRUPY]}</th>
                  <th className="px-4 py-3 text-right font-semibold">Transakcji</th>
                  <th className="px-4 py-3 font-semibold">Cena za m² (25%–mediana–75%)</th>
                  <th className="px-4 py-3 text-right font-semibold">Mediana ceny</th>
                  <th className="px-4 py-3 text-right font-semibold">Mediana pow.</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const max = Math.max(...cmp.map((c) => c.p75 ?? 0), 1);
                  return cmp.map((c) => {
                    const next = groupBy(c.nazwa);
                    return (
                      <tr key={c.nazwa} className="border-b border-graphite/5 last:border-0">
                        <td className="px-4 py-2.5 font-semibold">
                          {next ? <Link href={link(q, next)} className="hover:text-plum-900 hover:underline">{c.nazwa}</Link> : c.nazwa}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-graphite/60">{c.n.toLocaleString("pl-PL")}</td>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-3">
                            <span className="w-24 shrink-0 tabular-nums font-semibold">{m2(c.med).replace(" zł/m²", "")}</span>
                            <span className="relative h-2 flex-1 rounded-full bg-mist">
                              {c.p25 && c.p75 && (
                                <span className={`absolute inset-y-0 rounded-full ${c.nM2 < 10 ? "bg-gold-200" : "bg-gold-400"}`} style={{ left: `${(c.p25 / max) * 100}%`, width: `${Math.max(((c.p75 - c.p25) / max) * 100, 0.8)}%` }} />
                              )}
                              {c.med && <span className="absolute -top-0.5 size-3 -translate-x-1/2 rounded-full border-2 border-white bg-plum-900" style={{ left: `${(c.med / max) * 100}%` }} />}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{zl(c.medCena)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{area(c.medPow)}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Brak transakcji dla tych filtrów.</Empty>
        )}
        <p className="mt-2 text-xs text-graphite/45">Kliknij nazwę, żeby zejść poziom niżej: powiat → miejscowość → ulica → lata.</p>
      </section>

      {pts.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 font-semibold">
            Mapa <span className="font-normal text-graphite/50">· {pts.length.toLocaleString("pl-PL")} najnowszych transakcji z położeniem</span>
          </h2>
          <PriceMap points={pts} />
        </section>
      )}

      <section>
        <h2 className="mb-3 font-semibold">Transakcje</h2>
        {list.length ? (
          <ul className="grid gap-2">
            {list.map((r) => (
              <li key={r.id} className="grid gap-x-4 gap-y-1 rounded-2xl border border-graphite/10 bg-white px-4 py-3 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {[r.ulica && `${r.ulica} ${r.numer ?? ""}`.trim(), r.miejscowosc].filter(Boolean).join(", ") || r.powiat}
                  </p>
                  <p className="text-sm text-graphite/55">
                    {[
                      plDate(r.data),
                      r.funkcja ?? rodzajLabel[r.rodzaj] ?? r.rodzaj,
                      area(r.pow),
                      r.pokoje && `${r.pokoje} pok.`,
                      r.pietro !== null && r.pietro !== undefined && `piętro ${r.pietro}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {r.rynek && <> · <Badge tone={r.rynek === "pierwotny" ? "gold" : "gray"}>{rynekLabel[r.rynek] ?? r.rynek}</Badge></>}
                  </p>
                </div>
                <div className="flex items-baseline gap-3 sm:block sm:text-right">
                  <p className="font-semibold tabular-nums">{zl(r.cena)}</p>
                  <p className="text-sm tabular-nums text-graphite/55">{m2(r.cenaM2)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Brak transakcji dla tych filtrów.</Empty>
        )}
        {(page > 1 || list.length === PAGE) && (
          <nav className="mt-4 flex justify-center gap-2">
            {page > 1 && <Link href={link(q, { strona: String(page - 1) })} className="rounded-full bg-white px-4 py-2 text-sm font-semibold hover:text-plum-900">← Nowsze</Link>}
            <span className="px-3 py-2 text-sm text-graphite/50">strona {page}</span>
            {list.length === PAGE && <Link href={link(q, { strona: String(page + 1) })} className="rounded-full bg-white px-4 py-2 text-sm font-semibold hover:text-plum-900">Starsze →</Link>}
          </nav>
        )}
        <p className="mt-6 text-xs leading-relaxed text-graphite/45">
          Źródło: Rejestr Cen Nieruchomości prowadzony przez starostów, udostępniany przez GUGiK (geoportal.gov.pl). Ceny brutto z aktów notarialnych. Cena za m²
          liczona tylko dla transakcji z podaną powierzchnią; sprzedaż udziałów i transakcje kilku lokali naraz mogą zaburzać pojedyncze wyniki, dlatego pokazujemy
          mediany i percentyle zamiast średnich.
        </p>
      </section>
    </>
  );
}

function Tile({ big, label, hot }: { big: string; label: string; hot?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 md:p-5 ${hot ? "bg-plum-900 text-pearl" : "border border-graphite/10 bg-white"}`}>
      <p className="font-display text-2xl tabular-nums md:text-3xl">{big}</p>
      <p className={`mt-1 text-xs md:text-sm ${hot ? "text-pearl/65" : "text-graphite/55"}`}>{label}</p>
    </div>
  );
}
