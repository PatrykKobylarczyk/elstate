import Link from "next/link";
import { saveListing } from "@/app/crm/(panel)/actions";
import { categoriesCrm, deals, listingStatuses } from "@/lib/crm/labels";
import type { ListingRow } from "@/lib/crm/schema";
import { ActionForm, Submit } from "./forms";
import PhotoManager from "./PhotoManager";
import { Field, card, input } from "./ui";

type Opt = { id: number; name: string };

export default function ListingForm({ l, clients, team, me }: { l?: ListingRow; clients: Opt[]; team: Opt[]; me: number }) {
  return (
    <ActionForm action={saveListing} toast className="grid gap-6">
      {l && <input type="hidden" name="id" value={l.id} />}
      <section className={`${card} grid gap-4 md:grid-cols-4`}>
        <Field label="Tytuł na stronie" className="md:col-span-3">
          <input name="title" required defaultValue={l?.title} placeholder="np. Słoneczne 3 pokoje z balkonem" className={input} />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={l?.status ?? "szkic"} className={input}>
            {listingStatuses.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Transakcja">
          <select name="deal" defaultValue={l?.deal ?? "sprzedaz"} className={input}>
            {deals.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Rodzaj">
          <select name="category" defaultValue={l?.category ?? "mieszkania"} className={input}>
            {categoriesCrm.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Cena (zł)" hint="Przy wynajmie: czynsz miesięcznie.">
          <input name="price" inputMode="numeric" defaultValue={l?.price || ""} className={input} />
        </Field>
        <Field label="Powierzchnia (m²)">
          <input name="area" inputMode="decimal" defaultValue={l?.area || ""} className={input} />
        </Field>
        <Field label="Miasto">
          <input name="city" defaultValue={l?.city ?? "Łódź"} className={input} />
        </Field>
        <Field label="Dzielnica / osiedle">
          <input name="district" defaultValue={l?.district} placeholder="np. Śródmieście" className={input} />
        </Field>
        <Field label="Ulica" hint="Widoczna na stronie.">
          <input name="street" defaultValue={l?.street ?? ""} className={input} />
        </Field>
        <Field label="Rok budowy">
          <input name="year" inputMode="numeric" defaultValue={l?.year ?? ""} className={input} />
        </Field>
        <Field label="Pokoje">
          <input name="rooms" inputMode="numeric" defaultValue={l?.rooms ?? 2} className={input} />
        </Field>
        <Field label="Piętro" hint="0 = parter">
          <input name="floor" inputMode="numeric" defaultValue={l?.floor ?? 0} className={input} />
        </Field>
        <Field label="Pięter w budynku">
          <input name="floorsTotal" inputMode="numeric" defaultValue={l?.floorsTotal ?? ""} className={input} />
        </Field>
        <label className="flex items-center gap-3 self-end pb-2.5 text-sm font-semibold">
          <input type="checkbox" name="featured" defaultChecked={l?.featured} className="h-5 w-5 accent-plum-900" />
          Wyróżniona na stronie głównej
        </label>
      </section>

      <section className={card}>
        <h2 className="mb-4 font-display text-xl text-plum-900">Zdjęcia</h2>
        <PhotoManager initial={l?.images ?? []} prefix={l?.slug ?? "oferta"} />
      </section>

      <section className={`${card} grid gap-4`}>
        <Field label="Opis" hint="Puste linie dzielą tekst na akapity.">
          <textarea name="description" rows={9} defaultValue={l?.description ?? ""} className={input} />
        </Field>
        <Field label="Atuty" hint="Każdy w nowej linii lub po przecinku, np. balkon, winda, komórka lokatorska.">
          <textarea name="features" rows={3} defaultValue={l?.features.join("\n")} className={input} />
        </Field>
        <Field label="Adres strony oferty" hint={l ? `elstate.pl/oferty/${l.slug}` : "Tworzy się z tytułu. Możesz go zmienić."}>
          <input name="slug" defaultValue={l?.slug} placeholder="tworzy się z tytułu" className={input} />
        </Field>
      </section>

      <section className={`${card} grid gap-4 md:grid-cols-2`}>
        <h2 className="font-display text-xl text-plum-900 md:col-span-2">
          Dane wewnętrzne <span className="text-sm font-normal text-graphite/50">(nie trafiają na stronę)</span>
        </h2>
        <Field label="Właściciel (klient)">
          <select name="ownerId" defaultValue={l?.ownerId ?? ""} className={input}>
            <option value="">—</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Opiekun oferty">
          <select name="agentId" defaultValue={l?.agentId ?? me} className={input}>
            <option value="">—</option>
            {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label="Prowizja / umowa">
          <input name="commission" defaultValue={l?.commission ?? ""} placeholder="np. 2,5% netto, umowa na wyłączność do 30.06" className={input} />
        </Field>
        <Field label="Kolejność na stronie" hint="Mniejsza liczba = wyżej.">
          <input name="sortOrder" inputMode="numeric" defaultValue={l?.sortOrder ?? 0} className={input} />
        </Field>
        <Field label="Notatki wewnętrzne" className="md:col-span-2">
          <textarea name="internalNotes" rows={3} defaultValue={l?.internalNotes ?? ""} className={input} />
        </Field>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-graphite/10 bg-pearl/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <Submit>Zapisz</Submit>
        {l && (l.status === "aktywna" || l.status === "rezerwacja") && (
          <Link href={`/oferty/${l.slug}`} target="_blank" className="text-sm font-semibold text-plum-900 hover:underline">Zobacz na stronie ↗</Link>
        )}
      </div>
    </ActionForm>
  );
}
