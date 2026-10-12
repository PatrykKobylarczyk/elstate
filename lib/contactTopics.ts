// Tytuł i podpowiedzi formularza kontaktowego zależą od przycisku, którym ktoś do niego trafił.
// Zasada: tytuł formularza = napis na przycisku. Nowy przycisk prowadzący do formularza dostaje data-topic
// z tematem, którego title brzmi tak samo jak jego napis (w razie potrzeby dopisz tu nowy temat).
// „Kontakt” → kontakt, „Otrzymaj wycenę” → wycena, „Umów konsultację” → kredyt, „Opisz, czego szukasz” → szukam.
export const topics = {
  kontakt: {
    title: "Kontakt",
    subject: "Kontakt",
    lead: "Masz pytanie o ofertę, sprzedaż albo wynajem? Napisz kilka słów, odezwiemy się.",
    placeholder: "Napisz, w czym możemy pomóc",
  },
  wycena: {
    title: "Otrzymaj wycenę",
    subject: "Wycena nieruchomości",
    lead: "Im więcej szczegółów, tym trafniejsza wycena.",
    placeholder: "Adres lub dzielnica, metraż, liczba pokoi, piętro, stan mieszkania…",
  },
  kredyt: {
    title: "Umów konsultację",
    subject: "Konsultacja z doradcą kredytowym",
    lead: "Doradca kredytowy oddzwoni i umówi się z Tobą na rozmowę.",
    placeholder: "Jakiej nieruchomości szukasz, jaki masz wkład własny i kiedy wygodnie Ci rozmawiać?",
  },
  szukam: {
    title: "Opisz, czego szukasz",
    subject: "Poszukiwanie nieruchomości",
    lead: "Damy znać, zanim oferta trafi na portale, także o tych, które sprzedajemy dyskretnie.",
    placeholder: "Kupno czy wynajem, dzielnica, metraż, liczba pokoi, budżet, termin…",
  },
  oferta: {
    title: "Umówmy prezentację",
    subject: "Prezentacja oferty",
    lead: "",
    placeholder: "Kiedy pasuje Ci prezentacja? O co chcesz zapytać?",
  },
};

export type Topic = keyof typeof topics;

// Przyciski z data-topic prowadzą do formularza na dole strony głównej (/#kontakt)
// i mają data-topic. Kliknięcie zapisuje temat (przeżyje przejście z podstrony) i ogłasza go formularzowi.
export const TOPIC_KEY = "elstate-topic";
export const TOPIC_EVENT = "elstate-topic";
export function pickTopic(t: string) {
  try {
    sessionStorage.setItem(TOPIC_KEY, t);
  } catch {}
  window.dispatchEvent(new CustomEvent(TOPIC_EVENT, { detail: t }));
}

export const toTopic = (t?: string): Topic => (t && t in topics ? (t as Topic) : "kontakt");
