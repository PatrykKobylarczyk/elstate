// Tytuł i podpowiedzi formularza kontaktowego zależą od przycisku, którym ktoś trafił na /kontakt?temat=…
// (navbar „Kontakt” bez tematu, „Otrzymaj wycenę” → wycena, „Umów konsultację” → kredyt).
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
  oferta: {
    title: "Umówmy prezentację",
    subject: "Prezentacja oferty",
    lead: "",
    placeholder: "Kiedy pasuje Ci prezentacja? O co chcesz zapytać?",
  },
};

export type Topic = keyof typeof topics;

export const toTopic = (t?: string): Topic => (t && t in topics ? (t as Topic) : "kontakt");
