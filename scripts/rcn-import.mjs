// Import cen transakcyjnych z Rejestru Cen Nieruchomości (RCN) dla woj. łódzkiego do tabeli rcn_transakcje.
//
// Źródło: pliki GeoPackage powiatów publikowane przez GUGiK na Geoportalu (bezpłatne od września 2025):
//   https://opendata.geoportal.gov.pl/InneDane/latest_exports/rcn_transakcje_ceny/GPKG/<TERYT>_transakcje_ceny.gpkg.zip
// Każdy plik ma trzy tabele: transakcje_lokale, transakcje_budynki, transakcje_dzialki. Wiersz to jeden obiekt
// (lokal, budynek, działka) z danymi transakcji i aktu (tran_*, dok_*, nier_*). Współrzędne w EPSG:2180.
//
// Uruchomienie: DATABASE_URL=... node scripts/rcn-import.mjs [1061 1003 ...]
//   bez argumentów: wszystkie powiaty województwa. RCN_OD=2015-01-01 ustawia najstarszą datę (domyślnie 2015).
//   RCN_DIR=katalog z już pobranymi plikami .gpkg.zip (pomija pobieranie). Wymaga Node 22.13+ (wbudowane node:sqlite) i unzip.
// Każdy powiat jest podmieniany w całości w jednej transakcji bazy, więc ponowny import jest bezpieczny.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import postgres from "postgres";
import proj4 from "proj4";

const POWIATY = {
  1001: "bełchatowski", 1002: "kutnowski", 1003: "łaski", 1004: "łęczycki", 1005: "łowicki", 1006: "łódzki wschodni",
  1007: "opoczyński", 1008: "pabianicki", 1009: "pajęczański", 1010: "piotrkowski", 1011: "poddębicki", 1012: "radomszczański",
  1013: "rawski", 1014: "sieradzki", 1015: "skierniewicki", 1016: "tomaszowski", 1017: "wieluński", 1018: "wieruszowski",
  1019: "zduńskowolski", 1020: "zgierski", 1021: "brzeziński", 1061: "Łódź", 1062: "Piotrków Trybunalski", 1063: "Skierniewice",
};
const URL_OF = (teryt) => `https://opendata.geoportal.gov.pl/InneDane/latest_exports/rcn_transakcje_ceny/GPKG/${teryt}_transakcje_ceny.gpkg.zip`;
const OD = process.env.RCN_OD || "2015-01-01";

proj4.defs("EPSG:2180", "+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
const toWgs = proj4("EPSG:2180", "EPSG:4326");

// --- geometria GeoPackage: nagłówek GP + WKB; bierzemy środek obwiedni (punkt, obrys budynku albo działki) ---
function center(blob) {
  if (!blob || blob.length < 8 || blob[0] !== 0x47 || blob[1] !== 0x50) return null;
  const b = Buffer.from(blob.buffer, blob.byteOffset, blob.byteLength);
  const flags = b[3];
  const le = (flags & 1) === 1;
  const env = (flags >> 1) & 7;
  const rd = (o) => (le ? b.readDoubleLE(o) : b.readDoubleBE(o));
  let xy;
  if (env >= 1 && env <= 4) {
    // obwiednia: minx, maxx, miny, maxy
    xy = [(rd(8) + rd(16)) / 2, (rd(24) + rd(32)) / 2];
  } else {
    const start = 8 + [0, 32, 48, 48, 64][env];
    xy = wkbCenter(b, start);
  }
  if (!xy || !Number.isFinite(xy[0]) || xy[0] < 100000 || xy[0] > 900000) return null;
  const [lng, lat] = toWgs.forward(xy);
  return [Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6];
}

// średnia obwiednia wszystkich wierzchołków WKB (dowolny typ, 2D/Z/M)
function wkbCenter(b, start) {
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  let o = start;
  const geom = () => {
    const le = b[o] === 1;
    o += 1;
    let type = le ? b.readUInt32LE(o) : b.readUInt32BE(o);
    o += 4;
    const u32 = () => { const v = le ? b.readUInt32LE(o) : b.readUInt32BE(o); o += 4; return v; };
    const f64 = () => { const v = le ? b.readDoubleLE(o) : b.readDoubleBE(o); o += 8; return v; };
    let dims = 2;
    if (type & 0x80000000) dims++;
    if (type & 0x40000000) dims++;
    type &= 0x0fffffff;
    if (type > 3000) { dims = 4; type -= 3000; } else if (type > 2000) { dims = 3; type -= 2000; } else if (type > 1000) { dims = 3; type -= 1000; }
    const pt = () => {
      const x = f64(), y = f64();
      for (let i = 2; i < dims; i++) f64();
      if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
    };
    if (type === 1) pt();
    else if (type === 2) { for (let n = u32(); n--; ) pt(); }
    else if (type === 3) { for (let r = u32(); r--; ) for (let n = u32(); n--; ) pt(); }
    else if (type >= 4 && type <= 7) { for (let n = u32(); n--; ) geom(); }
    else throw new Error(`WKB typ ${type}`);
  };
  try { geom(); } catch { return null; }
  return minx === Infinity ? null : [(minx + maxx) / 2, (miny + maxy) / 2];
}

// --- słowniki ---
const LOKAL = { mieszkalna: "mieszkanie", garaz: "garaż", handlowoUslugowa: "lokal handlowo-usługowy", biurowa: "biuro", inna: "lokal inny" };
const BUDYNEK = {
  mieszkalny: "budynek mieszkalny", pozostaleNiemieszkalne: "budynek niemieszkalny", transportuILacznosci: "garaż lub budynek transportu",
  handlowoUslugowy: "budynek handlowo-usługowy", przemyslowy: "budynek przemysłowy", gospodarczy: "budynek gospodarczy",
  biurowy: "budynek biurowy", zbiornikSilosIBudynekMagazynowy: "magazyn", ogolnodostepnyKulturalny: "budynek kultury",
};
const PRZEZN = {
  budownictwoMieszkanioweJednorodzinne: "MPZP: zabudowa jednorodzinna", budownictwoMieszkanioweWielorodzinne: "MPZP: zabudowa wielorodzinna",
  terenRolniczy: "MPZP: teren rolniczy", terenDrogWewnetrznych: "MPZP: drogi wewnętrzne", terenLasu: "MPZP: las", brakMPZPLubWZ: "bez planu",
  terenUslug: "MPZP: usługi", terenProdukcji: "MPZP: produkcja", innyNiewymieniony: null,
};
const TRANS = { sprzedazBezprzetargowa: "sprzedaż bezprzetargowa", sprzedazZBonifikata: "sprzedaż z bonifikatą", sprzedazWPostepowaniuEgzekucyjnym: "licytacja komornicza", sprzedazPrzetargowa: "przetarg" };
const camel = (s) => (s ? s.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase() : null);
const RYNEK = { rynekPierwotny: "pierwotny", rynekWtorny: "wtorny" };

function adres(s) {
  const a = {};
  for (const part of String(s ?? "").split(";")) {
    const i = part.indexOf(":");
    if (i > 0) a[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return { miejscowosc: a.MSC || null, ulica: a.UL || null, numer: a.NR_PORZ || null };
}

const pos = (v) => (typeof v === "number" && v > 1 ? v : null);
const day = (v) => (v ? String(v).slice(0, 10) : null);
// identyfikator obiektu zaczyna się od kodu TERYT gminy, np. 106106_9.… → 1061069
const gmina = (id) => (/^\d{6}_\d/.test(String(id ?? "")) ? String(id).slice(0, 6) + String(id)[7] : null);
const whole = (u) => !u || u === "1/1";

// wspólne uwagi i to, czy transakcja nadaje się do liczenia ceny za m²
function check(r) {
  const notes = [];
  if (!whole(r.nier_udzial)) notes.push(`udział ${r.nier_udzial}`);
  if (TRANS[r.tran_rodzaj_trans]) notes.push(TRANS[r.tran_rodzaj_trans]);
  const fair = whole(r.nier_udzial) && !["sprzedazBezprzetargowa", "sprzedazZBonifikata", "sprzedazWPostepowaniuEgzekucyjnym"].includes(r.tran_rodzaj_trans);
  return { notes, fair };
}

function m2(cena, pow, fair, lo, hi) {
  if (!fair || !cena || !pow) return null;
  const v = cena / pow;
  return v >= lo && v <= hi ? Math.round(v * 100) / 100 : null;
}

function readPowiat(file, teryt) {
  const db = new DatabaseSync(file, { readOnly: true });
  const all = (t) => db.prepare(`select * from "${t}" where dok_data >= ?`).all(OD);
  const out = new Map();
  const base = (r) => ({
    terytPowiat: String(teryt),
    powiat: POWIATY[teryt],
    data: day(r.dok_data),
    rynek: RYNEK[r.tran_rodzaj_rynku] ?? null,
  });

  // lokale: wiersz na lokal; cena lokalu, a gdy jej brak, cena nieruchomości/transakcji tylko przy jednym lokalu
  const lokale = all("transakcje_lokale");
  const lokPerTran = new Map();
  for (const r of lokale) lokPerTran.set(r.tran_lokalny_id_iip, (lokPerTran.get(r.tran_lokalny_id_iip) ?? 0) + 1);
  for (const r of lokale) {
    if (!r.dok_data) continue;
    const single = lokPerTran.get(r.tran_lokalny_id_iip) === 1;
    const own = pos(r.lok_cena_brutto) ?? (single ? pos(r.nier_cena_brutto) ?? pos(r.tran_cena_brutto) : null);
    const { notes, fair } = check(r);
    if (!own) notes.push(`${lokPerTran.get(r.tran_lokalny_id_iip)} lokale w jednej cenie`);
    const mieszk = r.lok_funkcja === "mieszkalna" || (!r.lok_funkcja && r.lok_liczba_izb > 0);
    const cena = own ?? r.tran_cena_brutto;
    if (!cena) continue;
    const ll = center(r.geometry);
    out.set(`L:${r.tran_lokalny_id_iip}:${r.lok_id_lokalu}`, {
      ...base(r),
      ...adres(r.lok_adres),
      rodzaj: mieszk ? "mieszkanie" : "lokal",
      gmina: gmina(r.lok_id_lokalu),
      cena,
      pow: r.lok_pow_uzyt || null,
      powDzialki: null,
      cenaM2: own ? m2(own, r.lok_pow_uzyt, fair, mieszk ? 800 : 100, 60000) : null,
      pokoje: r.lok_liczba_izb || null,
      pietro: r.lok_nr_kond ?? null,
      funkcja: LOKAL[r.lok_funkcja] ?? camel(r.lok_funkcja),
      uwagi: notes.join(", ") || null,
      lat: ll?.[0] ?? null,
      lng: ll?.[1] ?? null,
    });
  }

  // grunty: działki i budynki tej samej transakcji (pole działek pod domem)
  const dzialki = all("transakcje_dzialki");
  const dzByTran = groupBy(dzialki);
  const budynki = all("transakcje_budynki");
  const budByTran = groupBy(budynki);

  // budynki: jedna pozycja na transakcję zabudowanej nieruchomości (bez lokali, które mają własne wiersze)
  for (const [tran, rs] of budByTran) {
    const r = rs[0];
    if (!r.dok_data || lokPerTran.has(tran) || r.nier_rodzaj === "nieruchomoscLokalowa") continue;
    const uniq = [...new Map(rs.map((x) => [x.bud_id_budynku, x])).values()];
    const mieszkalne = uniq.filter((x) => x.bud_rodzaj === "mieszkalny");
    const dom = mieszkalne.length > 0;
    const pow = sum((dom ? mieszkalne : uniq).map((x) => x.bud_pow_uzyt)) || null;
    const dz = dzByTran.get(tran);
    const powDzialki = dz ? sum([...new Map(dz.map((x) => [x.dzi_id_dzialki, x.dzi_pow_ewid])).values()]) * 10000 : r.nier_pow_gruntu ? r.nier_pow_gruntu * 10000 : null;
    const cena = pos(r.nier_cena_brutto) ?? pos(r.tran_cena_brutto);
    if (!cena) continue;
    const { notes, fair } = check(r);
    if (dom && mieszkalne.length > 1) notes.push(`${mieszkalne.length} budynki mieszkalne`);
    const main = (dom ? mieszkalne : uniq).sort((a, b) => (b.bud_pow_uzyt ?? 0) - (a.bud_pow_uzyt ?? 0))[0];
    const ll = center(main.geometry) ?? center(dz?.[0]?.geometry);
    out.set(`B:${tran}`, {
      ...base(r),
      ...adres(main.bud_adres ?? dz?.[0]?.dzi_adres),
      rodzaj: dom ? "dom" : "budynek",
      gmina: gmina(main.bud_id_budynku),
      cena,
      pow,
      powDzialki: powDzialki ? Math.round(powDzialki) : null,
      cenaM2: m2(cena, pow, fair && mieszkalne.length <= 1, dom ? 300 : 50, 40000),
      pokoje: null,
      pietro: null,
      funkcja: dom ? "dom" : BUDYNEK[main.bud_rodzaj] ?? camel(main.bud_rodzaj),
      uwagi: notes.join(", ") || null,
      lat: ll?.[0] ?? null,
      lng: ll?.[1] ?? null,
    });
  }

  // działki niezabudowane: jedna pozycja na transakcję, pole wszystkich działek razem
  for (const [tran, rs] of dzByTran) {
    const r = rs[0];
    if (!r.dok_data || lokPerTran.has(tran) || budByTran.has(tran)) continue;
    if (r.nier_rodzaj && r.nier_rodzaj !== "nieruchomoscGruntowaNiezabudowana") continue;
    const uniq = [...new Map(rs.map((x) => [x.dzi_id_dzialki, x])).values()];
    const pow = Math.round(sum(uniq.map((x) => x.dzi_pow_ewid)) * 10000) || null;
    const cena = pos(r.nier_cena_brutto) ?? pos(r.tran_cena_brutto);
    if (!cena) continue;
    const { notes, fair } = check(r);
    if (uniq.length > 1) notes.push(`${uniq.length} działki`);
    const main = uniq.sort((a, b) => (b.dzi_pow_ewid ?? 0) - (a.dzi_pow_ewid ?? 0))[0];
    const ll = center(main.geometry);
    const przezn = main.dzi_przezn_wmpzp in PRZEZN ? PRZEZN[main.dzi_przezn_wmpzp] : camel(main.dzi_przezn_wmpzp);
    out.set(`D:${tran}`, {
      ...base(r),
      ...adres(main.dzi_adres),
      rodzaj: "dzialka",
      gmina: gmina(main.dzi_id_dzialki),
      cena,
      pow,
      powDzialki: null,
      cenaM2: m2(cena, pow, fair, 1, 20000),
      pokoje: null,
      pietro: null,
      funkcja: [main.dzi_sposob_uzyt === "gruntyRolne" ? "grunt rolny" : main.dzi_sposob_uzyt === "gruntyLesne" ? "las" : null, przezn].filter(Boolean).join(", ") || null,
      uwagi: notes.join(", ") || null,
      lat: ll?.[0] ?? null,
      lng: ll?.[1] ?? null,
    });
  }
  db.close();
  return [...out].map(([id, r]) => ({ id, ...r }));
}

function groupBy(rows) {
  const m = new Map();
  for (const r of rows) {
    const k = r.tran_lokalny_id_iip;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}
const sum = (xs) => xs.reduce((a, x) => a + (typeof x === "number" ? x : 0), 0);

async function download(teryt, dir) {
  const zip = join(dir, `${teryt}.gpkg.zip`);
  if (!existsSync(zip)) {
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await fetch(URL_OF(teryt), { signal: AbortSignal.timeout(30 * 60 * 1000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
        break;
      } catch (e) {
        if (attempt >= 3) throw e;
        console.log(`[rcn] ${teryt}: ${e.message}, ponawiam`);
        await new Promise((r) => setTimeout(r, 5000 * attempt));
      }
    }
  }
  const out = join(dir, String(teryt));
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  execFileSync("unzip", ["-o", "-q", zip, "-d", out]);
  const f = readdirSync(out, { recursive: true }).find((n) => String(n).endsWith(".gpkg"));
  if (!f) throw new Error(`brak pliku .gpkg w ${zip}`);
  return join(out, String(f));
}

const COLS = ["id", "rodzaj", "teryt_powiat", "powiat", "gmina", "miejscowosc", "ulica", "numer", "data", "rynek", "cena", "pow", "pow_dzialki", "cena_m2", "pokoje", "pietro", "funkcja", "uwagi", "lat", "lng"];
const snake = (r) => ({
  id: r.id, rodzaj: r.rodzaj, teryt_powiat: r.terytPowiat, powiat: r.powiat, gmina: r.gmina, miejscowosc: r.miejscowosc, ulica: r.ulica, numer: r.numer,
  data: r.data, rynek: r.rynek, cena: r.cena, pow: r.pow, pow_dzialki: r.powDzialki, cena_m2: r.cenaM2, pokoje: r.pokoje, pietro: r.pietro,
  funkcja: r.funkcja, uwagi: r.uwagi, lat: r.lat, lng: r.lng,
});

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Brak DATABASE_URL");
  const list = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : Object.keys(POWIATY).map(Number);
  const dir = process.env.RCN_DIR || join(tmpdir(), "rcn");
  mkdirSync(dir, { recursive: true });
  const sql = postgres(url, { max: 1, ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require", onnotice: () => {} });
  let failed = 0;
  for (const teryt of list) {
    if (!POWIATY[teryt]) throw new Error(`Nieznany powiat ${teryt}`);
    const t0 = Date.now();
    try {
      const file = await download(teryt, dir);
      const rows = readPowiat(file, teryt).map(snake);
      await sql.begin(async (tx) => {
        await tx`delete from rcn_transakcje where teryt_powiat = ${String(teryt)}`;
        for (let i = 0; i < rows.length; i += 1000) await tx`insert into rcn_transakcje ${tx(rows.slice(i, i + 1000), COLS)}`;
      });
      const by = rows.reduce((a, r) => ((a[r.rodzaj] = (a[r.rodzaj] ?? 0) + 1), a), {});
      console.log(`[rcn] ${teryt} ${POWIATY[teryt]}: ${rows.length} pozycji ${JSON.stringify(by)} w ${Math.round((Date.now() - t0) / 1000)} s`);
      if (!process.env.RCN_DIR) rmSync(join(dir, String(teryt)), { recursive: true, force: true });
    } catch (e) {
      failed++;
      console.error(`[rcn] ${teryt} ${POWIATY[teryt]}: BŁĄD ${e.stack ?? e}`);
    }
  }
  await sql.end();
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
