import type { Listing } from "./data";

// Filtry listy ofert. Wszystko siedzi w adresie (/oferty?transakcja=…), więc link z filtrami da się wysłać klientowi.
export type OfferQuery = {
  miasto?: string;
  transakcja?: string;
  kategoria?: string;
  lokalizacja?: string;
  cenaOd?: string;
  cenaDo?: string;
  metrazOd?: string;
  pokoje?: string;
  sort?: string;
};

export const sorts = [
  { value: "", label: "Polecane" },
  { value: "cena-rosnaco", label: "Cena: od najniższej" },
  { value: "cena-malejaco", label: "Cena: od najwyższej" },
  { value: "metraz", label: "Metraż: od największego" },
];

const num = (v?: string) => {
  const n = parseFloat((v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function filterOffers(list: Listing[], q: OfferQuery) {
  const cenaOd = num(q.cenaOd);
  const cenaDo = num(q.cenaDo);
  const metrazOd = num(q.metrazOd);
  const pokoje = num(q.pokoje);
  const out = list.filter(
    (l) =>
      (!q.miasto || l.city === q.miasto) &&
      (!q.transakcja || l.deal === q.transakcja) &&
      (!q.kategoria || l.category === q.kategoria) &&
      (!q.lokalizacja || l.district === q.lokalizacja) &&
      (!cenaOd || l.price >= cenaOd) &&
      (!cenaDo || l.price <= cenaDo) &&
      (!metrazOd || l.area >= metrazOd) &&
      (!pokoje || (pokoje >= 4 ? l.rooms >= 4 : l.rooms === pokoje)),
  );
  if (q.sort === "cena-rosnaco") out.sort((a, b) => a.price - b.price);
  else if (q.sort === "cena-malejaco") out.sort((a, b) => b.price - a.price);
  else if (q.sort === "metraz") out.sort((a, b) => b.area - a.area);
  else out.sort((a, b) => Number(!!b.featured) - Number(!!a.featured)); // polecane: wyróżnione na początku, reszta w kolejności z CRM
  return out;
}
