import AuthCard from "./AuthCard";

export default function NoDb() {
  return (
    <AuthCard title="Baza nie jest podłączona" sub="CRM potrzebuje bazy danych Postgres.">
      <ol className="list-decimal space-y-2 pl-5 text-sm text-graphite/75">
        <li>W Vercelu: projekt → Storage → Create Database → Neon (region Frankfurt).</li>
        <li>Połącz bazę z projektem; Vercel sam doda zmienną DATABASE_URL.</li>
        <li>Zrób ponowne wdrożenie (Redeploy). Tabele utworzą się same.</li>
      </ol>
    </AuthCard>
  );
}
