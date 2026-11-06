import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import ListingForm from "@/components/crm/ListingForm";
import { ConfirmButton } from "@/components/crm/forms";
import { Badge, PageHead, btnDanger, listingTone } from "@/components/crm/ui";
import { requireUser } from "@/lib/crm/auth";
import { db } from "@/lib/crm/db";
import { label, listingStatuses } from "@/lib/crm/labels";
import { pickers } from "@/lib/crm/options";
import { listings } from "@/lib/crm/schema";
import { deleteListing } from "../../../actions";

export const metadata: Metadata = { title: "Edycja oferty" };

export default async function EdycjaOferty({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ zapisano?: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const d = await db();
  const [l] = await d.select().from(listings).where(eq(listings.id, id));
  if (!l) notFound();
  const p = await pickers();
  const saved = (await searchParams).zapisano;
  return (
    <>
      <Link href={`/crm/oferty/${l.id}`} className="text-sm font-semibold text-graphite/55 hover:text-plum-900">← Wróć do oferty</Link>
      <PageHead title={`Edycja: ${l.title}`} sub={<Badge tone={listingTone[l.status]}>{label(listingStatuses, l.status)}</Badge>} />
      {saved && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">Oferta utworzona. Dodaj zdjęcia i ustaw status „Aktywna”, żeby pojawiła się na stronie.</p>}
      <ListingForm l={l} clients={p.clients} team={p.team} me={user.id} />
      <form action={deleteListing} className="mt-8">
        <input type="hidden" name="id" value={l.id} />
        <ConfirmButton className={btnDanger} message="Usunąć ofertę razem ze zdjęciami? Tego nie da się cofnąć. (Zamiast tego możesz dać status „Archiwum”.)">
          Usuń ofertę
        </ConfirmButton>
      </form>
    </>
  );
}
