"use server";

import { redirect } from "next/navigation";
import { endDevice, listaReady, loginLocked, logFail, passwordOk, startDevice } from "@/lib/lista/auth";

export type LoginState = { error?: string } | undefined;

export async function login(_: LoginState, f: FormData): Promise<LoginState> {
  if (!listaReady()) return { error: "Lista nie jest jeszcze skonfigurowana." };
  const name = String(f.get("name") ?? "").trim().slice(0, 30);
  const password = String(f.get("password") ?? "");
  if (!name || !password) return { error: "Podaj imię i hasło." };
  if (await loginLocked()) return { error: "Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut." };
  if (!passwordOk(password)) {
    await logFail();
    return { error: "Nieprawidłowe hasło." };
  }
  await startDevice(name);
  redirect("/lista");
}

export async function logout() {
  await endDevice();
  redirect("/lista/logowanie");
}
