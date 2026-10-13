import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, Submit } from "@/components/crm/forms";
import { Field, PageHead, card, input } from "@/components/crm/ui";
import { requireUser } from "@/lib/crm/auth";
import { importNbot } from "../../actions";

export const metadata: Metadata = { title: "Dodaj z nbota" };

// Ręczne dodanie wybranej oferty z nbota: link, skopiowany tekst ogłoszenia albo cały mail.
// CRM nie wchodzi na nbota ani na portale; czyta tylko to, co tu wklejono.
export default async function ZNbota() {
  await requireUser();
  return (
    <>
      <PageHead title="Dodaj z nbota" sub="Przeglądasz oferty w nbocie, a te, które chcesz, wklejasz tutaj. Trafiają od razu do „Do kontaktu”." />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ActionForm action={importNbot} resetOnOk className={`${card} flex flex-col gap-4`}>
          <Field label="Link, tekst oferty albo cały mail" hint="Cena, metraż, pokoje, lokalizacja i telefon odczytają się same. Resztę uzupełnisz w zgłoszeniu.">
            <textarea name="mail" rows={10} required autoFocus placeholder={"https://www.otodom.pl/pl/oferta/…\n\nalbo skopiowany opis: 3 pokoje, 58 m², Polesie, 520 000 zł, tel. 600 000 000"} className={input} />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Submit pending="Czytam…">Dodaj do CRM</Submit>
            <Link href="/crm/leady" className="text-sm font-semibold text-graphite/60 hover:text-plum-900">Wróć do zgłoszeń</Link>
          </div>
        </ActionForm>
        <div className="text-sm leading-relaxed text-graphite/70">
          <p className="font-semibold text-graphite">Jak to działa</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Jeden link albo jedna oferta to jedno zgłoszenie. Wklejony mail z kilkoma ofertami doda je wszystkie.</li>
            <li>Ogłoszenie, które już jest w CRM, nie doda się drugi raz.</li>
            <li>
              Maile z nbota przesyłane automatem czekają w zakładce{" "}
              <Link href="/crm/leady?widok=przeglad" className="font-semibold text-plum-900 underline underline-offset-2">Z nbota do przejrzenia</Link>. Tam wybierasz „Do CRM” albo „Pomiń”.
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
