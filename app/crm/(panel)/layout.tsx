import Link from "next/link";
import LeadPing from "@/components/crm/LeadPing";
import NavLink from "@/components/crm/NavLink";
import { requireUser } from "@/lib/crm/auth";
import { inboxCount } from "@/lib/crm/counts";
import { logout } from "../auth-actions";

export default async function Panel({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const inbox = await inboxCount();
  return (
    <div className="lg:flex">
      <aside className="sticky top-0 z-40 bg-plum-900 text-pearl lg:h-dvh lg:w-64 lg:shrink-0">
        <div className="flex h-full flex-col gap-2 p-3 lg:p-5">
          <div className="flex items-center justify-between px-2 lg:mb-6">
            <Link href="/crm" className="font-display text-2xl font-semibold tracking-[-0.02em] text-gold-500">
              elstate<span className="text-pearl">.</span>
              <span className="ml-1.5 align-middle text-[10px] font-semibold uppercase tracking-[0.25em] text-pearl/55">crm</span>
            </Link>
            <form action={logout} className="lg:hidden">
              <button className="text-xs font-semibold text-pearl/60">Wyloguj</button>
            </form>
          </div>
          <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:flex-col lg:overflow-visible">
            <NavLink href="/crm">Pulpit</NavLink>
            <NavLink href="/crm/leady">
              Do kontaktu
              <LeadPing initial={inbox.count} latest={inbox.latest} />
            </NavLink>
            <NavLink href="/crm/oferty">Oferty</NavLink>
            <NavLink href="/crm/klienci">Klienci</NavLink>
            <NavLink href="/crm/ustawienia">Ustawienia</NavLink>
          </nav>
          <div className="mt-auto hidden border-t border-pearl/10 px-2 pt-4 lg:block">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-pearl/50">{user.email}</p>
            <div className="mt-3 flex gap-4 text-xs font-semibold text-pearl/60">
              <Link href="/" target="_blank" className="hover:text-pearl">Strona ↗</Link>
              <form action={logout}>
                <button className="hover:text-pearl">Wyloguj</button>
              </form>
            </div>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
