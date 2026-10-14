import { visitorRegion } from "@/lib/region";

// Ekrany logowania CRM: fiolet jak hero strony, u dołu złota panorama Łodzi albo Gdańska
// (ta sama, co na stronie głównej, wybierana według lokalizacji: lib/region.ts).
const panorama = { lodz: "/hero/panorama.webp", gdansk: "/hero/panorama-gdansk.webp" };

export default async function AuthCard({ title, sub, children }: { title: string; sub?: React.ReactNode; children: React.ReactNode }) {
  const region = await visitorRegion();
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-plum-900 px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-[max(3rem,calc(env(safe-area-inset-top)+1.5rem))]">
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-[55vh] md:h-[70vh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={panorama[region]} alt="" className="skyline h-full w-full object-cover object-[78%_100%] opacity-60 lg:object-contain lg:object-bottom" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(50,9,32,0.75),rgba(50,9,32,0)_60%)]" />
      </div>
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center font-display text-3xl font-semibold tracking-[-0.02em] text-gold-500">
          elstate<span className="text-pearl">.</span>
          <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-[0.25em] text-pearl/60">crm</span>
        </p>
        <div className="rounded-3xl bg-pearl p-7 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <h1 className="font-display text-2xl text-plum-900">{title}</h1>
          {sub && <div className="mt-2 text-sm text-graphite/60">{sub}</div>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
