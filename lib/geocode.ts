import "server-only";

// Współrzędne okolicy oferty do mapy. OpenStreetMap Nominatim, wynik w cache na 30 dni,
// więc każda oferta pyta o adres najwyżej raz w miesiącu. Pytamy od najdokładniejszego zapytania
// (ulica, dzielnica, miasto) do najogólniejszego (samo miasto), zawsze z „Polska” na końcu.
export async function geocode(parts: { street?: string; district?: string; city?: string }) {
  const { street, district, city } = parts;
  const queries = [
    [street, district, city],
    [street, city],
    [district, city],
    [city],
  ]
    .map((q) => q.filter(Boolean).join(", "))
    .filter((q, i, all) => q && all.indexOf(q) === i);
  for (const q of queries) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=pl&q=${encodeURIComponent(q)}`, {
        headers: { "User-Agent": "elstate.pl (info@elstate.pl)", "Accept-Language": "pl" },
        next: { revalidate: 60 * 60 * 24 * 30 },
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) continue;
      const [hit] = (await r.json()) as { lat: string; lon: string }[];
      if (hit) return { lat: Number(hit.lat), lng: Number(hit.lon), query: q };
    } catch {
      // brak odpowiedzi: spróbuj ogólniejszego zapytania
    }
  }
  return null;
}
