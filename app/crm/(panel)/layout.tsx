import Link from "next/link";
import LeadPing from "@/components/crm/LeadPing";
import NavLink from "@/components/crm/NavLink";
import { requireUser } from "@/lib/crm/auth";
import { inboxCount } from "@/lib/crm/counts";
import { logout } from "../auth-actions";

// Układ panelu: na komputerze boczne menu, na telefonie (i w zainstalowanej aplikacji) górny pasek z logo
// i dolny pasek zakładek pod kciukiem. Marginesy env(safe-area-inset-*) omijają wcięcie i pasek gestów iPhone'a.
export default async function Panel({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const inbox = await inboxCount();
  return (
    <div className="lg:flex">
      <aside className="sticky top-0 z-40 bg-plum-900 pt-[env(safe-area-inset-top)] text-pearl lg:h-dvh lg:w-64 lg:shrink-0 lg:pt-0">
        <div className="flex h-full flex-col gap-2 px-4 py-3 lg:p-5">
          <div className="flex items-center justify-between lg:mb-6 lg:px-2">
            <Link href="/crm" className="font-display text-[1.6rem] font-semibold tracking-[-0.02em] text-gold-500 lg:text-2xl">
              elstate<span className="text-pearl">.</span>
              <span className="ml-1.5 align-middle text-[10px] font-semibold uppercase tracking-[0.25em] text-pearl/55">crm</span>
            </Link>
            <Link href="/crm/ustawienia" aria-label="Moje konto i aplikacja" className="flex size-9 items-center justify-center rounded-full bg-pearl/10 text-sm font-semibold text-pearl lg:hidden">
              {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </Link>
          </div>
          <nav
            aria-label="Menu CRM"
            className="fixed inset-x-0 bottom-0 z-40 flex border-t border-graphite/10 bg-white/95 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-10px_30px_rgba(29,4,18,0.06)] backdrop-blur-xl lg:static lg:flex-col lg:gap-1 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none"
          >
            <NavLink href="/crm" icon="home" label="Pulpit" />
            <NavLink href="/crm/leady" icon="inbox" label="Do kontaktu" short="Zgłoszenia" badge={<LeadPing initial={inbox.count} latest={inbox.latest} />} />
            <NavLink href="/crm/oferty" icon="building" label="Oferty" />
            <NavLink href="/crm/klienci" icon="users" label="Klienci" />
            <NavLink href="/crm/ustawienia" icon="settings" label="Ustawienia" short="Więcej" />
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
      <main className="min-w-0 flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 md:px-8 md:pt-10 lg:pb-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
