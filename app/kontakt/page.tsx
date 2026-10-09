import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import { contact } from "@/lib/data";

export const metadata: Metadata = { title: "Kontakt" };

const topics: Record<string, string> = { wycena: "Wycena nieruchomości", kredyt: "Konsultacja z doradcą kredytowym" };

export default async function Kontakt({ searchParams }: { searchParams: Promise<{ temat?: string }> }) {
  const { temat } = await searchParams;
  return (
    <section className="min-h-screen bg-pearl pt-36 pb-24">
      <div className="mx-auto grid max-w-7xl gap-16 px-5 md:px-10 lg:grid-cols-2">
        <div>
          <p className="eyebrow text-plum-900">kontakt</p>
          <h1 className="mt-4 font-display text-[clamp(3rem,7vw,6rem)] leading-[0.95]">
            Jesteśmy <em className="text-plum-900">dla Ciebie.</em>
          </h1>
          <dl className="mt-12 space-y-8">
            <div><dt className="text-sm font-semibold text-graphite/60">Telefon</dt><dd className="mt-2 text-xl"><a href={contact.phoneHref} className="hover:text-plum-900">{contact.phone}</a></dd></div>
            <div><dt className="text-sm font-semibold text-graphite/60">Kontakt</dt><dd className="mt-2 text-xl"><a href={`mailto:${contact.email}`} className="hover:text-plum-900">{contact.email}</a></dd></div>
            <div><dt className="text-sm font-semibold text-graphite/60">Kariera</dt><dd className="mt-2 text-xl"><a href={`mailto:${contact.careers}`} className="hover:text-plum-900">{contact.careers}</a></dd></div>
            <div><dt className="text-sm font-semibold text-graphite/60">Social media</dt><dd className="mt-2 text-xl"><a href={contact.instagram} target="_blank" rel="noreferrer" className="hover:text-plum-900">Instagram</a></dd></div>
          </dl>
        </div>
        <div className="lg:pt-24">
          <p className="mb-8 font-display text-3xl">Formularz kontaktowy</p>
          <ContactForm subject={temat ? topics[temat] : undefined} />
        </div>
      </div>
    </section>
  );
}
