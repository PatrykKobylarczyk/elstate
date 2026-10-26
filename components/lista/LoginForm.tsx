"use client";

import { useActionState } from "react";
import { login } from "@/app/lista/actions";

const input = "w-full rounded-xl border border-graphite/15 bg-white px-3.5 py-2.5 text-base outline-none focus:border-plum-700 focus:ring-2 focus:ring-plum-700/15";

export default function LoginForm() {
  const [state, run, pending] = useActionState(login, undefined);
  return (
    <form action={run} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-graphite/70">Twoje imię</span>
        <input name="name" required maxLength={30} autoComplete="given-name" autoCapitalize="words" className={input} />
        <span className="text-xs text-graphite/45">Widać je przy Twoich wpisach.</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-graphite/70">Hasło</span>
        <input name="password" type="password" required autoComplete="current-password" className={input} />
      </label>
      {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-800">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-full bg-plum-900 px-5 py-3 text-sm font-semibold text-pearl disabled:opacity-50">
        {pending ? "Sprawdzam…" : "Wejdź"}
      </button>
    </form>
  );
}
