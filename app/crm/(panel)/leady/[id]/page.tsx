import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import Notes from "@/components/crm/Notes";
import { ActionForm, Submit } from "@/components/crm/forms";
import { Badge, Field, btnGhost, card, input, leadTone, pln, when } from "@/components/crm/ui";
import { requireUser } from "@/lib/crm/auth";
import { db } from "@/lib/crm/db";
import { label, leadSources, leadStatuses } from "@/lib/crm/labels";
import { leads, users } from "@/lib/crm/schema";
import { toLocalInput } from "@/lib/crm/time";
import { leadToClient, leadToListing, updateLead } from "../../actions";

export const metadata: Metadata = { title: "Zgłoszenie" };

export default async function Lead({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const d = await db();
  const [l] = await d.select().from(leads).where(eq(leads.id, id));
  if (!l) notFound();
  const team = await d.select({ id: users.id, name: users.name }).from(users).where(eq(users.active, true));

  return (
    <>
      <Link href="/crm/leady" className="text-sm font-semibold text-graphite/55 hover:text-plum-900">← Zgłoszenia</Link>
      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-plum-900">{l.title || l.contactName || "Zgłoszenie"}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-graphite/55">
            <Badge tone={leadTone[l.status]}>{label(leadStatuses, l.status)}</Badge>
            {l.portal ?? label(leadSources, l.source)} · dodane {when(l.createdAt)}
            {l.seenCount > 1 && <Badge tone="gold">ogłoszenie przyszło {l.seenCount}×</Badge>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {l.phone && <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="inline-flex rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-pearl hover:bg-plum-700">Zadzwoń {l.phone}</a>}
          {l.url && <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className={btnGhost}>Ogłoszenie ↗</a>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="grid content-start gap-6">
          <ActionForm key={`${l.status}-${l.assignedTo}`} action={updateLead} className={`${card} grid gap-4 md:grid-cols-2`}>
            <input type="hidden" name="id" value={l.id} />
            <Field label="Status">
              <select name="status" defaultValue={l.status} className={input}>
                {leadStatuses.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Prowadzi">
              <select name="assignedTo" defaultValue={l.assignedTo ?? ""} className={input}>
                <option value="">Nikt</option>
                {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
            <Field label="Następny kontakt" hint="Pojawi się na pulpicie w „Kontaktach na dziś”.">
              <input name="nextContactAt" type="datetime-local" defaultValue={toLocalInput(l.nextContactAt)} className={input} />
            </Field>
            <Field label="Tytuł">
              <input name="title" defaultValue={l.title ?? ""} className={input} />
            </Field>
            <Field label="Osoba">
              <input name="contactName" defaultValue={l.contactName ?? ""} className={input} />
            </Field>
            <Field label="Telefon">
              <input name="phone" type="tel" defaultValue={l.phone ?? ""} className={input} />
            </Field>
            <Field label="E-mail">
              <input name="email" type="email" defaultValue={l.email ?? ""} className={input} />
            </Field>
            <Field label="Lokalizacja">
              <input name="location" defaultValue={l.location ?? ""} className={input} />
            </Field>
            <Field label="Cena (zł)">
              <input name="price" inputMode="numeric" defaultValue={l.price ?? ""} className={input} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Metraż (m²)">
                <input name="area" inputMode="decimal" defaultValue={l.area ?? ""} className={input} />
              </Field>
              <Field label="Pokoje">
                <input name="rooms" inputMode="numeric" defaultValue={l.rooms ?? ""} className={input} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Submit>Zapisz</Submit>
            </div>
          </ActionForm>

          {(l.message || l.raw) && (
            <section className={card}>
              <h2 className="mb-3 font-display text-xl text-plum-900">{l.source === "nbot" ? "Treść z maila nbot" : "Wiadomość"}</h2>
              {l.message && l.source !== "nbot" && <p className="whitespace-pre-line text-[15px]">{l.message}</p>}
              {l.raw && <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-pearl p-4 font-sans text-sm text-graphite/75">{l.raw}</pre>}
              {l.price && l.area ? <p className="mt-3 text-sm text-graphite/55">{pln(Math.round(l.price / l.area))} za m²</p> : null}
            </section>
          )}
        </div>

        <div className="grid content-start gap-6">
          <section className={card}>
            <h2 className="mb-3 font-display text-xl text-plum-900">Dalej</h2>
            <div className="flex flex-col gap-2">
              <form action={leadToClient}>
                <input type="hidden" name="id" value={l.id} />
                <button className={`${btnGhost} w-full`}>{l.clientId ? "Karta klienta →" : "Zapisz jako klienta"}</button>
              </form>
              <form action={leadToListing}>
                <input type="hidden" name="id" value={l.id} />
                <button className={`${btnGhost} w-full`}>{l.listingId ? "Oferta w CRM →" : "Pozyskane: utwórz szkic oferty"}</button>
              </form>
            </div>
          </section>
          <Notes leadId={l.id} />
        </div>
      </div>
    </>
  );
}
