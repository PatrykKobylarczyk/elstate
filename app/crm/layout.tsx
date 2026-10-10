import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "CRM", template: "%s | CRM Elstate" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-pearl text-graphite">{children}</div>;
}
