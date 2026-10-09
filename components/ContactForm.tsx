"use client";

import { useState } from "react";

export default function ContactForm({ subject }: { subject?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/kontakt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, subject }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-[1.5rem] border border-current/20 p-8">
        <p className="font-display text-3xl">Dziękujemy.</p>
        <p className="mt-3 opacity-70">Odezwiemy się najszybciej, jak to możliwe. Do zobaczenia!</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 sm:grid-cols-2">
      <label className="sm:col-span-1">
        <span className="sr-only">Imię i nazwisko</span>
        <input id="contact-name" name="name" required autoComplete="name" placeholder="Imię i nazwisko" className="field" />
      </label>
      <label className="sm:col-span-1">
        <span className="sr-only">Telefon lub e-mail</span>
        <input id="contact-reach" name="reach" required placeholder="Telefon lub e-mail" className="field" />
      </label>
      <label className="sm:col-span-2">
        <span className="sr-only">Wiadomość</span>
        <textarea id="contact-message" name="message" rows={4} required placeholder="Napisz, w czym możemy pomóc" className="field resize-none" defaultValue={subject ? `Dzień dobry, interesuje mnie oferta: ${subject}.` : ""} />
      </label>
      <label className="flex items-start gap-3 text-xs leading-relaxed text-current/60 sm:col-span-2">
        <input id="contact-consent" type="checkbox" name="consent" required className="mt-0.5 accent-plum-900" />
        Wyrażam zgodę na przetwarzanie moich danych osobowych w celu odpowiedzi na wiadomość.
      </label>
      <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
        <button type="submit" disabled={state === "sending"} className="btn-primary disabled:opacity-60">
          {state === "sending" ? "Wysyłanie…" : "Wyślij wiadomość"}
        </button>
        {state === "error" && <p className="text-sm">Nie udało się wysłać. Zadzwoń lub napisz na info@elstate.pl.</p>}
      </div>
    </form>
  );
}
