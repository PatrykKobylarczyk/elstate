import type { Metadata } from "next";
import Link from "next/link";
import ClientForm from "@/components/crm/ClientForm";
import { PageHead } from "@/components/crm/ui";
import { requireUser } from "@/lib/crm/auth";

export const metadata: Metadata = { title: "Nowy klient" };

export default async function NowyKlient() {
  await requireUser();
  return (
    <>
      <Link href="/crm/klienci" className="text-sm font-semibold text-graphite/55 hover:text-plum-900">← Klienci</Link>
      <PageHead title="Nowy klient" />
      <div className="max-w-3xl">
        <ClientForm />
      </div>
    </>
  );
}
