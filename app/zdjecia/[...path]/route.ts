import { readPrivateImage } from "@/lib/crm/storage";

// Zdjęcia ofert z prywatnego magazynu Vercel Blob. Pliki mają w nazwie losowy ciąg i nigdy się nie zmieniają,
// więc przeglądarka i CDN mogą je trzymać na zawsze.
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  try {
    const r = await readPrivateImage(path.join("/"));
    if (!r) return new Response(null, { status: 404 });
    return new Response(r.stream, {
      headers: { "Content-Type": r.blob.contentType || "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (e) {
    console.error("[zdjęcia] odczyt", e);
    return new Response(null, { status: 502 });
  }
}
