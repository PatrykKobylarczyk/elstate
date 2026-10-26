import "server-only";
import { NextResponse } from "next/server";
import type { ListaDevice } from "@/lib/crm/schema";
import { currentDevice, touchDevice } from "./auth";

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Zalogowane urządzenie albo gotowa odpowiedź 401/403. Zmiany przyjmujemy tylko z tej samej domeny. */
export async function device(req: Request): Promise<ListaDevice | NextResponse> {
  if (req.method !== "GET") {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host")) return json({ ok: false }, 403);
  }
  const dev = await currentDevice();
  if (!dev) return json({ ok: false, error: "Zaloguj się ponownie." }, 401);
  await touchDevice(dev);
  return dev;
}

export const cleanText = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, 1000) : "");
