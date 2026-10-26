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
