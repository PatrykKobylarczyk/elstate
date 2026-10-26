import { NextResponse } from "next/server";
import { deleteItem, updateItem } from "@/lib/lista/items";
import { cleanText, device, json } from "@/lib/lista/api";

// PATCH: odhaczenie / przywrócenie ({ done }) albo poprawka treści ({ text }). DELETE: usunięcie wpisu.
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const dev = await device(req);
  if (dev instanceof NextResponse) return dev;
  const id = Number((await params).id);
  const body = (await req.json().catch(() => null)) as { text?: unknown; done?: unknown } | null;
  const patch: { text?: string; done?: boolean } = {};
  if (body?.text !== undefined) {
    patch.text = cleanText(body.text);
    if (!patch.text) return json({ ok: false, error: "Wpis jest pusty." }, 400);
  }
  if (typeof body?.done === "boolean") patch.done = body.done;
  if (!Number.isInteger(id) || !Object.keys(patch).length) return json({ ok: false }, 400);
  const item = await updateItem(dev, id, patch);
  return item ? json({ ok: true, item }) : json({ ok: false, error: "Tego wpisu już nie ma." }, 404);
}

export async function DELETE(req: Request, { params }: Ctx) {
  const dev = await device(req);
  if (dev instanceof NextResponse) return dev;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return json({ ok: false }, 400);
  await deleteItem(id);
  return json({ ok: true });
}
