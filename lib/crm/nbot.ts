// Rozbiór powiadomień e-mail z nbot (i podobnych alertów) na pojedyncze ogłoszenia.
// nbot nie ma API, więc czytamy treść maila: każde ogłoszenie to link do portalu plus tekst wokół niego
// (tytuł, cena, metraż, pokoje, telefon). Gdy nie rozpoznamy żadnego ogłoszenia, zapisujemy cały mail
// jako jeden lead, żeby nic nie przepadło. Parser poprawimy po obejrzeniu prawdziwych maili z nbot.

export type ParsedLead = {
  title: string | null;
  url: string | null;
  urlKey: string | null;
  portal: string | null;
  price: number | null;
  area: number | null;
  rooms: number | null;
  location: string | null;
  phone: string | null;
  contactName: string | null;
  raw: string;
};

const PORTALS: [RegExp, string][] = [
  [/otodom\./, "Otodom"],
  [/olx\./, "OLX"],
  [/gratka\./, "Gratka"],
  [/morizon\./, "Morizon"],
  [/domiporta\./, "Domiporta"],
  [/nieruchomosci-online\./, "Nieruchomości-online"],
  [/adresowo\./, "Adresowo"],
  [/sprzedajemy\./, "Sprzedajemy"],
  [/szybko\./, "Szybko.pl"],
  [/allegro\./, "Allegro Lokalnie"],
  [/facebook\.com\/(marketplace|groups)/, "Facebook"],
  [/trojmiasto\.pl/, "Trojmiasto.pl"],
  [/nbot\./, "nbot"],
];

// linki, które nie są ogłoszeniami (stopki, wypisy, ustawienia, grafiki)
const SKIP = /unsubscribe|wypisz|rezygnac|ustawieni|settings|logowanie|login|regulamin|polityk|privacy|pomoc|help|kontakt|\.(png|jpe?g|gif|svg|webp)(\?|$)|^mailto:|fonts\.|w3\.org|schema\.org/i;

export function htmlToText(html: string) {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => ` ${inner.replace(/<[^>]+>/g, " ")} ${href} `)
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h\d|\/td)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n[\n ]*/g, "\n")
    .trim();
}

export function urlKey(u: string) {
  try {
    const x = new URL(u);
    const host = x.hostname.replace(/^www\.|^m\./, "");
    // OLX i Otodom dokładają parametry śledzące; adres ogłoszenia to sama ścieżka
    return `${host}${x.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return u.toLowerCase();
  }
}

export const portalOf = (u: string) => PORTALS.find(([re]) => re.test(u))?.[1] ?? (() => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } })();

const num = (s: string) => Number(s.replace(/[\s .]/g, "").replace(",", "."));

export function extractFacts(text: string) {
  const price = text.match(/(\d{1,3}(?:[\s .]\d{3})+|\d{4,})(?:[,.]\d{1,2})?\s*(?:zł|zl|pln)(?!\s*\/\s*m)/i);
  const area = text.match(/(\d{1,4}(?:[,.]\d{1,2})?)\s*(?:m2|m²|m\^2|mkw|m kw)/i);
  const rooms = text.match(/(\d{1,2})\s*(?:-?\s*)(?:pok|pokoje|pokoi|pokój)/i) || text.match(/pokoje?:?\s*(\d{1,2})/i);
  const phone = text.match(/(?:\+?48[\s-]?)?(?<!\d)(\d{3}[\s-]?\d{3}[\s-]?\d{3})(?!\d)/);
  return {
    price: price ? Math.round(num(price[1])) : null,
    area: area ? num(area[1]) : null,
    rooms: rooms ? Number(rooms[1]) : null,
    phone: phone ? phone[1].replace(/[\s-]/g, "").replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : null,
  };
}

const LOCATION = /(?:^|\n)\s*(?:lokalizacja|adres|miejscowość)\s*:?\s*([^\n]{3,80})/i;
const CITY = /(?<![\p{L}])(Łódź|Lodz|Gdańsk|Gdynia|Sopot|Pabianice|Zgierz|Aleksandrów Łódzki|Konstantynów Łódzki|Rzgów|Stryków|Brzeziny|Ozorków|Rumia|Reda|Pruszcz Gdański)(?![\p{L}])/u;
// teksty przycisków, po których nie poznamy tytułu ogłoszenia
const GENERIC = /^(zobacz|sprawdź|przejdź|otwórz|szczegóły|więcej|link|ogłoszenie|kliknij)/i;

const lineStart = (t: string, at: number) => t.lastIndexOf("\n", at) + 1;
const lineEnd = (t: string, at: number) => { const e = t.indexOf("\n", at); return e < 0 ? t.length : e; };

function locationOf(block: string) {
  const m = block.match(LOCATION)?.[1];
  if (m) return m.trim().slice(0, 120);
  const line = block.split("\n").find((l) => CITY.test(l) && !/https?:\/\//.test(l));
  return line ? line.trim().replace(/\s*[·|,]?\s*\d[\d\s.,]*\s*(zł|pln)[\s\S]*$/i, "").slice(0, 120) : null;
}

function titleOf(block: string, fallback: string | null) {
  const lines = block.split("\n").map((l) => l.replace(/https?:\/\/\S+/g, "").trim()).filter((l) => l.length > 6 && !GENERIC.test(l) && !/^\d[\d\s.,]*\s*(zł|pln|m2|m²)/i.test(l));
  return (lines.find((l) => /[a-ząćęłńóśźż]{3}/i.test(l)) ?? fallback)?.slice(0, 200) ?? null;
}

export function parseNbotEmail(input: { subject?: string; text?: string; html?: string }): ParsedLead[] {
  // wersja HTML ma linki przy tytułach, więc ma pierwszeństwo przed czystym tekstem
  const text = input.html?.trim() ? htmlToText(input.html) : (input.text ?? "").trim();
  const subject = input.subject?.trim() || null;
  const urls = [...text.matchAll(/https?:\/\/[^\s<>"')\]]+/g)].map((m) => ({ url: m[0].replace(/[.,;]+$/, ""), at: m.index! }));
  const offers = urls.filter((u) => !SKIP.test(u.url));
  // linki portali mają pierwszeństwo; gdy ich nie ma, bierzemy każdy sensowny link
  const portalHits = offers.filter((u) => PORTALS.some(([re]) => re.test(u.url)));
  const picked = (portalHits.length ? portalHits : offers).filter((u, i, a) => a.findIndex((x) => urlKey(x.url) === urlKey(u.url)) === i);

  if (!picked.length) {
    return [{ title: subject ?? titleOf(text, null), url: null, urlKey: null, portal: "nbot", ...extractFacts(text), location: locationOf(text), contactName: null, raw: text.slice(0, 20000) }];
  }

  // Dwa układy maili: tytuł-link i pod nim szczegóły, albo szczegóły i na końcu przycisk „Zobacz”.
  const firstAnchor = text.slice(lineStart(text, picked[0].at), picked[0].at).trim();
  const detailsBefore = !firstAnchor || GENERIC.test(firstAnchor);
  // koniec części z ogłoszeniami: pierwszy link ze stopki po ostatnim ogłoszeniu
  const last = picked[picked.length - 1];
  const footer = urls.find((u) => u.at > last.at && SKIP.test(u.url));
  const tail = footer ? lineStart(text, footer.at) : text.length;

  return picked.map((u, i) => {
    let start: number, end: number;
    if (detailsBefore) {
      start = i === 0 ? Math.max(0, lineStart(text, u.at) - 500) : lineEnd(text, picked[i - 1].at);
      end = lineEnd(text, u.at);
    } else {
      start = lineStart(text, u.at);
      end = i + 1 < picked.length ? lineStart(text, picked[i + 1].at) : Math.min(tail, u.at + 800);
    }
    // jedno ogłoszenie (np. wklejony link z opisem): cały tekst dotyczy właśnie jego
    const block = picked.length === 1 ? text.slice(0, tail) : text.slice(start, end);
    return {
      title: titleOf(block, subject),
      url: u.url,
      urlKey: urlKey(u.url),
      portal: portalOf(u.url),
      ...extractFacts(block.replace(/https?:\/\/\S+/g, " ")),
      location: locationOf(block),
      contactName: null,
      raw: block.trim().slice(0, 4000),
    };
  });
}
