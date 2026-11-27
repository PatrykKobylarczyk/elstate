// Jednorazowo: dodaje szkic oferty z pliku oferta.json do bazy CRM (z jednym zdjęciem).
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import postgres from "postgres";
import sharp from "sharp";

const data = JSON.parse(await readFile(new URL("./oferta.json", import.meta.url), "utf8"));
const url = process.env.DATABASE_URL;
if (!url) throw new Error("brak DATABASE_URL");
const sql = postgres(url, { max: 1, ssl: "require" });
const L = data.listing;

const exists = await sql`select id, slug, status from listings where slug = ${L.slug} or internal_notes like ${"%" + data.source + "%"}`;
const already = exists.length > 0;
if (already) console.log("Oferta już jest:", exists);

const images = [];
const r = await fetch(data.photo, { headers: { "user-agent": "Mozilla/5.0" } });
console.log("zdjęcie HTTP", r.status);
if (r.ok) {
  const out = await sharp(Buffer.from(await r.arrayBuffer()))
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  await writeFile("zdjecie.webp", out);
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    const { put } = await import("@vercel/blob");
    const pathname = `oferty/${L.slug.slice(0, 40)}-${randomBytes(6).toString("hex")}.webp`;
    const opts = { contentType: "image/webp", addRandomSuffix: false, token };
    try {
      images.push((await put(pathname, out, { access: "public", ...opts })).url);
    } catch (e) {
      if (!/private/i.test(e?.message ?? "")) throw e;
      await put(pathname, out, { access: "private", ...opts });
      images.push(`/zdjecia/${pathname}`);
    }
  } else console.log("Brak BLOB_READ_WRITE_TOKEN: zdjęcie tylko jako artefakt workflow");
}

if (already) {
  await sql.end();
  process.exit(0);
}
const [row] = await sql`
  insert into listings (slug, status, title, deal, category, city, district, street, price, area, rooms, floor, floors_total, year,
    description, description_sections, features, images, lat, lng, internal_notes)
  values (${L.slug}, ${L.status}, ${L.title}, ${L.deal}, ${L.category}, ${L.city}, ${L.district}, ${L.street}, ${L.price}, ${L.area},
    ${L.rooms}, ${L.floor}, ${L.floorsTotal}, ${L.year}, ${L.description}, ${sql.json(L.descriptionSections)}, ${sql.json(L.features)},
    ${sql.json(images)}, ${L.lat}, ${L.lng}, ${L.internalNotes})
  returning id, slug, status, images`;
await sql`insert into audit (action, subject, meta) values ('listing_saved', ${row.slug}, ${sql.json({ id: row.id, status: row.status, import: "otodom" })})`;
console.log("DODANO", JSON.stringify(row));
await sql.end();
