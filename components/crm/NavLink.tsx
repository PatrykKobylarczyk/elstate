"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = href === "/crm" ? path === "/crm" : path.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${active ? "bg-pearl/12 text-pearl" : "text-pearl/65 hover:bg-pearl/8 hover:text-pearl"}`}
    >
      {children}
    </Link>
  );
}
