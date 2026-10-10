export default function AuthCard({ title, sub, children }: { title: string; sub?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-plum-900 px-4 py-12">
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
