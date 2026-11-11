// Przybliżona lokalizacja oferty na stronie publicznej: dokładnego adresu (ulica i numer) nie pokazujemy,
// a pinezkę przesuwamy o 150–300 m w stronę zależną od oferty. Przesunięcie jest stałe dla danej oferty
// (liczone ze slugu), więc pinezka nie skacze przy odświeżeniu i nie da się jej „uśrednić” do adresu.
export function approxSpot(spot: { lat: number; lng: number }, seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rnd = (n: number) => ((Math.imul(h ^ n, 2654435761) >>> 0) % 10000) / 10000;
  const angle = rnd(1) * 2 * Math.PI;
  const meters = 150 + rnd(2) * 150;
  const dLat = (meters * Math.cos(angle)) / 111_320;
  const dLng = (meters * Math.sin(angle)) / (111_320 * Math.cos((spot.lat * Math.PI) / 180));
  // zaokrąglenie do ok. 10 m, żeby w kodzie strony nie było współrzędnych z pełną dokładnością
  const round = (x: number) => Math.round(x * 10000) / 10000;
  return { lat: round(spot.lat + dLat), lng: round(spot.lng + dLng) };
}
