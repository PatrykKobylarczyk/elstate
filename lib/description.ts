// Opis oferty podzielony na sekcje (Lokalizacja, Budynek…). W CRM każda sekcja to osobne pole,
// a strona oferty pokazuje je pod nagłówkami. Wspólne dla CRM i strony (bez "server-only").

export const DESCRIPTION_SECTIONS = [
  { key: "lokalizacja", label: "Lokalizacja", hint: "Okolica, dojazd, komunikacja, sklepy, szkoły, zieleń." },
  { key: "budynek", label: "Budynek", hint: "Rok i technologia, winda, klatka, parking, komórki, zarządca." },
  { key: "wnetrze", label: "Układ i wnętrze", hint: "Pomieszczenia, ekspozycja okien, balkon, taras." },
  { key: "wykonczenie", label: "Stan i wykończenie", hint: "Standard, materiały, wyposażenie, co zostaje w cenie." },
  { key: "dodatkowe", label: "Dodatkowe informacje", hint: "Czynsz, stan prawny, dostępność, termin wydania." },
] as const;

export type SectionKey = (typeof DESCRIPTION_SECTIONS)[number]["key"];
export type DescriptionSections = Partial<Record<SectionKey, string>>;
export type DescriptionBlock = { label: string; paragraphs: string[] };

const paras = (t: string) => t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
const norm = (s: string) => s.toLocaleLowerCase("pl-PL").replace(/[\s:–-]+$/u, "").trim();

// Nagłówki rozpoznawane w starym, jednym polu opisu (np. „Lokalizacja:” w osobnej linii albo „Budynek: treść”)
const ALIASES: Record<string, SectionKey> = {
  lokalizacja: "lokalizacja",
  okolica: "lokalizacja",
  "lokalizacja i okolica": "lokalizacja",
  komunikacja: "lokalizacja",
  budynek: "budynek",
  "budynek i części wspólne": "budynek",
  mieszkanie: "wnetrze",
  dom: "wnetrze",
  lokal: "wnetrze",
  "układ": "wnetrze",
  "układ i wnętrze": "wnetrze",
  "wnętrze": "wnetrze",
  "układ pomieszczeń": "wnetrze",
  stan: "wykonczenie",
  "wykończenie": "wykonczenie",
  "stan i wykończenie": "wykonczenie",
  "standard wykończenia": "wykonczenie",
  "stan techniczny": "wykonczenie",
  "dodatkowe informacje": "dodatkowe",
  dodatkowe: "dodatkowe",
  "informacje dodatkowe": "dodatkowe",
  koszty: "dodatkowe",
  "stan prawny": "dodatkowe",
};

function headingOf(line: string): { key: SectionKey; rest: string } | null {
  // „Budynek z 2022 roku…” to zwykłe zdanie; nagłówek to sama nazwa w linii albo nazwa z dwukropkiem
  const t = line.trim().replace(/^#+\s*/, "");
  const colon = t.indexOf(":");
  const name = (colon >= 0 ? t.slice(0, colon) : t).replace(/\*/g, "");
  const rest = colon >= 0 ? t.slice(colon + 1).replace(/^\*+/, "").trim() : "";
  if (name.length > 40) return null;
  const key = ALIASES[norm(name)];
  return key ? { key, rest } : null;
}

// Rozbija stary opis z nagłówkami pisanymi ręcznie na wstęp i sekcje
export function parseDescription(text: string | null | undefined): { intro: string; sections: DescriptionSections } {
  const sections: DescriptionSections = {};
  const intro: string[] = [];
  let current: SectionKey | null = null;
  for (const line of (text ?? "").split("\n")) {
    const h = headingOf(line);
    if (h) {
      current = h.key;
      sections[current] = [sections[current], h.rest].filter(Boolean).join("\n\n");
      continue;
    }
    if (current) sections[current] = (sections[current] ?? "") + "\n" + line;
    else intro.push(line);
  }
  const clean = (t?: string) => (t ?? "").replace(/^\n+|\n+$/g, "").trim();
  for (const k of Object.keys(sections) as SectionKey[]) {
    sections[k] = clean(sections[k]);
    if (!sections[k]) delete sections[k];
  }
  return { intro: clean(intro.join("\n")), sections };
}

// Wartości startowe pól w formularzu CRM: zapisane sekcje, a przy starej ofercie sekcje wyciągnięte z opisu
export function formDescription(description: string | null | undefined, stored: DescriptionSections | null | undefined) {
  if (stored && Object.values(stored).some(Boolean)) return { intro: description ?? "", sections: stored };
  return parseDescription(description);
}

// Treść do wyświetlenia: wstęp (akapity) i sekcje z nagłówkami, w stałej kolejności
export function describe(description: string | null | undefined, stored: DescriptionSections | null | undefined) {
  const { intro, sections } = formDescription(description, stored);
  const blocks: DescriptionBlock[] = DESCRIPTION_SECTIONS.map((s) => ({ label: s.label, paragraphs: paras(sections[s.key] ?? "") })).filter(
    (b) => b.paragraphs.length > 0,
  );
  return { intro: paras(intro), blocks };
}

export function sectionsFromForm(get: (name: string) => string): DescriptionSections | null {
  const out: DescriptionSections = {};
  for (const s of DESCRIPTION_SECTIONS) {
    const v = get(`section_${s.key}`).trim().slice(0, 5000);
    if (v) out[s.key] = v;
  }
  return Object.keys(out).length ? out : null;
}
