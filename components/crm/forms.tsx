"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { btn } from "./ui";

type State = { error?: string; ok?: string } | undefined;

export function Submit({ children, className = btn, pending: pendingLabel = "Zapisuję…" }: { children: React.ReactNode; className?: string; pending?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}

// Formularz akcji serwera z komunikatem o błędzie lub sukcesie
export function ActionForm({
  action,
  children,
  className,
  resetOnOk = false,
  toast = false,
}: {
  action: (s: State, f: FormData) => Promise<State>;
  children: React.ReactNode;
  className?: string;
  resetOnOk?: boolean;
  toast?: boolean;
}) {
  const [state, run] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnOk && state?.ok) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form ref={ref} action={run} className={className}>
      {children}
      {state?.error && <p role="alert" className={`${toast ? "fixed right-4 bottom-20 z-50 max-w-sm shadow-lg" : ""} rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-800`}>{state.error}</p>}
      {state?.ok && <p role="status" className={`${toast ? "fixed right-4 bottom-20 z-50 max-w-sm shadow-lg" : ""} whitespace-pre-line rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-900`}>{state.ok}</p>}
    </form>
  );
}

// Przycisk z potwierdzeniem (np. usunięcie)
export function ConfirmButton({ children, message, className }: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button type="submit" className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
