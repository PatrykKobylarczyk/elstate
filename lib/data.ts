// Treści przeniesione z dotychczasowej strony elstate.pl.

export type Category = "mieszkania" | "domy" | "dzialki";
export type Deal = "sprzedaz" | "wynajem";

export type Listing = {
  slug: string;
  title: string;
  district: string;
  city: string;
  category: Category;
  deal: Deal;
  price: number; // zł (sprzedaż) lub zł / mies. (wynajem)
  area: number; // m²
  rooms: number;
  floor: number;
  year?: number;
  image?: string; // np. "/oferty/stylowy-apartament.jpg"; bez zdjęcia pokazujemy rzut
  featured?: boolean;
};

export const listings: Listing[] = [
  { slug: "stylowy-apartament-w-centrum", title: "Stylowy apartament w kamienicy", district: "Centrum", city: "Łódź", category: "mieszkania", deal: "sprzedaz", price: 750000, area: 78.5, rooms: 3, floor: 2, year: 1930, featured: true },
  { slug: "loft-w-centrum", title: "Loftowe mieszkanie w centrum", district: "Centrum", city: "Łódź", category: "mieszkania", deal: "sprzedaz", price: 750000, area: 80, rooms: 2, floor: 3 },
  { slug: "dwa-pokoje-w-centrum", title: "Dwa pokoje w centrum", district: "Centrum", city: "Łódź", category: "mieszkania", deal: "sprzedaz", price: 700000, area: 38.5, rooms: 2, floor: 1, year: 2001 },
  { slug: "trzy-pokoje-w-centrum", title: "Mieszkanie 3-pokojowe w centrum", district: "Centrum", city: "Łódź", category: "mieszkania", deal: "sprzedaz", price: 550000, area: 65, rooms: 3, floor: 2 },
  { slug: "trzy-pokoje-gorna", title: "Mieszkanie 3-pokojowe na Górnej", district: "Górna", city: "Łódź", category: "mieszkania", deal: "sprzedaz", price: 460000, area: 62, rooms: 3, floor: 2 },
  { slug: "dwa-pokoje-baluty", title: "Mieszkanie 2-pokojowe na Bałutach", district: "Bałuty", city: "Łódź", category: "mieszkania", deal: "sprzedaz", price: 420000, area: 50, rooms: 2, floor: 1 },
  { slug: "dwa-pokoje-widzew", title: "Mieszkanie 2-pokojowe na Widzewie", district: "Widzew", city: "Łódź", category: "mieszkania", deal: "sprzedaz", price: 390000, area: 48, rooms: 2, floor: 6 },
  { slug: "cztery-pokoje-gorna", title: "Przestronne mieszkanie 4-pokojowe", district: "Górna", city: "Łódź", category: "mieszkania", deal: "wynajem", price: 2600, area: 95, rooms: 4, floor: 5 },
  { slug: "kawalerka-retkinia", title: "Kawalerka na Retkini", district: "Retkinia", city: "Łódź", category: "mieszkania", deal: "wynajem", price: 1800, area: 32, rooms: 1, floor: 4 },
];

export const categories: { value: Category; label: string }[] = [
  { value: "mieszkania", label: "Mieszkania" },
  { value: "domy", label: "Domy" },
  { value: "dzialki", label: "Działki" },
];

export const contact = {
  phone: "+48 518 184 244",
  phoneHref: "tel:+48518184244",
  email: "info@elstate.pl",
  careers: "kariera@elstate.pl",
  instagram: "https://www.instagram.com/patrykkobylarczyk/",
  city: "Łódź",
};

export const team = [
  {
    name: "Max Fiszer",
    role: "Doradca ds. nieruchomości",
    bio: "Prowadzi klientów przez cały proces, od pierwszego spotkania po podpisanie aktu notarialnego.",
    phone: "+48 518 184 244",
    email: "max@elstate.pl",
    photo: "/team/max-fiszer.jpg" as string | undefined,
  },
  {
    name: "Patryk Kobylarczyk",
    role: "Fotograf i wideooperator",
    bio: "Zdjęcia, filmy z drona i spacery 3D, dzięki którym nieruchomość zapada w pamięć.",
    phone: "+48 789 985 677",
    email: "info@elstate.pl",
    photo: "/team/patryk-kobylarczyk.jpg" as string | undefined,
  },
];

export const process = [
  { title: "Rozpoczęcie współpracy i wycena", text: "Poznajemy nieruchomość i Twoje oczekiwania. Na tej podstawie przygotowujemy realną wycenę rynkową." },
  { title: "Indywidualna strategia sprzedaży", text: "Dobieramy grupę docelową, cenę ofertową i kanały dotarcia dopasowane do konkretnego lokalu." },
  { title: "Przygotowanie nieruchomości", text: "Home staging, sesja zdjęciowa i opis, który pokazuje charakter miejsca." },
  { title: "Obsługa sprzedaży i promocja", text: "Kreatywna kampania na szeroką skalę, prezentacje i negocjacje z kupującymi." },
  { title: "Przygotowanie dokumentów", text: "Kompletujemy dokumenty i koordynujemy kontakt z bankiem oraz notariuszem." },
  { title: "Finalizacja transakcji", text: "Akt notarialny, protokół zdawczo-odbiorczy i przekazanie kluczy." },
];

export const services = [
  { title: "Sprzedaż", text: "Pełna obsługa transakcji na rynku wtórnym. Ty decydujesz, my zajmujemy się resztą." },
  { title: "Home staging", text: "Aranżujemy wnętrze tak, by kupujący od progu widział w nim swój przyszły dom." },
  { title: "Film i fotografia", text: "Sesje zdjęciowe, filmy z drona i reels, które zatrzymują kciuk na ekranie." },
  { title: "Spacer 3D", text: "Wirtualna prezentacja w 4K. Kupujący z innego miasta obejrzy mieszkanie bez wyjazdu." },
  { title: "Dyskretna sprzedaż", text: "Dla nieruchomości, które nie powinny trafić na portale. Oferta tylko dla sprawdzonych klientów." },
  { title: "Rynek pierwotny", text: "Pomagamy wybrać inwestycję i prowadzimy sprzedaż lokali dla deweloperów." },
  { title: "Wynajem", text: "Sprawdzeni najemcy, bezpieczna umowa i protokół zdawczo-odbiorczy." },
  { title: "Finansowanie", text: "Umówimy Cię z doradcą kredytowym, który znajdzie najlepszą ofertę." },
];

export const marquee = ["Sprzedaż", "Home staging", "Filmy z drona", "Spacery 3D", "Dyskretna sprzedaż", "Rynek pierwotny", "Wynajem", "Kredyt"];

export const markets = [
  {
    city: "Łódź",
    status: "Działamy",
    text: "Znamy tu każdą kamienicę i każde nowe osiedle. Tu zaczynaliśmy i tu jest nasz dom.",
    areas: ["Śródmieście", "Polesie", "Bałuty", "Widzew", "Górna", "Retkinia"],
  },
  {
    city: "Trójmiasto",
    status: "Wkrótce",
    text: "Przygotowujemy wejście na rynek Gdańska, Gdyni i Sopotu. Zostaw kontakt, a dostaniesz pierwsze oferty przed publikacją.",
    areas: ["Gdańsk", "Gdynia", "Sopot"],
  },
];

// Filmy: wrzuć pliki do public/video i wpisz ścieżki. Bez filmu pokazujemy animowaną panoramę Łodzi.
export const media = {
  heroVideo: undefined as string | undefined, // np. "/video/hero.mp4" (zalecane: 1920×1080, H.264, bez dźwięku, do 8 MB)
  heroPoster: undefined as string | undefined,
  showreel: "/video/showreel.mp4" as string | undefined, // film w panelu „Kupujący poznaje dom…” (pionowy 9:16, bez dźwięku)
  showreelPoster: "/video/showreel.jpg" as string | undefined,
};

export const values = ["Otwartość", "Kreatywność", "Skuteczność", "Empatia"];

const pln = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

export function formatPrice(l: Pick<Listing, "price" | "deal">) {
  return `${pln.format(l.price)} zł${l.deal === "wynajem" ? " / mies." : ""}`;
}

export function pricePerM2(l: Listing) {
  return l.deal === "sprzedaz" ? `${pln.format(Math.round(l.price / l.area))} zł/m²` : null;
}

export function formatArea(a: number) {
  return `${a.toLocaleString("pl-PL")} m²`;
}

export function floorLabel(f: number) {
  return f === 0 ? "parter" : `${f}. piętro`;
}

export function roomsLabel(n: number) {
  if (n === 1) return "1 pokój";
  if (n >= 2 && n <= 4) return `${n} pokoje`;
  return `${n} pokoi`;
}
