import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Zdjęcia ofert. Produkcja: Vercel Blob (BLOB_READ_WRITE_TOKEN). Lokalnie: katalog .data/uploads,
// serwowany przez /crm-pliki/[nazwa]. Każde zdjęcie skalujemy do 2400 px i zapisujemy jako WebP,
// a przy okazji zdejmujemy metadane EXIF (w tym lokalizację GPS z telefonu).

const LOCAL_DIR = path.join(process.cwd(), ".data", "uploads");
const MAX_BYTES = 25 * 1024 * 1024;

// Token Blob: zwykle BLOB_READ_WRITE_TOKEN, ale przy podłączaniu magazynu Vercel pozwala ustawić własny
// prefiks (np. ELSTATE_READ_WRITE_TOKEN), więc szukamy też każdej zmiennej *_READ_WRITE_TOKEN z tokenem Blob.
export function blobTokenVar(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "BLOB_READ_WRITE_TOKEN";
  return Object.keys(process.env).find((k) => k.endsWith("_READ_WRITE_TOKEN") && process.env[k]?.startsWith("vercel_blob_rw_"));
}
const blobToken = () => {
  const k = blobTokenVar();
  return k ? process.env[k] : undefined;
};

export const storageReady = () => Boolean(blobToken()) || !process.env.VERCEL;

export async function saveImage(file: File, prefix: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name}: to nie jest zdjęcie.`);
  if (file.size > MAX_BYTES) throw new Error(`${file.name}: plik większy niż 25 MB.`);
  const input = Buffer.from(await file.arrayBuffer());
  const out = await sharp(input, { failOn: "error" })
    .rotate() // obrót wg EXIF, zanim metadane znikną
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const name = `${prefix}-${randomBytes(6).toString("hex")}.webp`;
  const token = blobToken();
  if (token) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`oferty/${name}`, out, { access: "public", contentType: "image/webp", addRandomSuffix: false, token });
    return blob.url;
  }
  if (process.env.VERCEL)
    throw new Error(`Brak magazynu zdjęć w środowisku „${process.env.VERCEL_ENV ?? "?"}”: podłącz Vercel Blob do tego środowiska i zrób Redeploy. Szczegóły w CRM: Ustawienia.`);
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, name), out);
  return `/crm-pliki/${name}`;
}

export async function removeImage(url: string) {
  try {
    if (url.startsWith("/crm-pliki/")) await unlink(path.join(LOCAL_DIR, path.basename(url)));
    else if (url.includes(".blob.vercel-storage.com") && blobToken()) {
      const { del } = await import("@vercel/blob");
      await del(url, { token: blobToken() });
    }
  } catch {
    // brak pliku nie blokuje zapisu oferty
  }
}

export const localUploadPath = (name: string) => path.join(LOCAL_DIR, path.basename(name));
