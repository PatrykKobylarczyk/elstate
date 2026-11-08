"use client";

import { useState } from "react";
import { Field, input } from "./ui";

type Opt = { id: number; name: string };

// Wybór właściciela oferty z listy klientów albo dopisanie nowego od razu w formularzu oferty.
// Nowy klient zapisuje się razem z ofertą (saveListing), jako „sprzedający”.
export default function OwnerPicker({ clients, value }: { clients: Opt[]; value?: number | null }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
      <Field label="Właściciel (klient)">
        <select
          name="ownerId"
          defaultValue={value ?? ""}
          onChange={(e) => setAdding(e.target.value === "nowy")}
          className={input}
        >
          <option value="">—</option>
          <option value="nowy">+ Dodaj nowego właściciela…</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      {adding && (
        <div className="grid gap-4 rounded-2xl bg-mist/60 p-4 md:col-span-2 md:grid-cols-3">
          <Field label="Imię i nazwisko / firma">
            <input name="ownerName" required autoFocus className={input} />
          </Field>
          <Field label="Telefon">
            <input name="ownerPhone" type="tel" className={input} />
          </Field>
          <Field label="E-mail">
            <input name="ownerEmail" type="email" className={input} />
          </Field>
          <p className="text-xs text-graphite/55 md:col-span-3">Klient zapisze się w zakładce Klienci razem z ofertą.</p>
        </div>
      )}
    </div>
  );
}
