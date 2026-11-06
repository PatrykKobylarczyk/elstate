# Elstate: strona www

Next.js 15 (App Router) + Tailwind CSS 4 + TypeScript + Lenis (płynne przewijanie).

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Gdzie co jest

- `app/globals.css`: **paleta barw i fonty** (blok `@theme`). Zmiana koloru w jednym miejscu zmienia całą stronę.
- `lib/data.ts`: oferty, zespół, usługi, proces sprzedaży, dane kontaktowe.
- `app/page.tsx`: strona główna (hero, oferty, usługi, proces, finanse z kalkulatorem raty, o nas, kontakt).
- `app/oferty/`: lista ofert z filtrami w adresie (`?transakcja=&kategoria=&lokalizacja=`) i strona pojedynczej oferty.
- `app/kontakt/`: formularz kontaktowy. `app/api/kontakt/route.ts` na razie zapisuje zgłoszenie w logach; trzeba podpiąć wysyłkę e-maila.
- `components/FloorPlan.tsx`: rzut poglądowy rysowany z liczby pokoi i metrażu. Pokazuje się, gdy oferta nie ma zdjęcia (`image` w `lib/data.ts`).
- `lib/motion.ts` + `components/Motion.tsx`: ruch strony (paralaksa, poziomy scroll ofert, rozjaśnianie słów, kursor) sterowany atrybutami `data-*`, płynne przewijanie przez Lenis. Szanuje ustawienie „ogranicz animacje”.
- `components/HeroDrawing.tsx`: złota panorama Łodzi nocą (`public/hero/panorama.webp`) na całą szerokość hero, dopóki nie podłączysz filmu w `media` w `lib/data.ts` (pliki do `public/video/`).
- `components/Wordmark.tsx`: napis „elstate.” złożony krojem Manrope. `public/team/`: zdjęcia zespołu.

Stare adresy `/uslugi`, `/finanse`, `/o-nas` przekierowują do sekcji strony głównej.

## Lista (wspólna lista zadań na telefon)

`/lista` to osobna mała aplikacja (PWA) z listą rzeczy do zrobienia, wspólną dla kilku telefonów. Korzysta z tej samej bazy co CRM (tabele `lista_*`), ale nie z kont CRM.

- Wymaga zmiennej **`LISTA_HASLO`** (wspólne hasło). Każdy telefon loguje się raz: hasło + imię, ciasteczko ważne ok. rok.
- Nowy wpis wysyła powiadomienie push do pozostałych osób i ustawia licznik nowych wpisów na ikonie aplikacji (iPhone: iOS 16.4+, aplikacja dodana do ekranu początkowego, powiadomienia włączone w ⚙︎).
- Kod: `app/lista/`, `app/api/lista/`, `lib/lista/`, `components/lista/`, `public/lista-sw.js`, `public/lista.webmanifest`.

## CRM: oferty pasujące do klientów

Na karcie klienta w sekcji „Czego szuka” zapisuje się kryteria: transakcja, rodzaj, lokalizacje, cena, metraż, pokoje i słowa do pominięcia. Każde ogłoszenie z nbota (automat z Gmaila i ręczne wklejenie) jest porównywane z aktywnymi kryteriami. Pasujące:

- wysyłają push do opiekuna z kryteriów (albo do całego zespołu) i, gdy zaznaczono, e-mail (wymaga `RESEND_API_KEY` albo `SMTP_URL`);
- pojawiają się na pulpicie („Nowe ogłoszenia pasujące do klientów”), na karcie klienta i na karcie zgłoszenia.

Źródłem jest wyłącznie nbot (zbiera Otodom, OLX i inne portale), CRM nie wchodzi na portale. Rodzaj i transakcję odczytujemy z linku i tytułu, bo nbot nie podaje ich osobno; brakująca wartość nie wyklucza ogłoszenia, ale lokalizacja musi się zgadzać. Kod: `lib/crm/match.ts` (reguły), `lib/crm/matches.ts` (zapis i powiadomienia), `app/crm/(panel)/klienci/search-actions.ts`.
