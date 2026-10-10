import type { Metadata } from "next";
import Link from "next/link";
import ListingForm from "@/components/crm/ListingForm";
import { PageHead } from "@/components/crm/ui";
import { requireUser } from "@/lib/crm/auth";
import { pickers } from "@/lib/crm/options";

export const metadata: Metadata = { title: "Nowa oferta" };

export default async function Nowa() {
  const user = await requireUser();
  const p = await pickers();
  return (
    <>
      <Link href="/crm/oferty" className="text-sm font-semibold text-graphite/55 hover:text-plum-900">← Oferty</Link>
      <PageHead title="Nowa oferta" sub="Oferta pojawi się na stronie, gdy ustawisz status „Aktywna”." />
      <ListingForm clients={p.clients} team={p.team} me={user.id} />
    </>
  );
}
