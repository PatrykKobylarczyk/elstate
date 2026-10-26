import { after, NextResponse } from "next/server";
import { addItem, listFor } from "@/lib/lista/items";
import { cleanText, device, json } from "@/lib/lista/api";
import { notifyOthers } from "@/lib/lista/push";

// GET: cała lista (z ?seen=1 także „przeczytane”, licznik na ikonie spada do zera). POST: nowy wpis.
export async function GET(req: Request) {
  const dev = await device(req);
  if (dev instanceof NextResponse) return dev;
  const seen = new URL(req.url).searchParams.get("seen") === "1";
  return json({ ok: true, ...(await listFor(dev, seen)) });
}

export async function POST(req: Request) {
  const dev = await device(req);
  if (dev instanceof NextResponse) return dev;
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = cleanText(body?.text);
  if (!text) return json({ ok: false, error: "Wpis jest pusty." }, 400);
  const item = await addItem(dev, text);
  // powiadomienie po wysłaniu odpowiedzi, żeby dodawanie było natychmiastowe
  after(() => notifyOthers(dev.name, { title: `${dev.name} dodaje do listy`, body: text.length > 140 ? `${text.slice(0, 140)}…` : text, tag: `lista-${item.id}` }));
  return json({ ok: true, item });
}
