// Jednorazowo: pobiera ogłoszenie z Otodom i wypisuje dane z __NEXT_DATA__ (opis, parametry, zdjęcia).
const url = process.argv[2];
const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", "accept-language": "pl-PL,pl;q=0.9" } });
console.log("HTTP", res.status);
const html = await res.text();
const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
if (!m) { console.log(html.slice(0, 3000)); process.exit(1); }
const ad = JSON.parse(m[1]).props.pageProps.ad;
const out = {
  title: ad.title, description: ad.description, location: ad.location, target: ad.target,
  characteristics: (ad.characteristics || []).map((c) => [c.key, c.localizedValue]),
  features: ad.features, featuresByCategory: ad.featuresByCategory, topInformation: ad.topInformation, additionalInformation: ad.additionalInformation,
  images: (ad.images || []).map((i) => i.large || i.medium),
};
console.log(JSON.stringify(out, null, 2));
