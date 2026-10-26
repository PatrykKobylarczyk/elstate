import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/lista/LoginForm";
import { currentDevice } from "@/lib/lista/auth";

export const metadata: Metadata = { title: "Lista: logowanie" };

export default async function Logowanie() {
  if (await currentDevice()) redirect("/lista");
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-plum-900 px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
      {/* złota panorama Łodzi nocą, jak w hero strony i na logowaniu do CRM */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-[55vh] md:h-[70vh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero/panorama.webp" alt="" className="skyline h-full w-full object-cover object-[78%_100%] opacity-60 lg:object-contain lg:object-bottom" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(50,9,32,0.75),rgba(50,9,32,0)_60%)]" />
      </div>
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center font-display text-4xl font-semibold text-gold-500">
          lista<span className="text-pearl">.</span>
        </p>
        <div className="rounded-3xl bg-pearl p-7 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <h1 className="font-display text-2xl text-plum-900">Wspólna lista</h1>
          <p className="mt-2 text-sm text-graphite/60">Na tym telefonie logujesz się tylko raz.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
