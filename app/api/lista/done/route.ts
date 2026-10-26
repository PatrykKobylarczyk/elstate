import { NextResponse } from "next/server";
import { clearDone } from "@/lib/lista/items";
import { device, json } from "@/lib/lista/api";

// „Wyczyść zrobione”: usuwa wszystkie odhaczone wpisy
export async function DELETE(req: Request) {
  const dev = await device(req);
  if (dev instanceof NextResponse) return dev;
  await clearDone();
  return json({ ok: true });
}
