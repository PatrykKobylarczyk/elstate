"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CrmIcon } from "./icons";

// Pozycja menu CRM: na telefonie zakładka w dolnym pasku (ikona nad podpisem), na komputerze wiersz w bocznym menu.
export default function NavLink({ href, icon, label, short, badge }: { href: string; icon: string; label: string; short?: string; badge?: React.ReactNode }) {
  const path = usePathname();
  const active = href === "/crm" ? path === "/crm" : path.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex flex-1 flex-col items-center gap-1 rounded-xl px-1 pb-1 pt-2 text-[11px] font-semibold transition lg:flex-none lg:flex-row lg:gap-3 lg:px-3.5 lg:py-2.5 lg:text-sm ${
        active ? "text-plum-900 lg:bg-pearl/12 lg:text-pearl" : "text-graphite/50 lg:text-pearl/65 lg:hover:bg-pearl/8 lg:hover:text-pearl"
      }`}
    >
      <span className={`flex h-8 w-14 items-center justify-center rounded-full transition lg:h-auto lg:w-auto ${active ? "bg-plum-900/10 lg:bg-transparent" : ""}`}>
        <CrmIcon name={icon} className="size-[22px] lg:size-5" />
      </span>
      <span className="lg:hidden">{short ?? label}</span>
      <span className="hidden lg:inline">{label}</span>
      {badge}
    </Link>
  );
}
