import { readFile } from "node:fs/promises";
import { localUploadPath } from "@/lib/crm/storage";

// Tylko do pracy lokalnej: zdjęcia ofert zapisane w .data/uploads (na produkcji leżą w Vercel Blob).
export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[\w-]+\.webp$/.test(name)) return new Response(null, { status: 404 });
  try {
    const buf = await readFile(localUploadPath(name));
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
