import { saveSearch } from "@/app/crm/(panel)/klienci/search-actions";
import { categoriesCrm, deals } from "@/lib/crm/labels";
import type { ClientSearch } from "@/lib/crm/schema";
import { ActionForm, Submit } from "./forms";
import { Field, input } from "./ui";

// Kryteria poszukiwań klienta. Puste pole = bez ograniczeń.
export default function SearchForm({ clientId, s, team }: { clientId: number; s?: ClientSearch; team: { id: number; name: string }[] }) {
  const v = (n: number | null | undefined) => (n == null ? "" : String(n));
  return (
    <ActionForm action={saveSearch} resetOnOk={!s} className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <input type="hidden" name="clientId" value={clientId} />
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Transakcja" className="col-span-1 md:col-span-2">
        <select name="deal" defaultValue={s ? s.deal ?? "" : "sprzedaz"} className={input}>
          <option value="">Obojętnie</option>
          {deals.map(([k, l]) => <option key={k} value={k}>{l === "Sprzedaż" ? "Kupno" : "Najem"}</option>)}
        </select>
      </Field>
      <Field label="Rodzaj" className="col-span-1 md:col-span-2">
        <select name="category" defaultValue={s ? s.category ?? "" : "mieszkania"} className={input}>
          <option value="">Obojętnie</option>
          {categoriesCrm.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Field>
      <Field label="Lokalizacje" hint="Miasta, dzielnice, osiedla, ulice; po przecinku. Wystarczy jedna." className="col-span-2 md:col-span-4">
        <input name="locations" defaultValue={s?.locations.join(", ")} placeholder="np. Polesie, Bałuty, Stare Polesie" className={input} />
      </Field>
      <Field label="Cena od (zł)">
        <input name="priceMin" inputMode="numeric" defaultValue={v(s?.priceMin)} className={input} />
      </Field>
      <Field label="Cena do (zł)">
        <input name="priceMax" inputMode="numeric" defaultValue={v(s?.priceMax)} placeholder="np. 600 tys." className={input} />
      </Field>
      <Field label="Metraż od (m²)">
        <input name="areaMin" inputMode="decimal" defaultValue={v(s?.areaMin)} className={input} />
      </Field>
      <Field label="Metraż do (m²)">
        <input name="areaMax" inputMode="decimal" defaultValue={v(s?.areaMax)} className={input} />
      </Field>
      <Field label="Pokoje od">
        <input name="roomsMin" inputMode="numeric" defaultValue={v(s?.roomsMin)} className={input} />
      </Field>
      <Field label="Pokoje do">
        <input name="roomsMax" inputMode="numeric" defaultValue={v(s?.roomsMax)} className={input} />
      </Field>
      <Field label="Bez słów" hint="Pominie ogłoszenia z tymi słowami." className="col-span-2">
        <input name="exclude" defaultValue={s?.exclude.join(", ")} placeholder="np. parter, do remontu" className={input} />
      </Field>
      <Field label="Powiadamiaj" className="col-span-2">
        <select name="agentId" defaultValue={s?.agentId ?? ""} className={input}>
          <option value="">Cały zespół</option>
          {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </Field>
      <div className="col-span-2 flex flex-col justify-end gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="notifyEmail" defaultChecked={s?.notifyEmail ?? false} className="h-4 w-4 accent-plum-900" />
          Także e-mailem
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={s?.active ?? true} className="h-4 w-4 accent-plum-900" />
          Aktywne (sprawdzaj nowe ogłoszenia)
        </label>
      </div>
      <div className="col-span-2 md:col-span-4">
        <Submit>{s ? "Zapisz zmiany" : "Zapisz poszukiwania"}</Submit>
      </div>
    </ActionForm>
  );
}
