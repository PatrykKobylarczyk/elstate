import Link from "next/link";
import Wordmark from "./Wordmark";
import { contact } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="overflow-hidden bg-plum-900 text-pearl">
      <div className="mx-auto grid max-w-[96rem] gap-12 px-5 pt-24 md:grid-cols-4 md:px-10">
        <div className="md:col-span-2">
          <p className="max-w-sm text-lg leading-relaxed text-pearl/70">
            Butikowa agencja nieruchomości. Łódź, a wkrótce także Trójmiasto.
          </p>
        </div>
        <div>
          <p className="eyebrow text-gold-300">kontakt</p>
          <ul className="mt-5 space-y-2 text-sm">
            <li><a href={contact.phoneHref} className="hover:text-gold-300">{contact.phone}</a></li>
            <li><a href={`mailto:${contact.email}`} className="hover:text-gold-300">{contact.email}</a></li>
            <li><a href={`mailto:${contact.careers}`} className="text-pearl/60 hover:text-gold-300">kariera: {contact.careers}</a></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-gold-300">odkryj</p>
          <ul className="mt-5 space-y-2 text-sm">
            <li><Link href="/oferty" className="hover:text-gold-300">Oferty</Link></li>
            <li><Link href="/#uslugi" className="hover:text-gold-300">Usługi</Link></li>
            <li><Link href="/#finanse" className="hover:text-gold-300">Finanse</Link></li>
            <li><Link href="/kontakt" className="hover:text-gold-300">Kontakt</Link></li>
            <li><a href={contact.instagram} target="_blank" rel="noreferrer" className="hover:text-gold-300">Instagram</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-[96rem] px-5 md:px-10">
        <Wordmark className="mt-16 block text-[clamp(5rem,22vw,22rem)] leading-[0.8] text-pearl" />
      </div>
      <div className="mx-auto flex max-w-[96rem] flex-wrap justify-between gap-4 px-5 pb-8 pt-14 text-xs text-pearl/40 md:pt-20 md:px-10">
        <span>© {new Date().getFullYear()} ELSTATE NIERUCHOMOŚCI</span>
        <span>Łódź · Trójmiasto</span>
      </div>
    </footer>
  );
}
