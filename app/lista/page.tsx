import { redirect } from "next/navigation";
import ListaApp from "@/components/lista/ListaApp";
import { currentDevice, listaReady } from "@/lib/lista/auth";
import { listFor } from "@/lib/lista/items";

export default async function Lista() {
  if (!listaReady()) {
    return (
      <p className="mx-auto max-w-sm px-6 py-24 text-center text-graphite/60">
        Lista nie jest jeszcze skonfigurowana. Potrzebna jest baza (DATABASE_URL) i hasło w zmiennej LISTA_HASLO.
      </p>
    );
  }
  const dev = await currentDevice();
  if (!dev) redirect("/lista/logowanie");
  return <ListaApp initial={await listFor(dev, true)} />;
}
