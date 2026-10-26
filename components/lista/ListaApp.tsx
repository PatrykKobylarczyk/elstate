"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Item, ListState } from "@/lib/lista/items";
import Settings from "./Settings";

const CACHE = "lista-cache";
const POLL_MS = 15_000;
// po dyktowaniu z mikrofonu klawiatury wpis dodaje się sam po tylu ms ciszy
const DICTATION_IDLE_MS = 2000;

// Wspólna lista: dodawanie, odhaczanie, poprawianie i usuwanie wpisów. Zmiany od razu na ekranie, w tle zapis na serwerze.
// Gdy aplikacja jest na wierzchu, co 15 s i po każdym powiadomieniu pobiera świeżą listę i zeruje licznik na ikonie.
export default function ListaApp({ initial }: { initial: ListState }) {
  const [state, setState] = useState(initial);
  // wpisy dodane przez innych od poprzedniego otwarcia dostają złotą kropkę
  const [since, setSince] = useState(initial.seenAt);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [settings, setSettings] = useState(false);
  const busy = useRef(0);
  const field = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef("");
  textRef.current = text;
  // dyktowanie: kilka znaków naraz w jednym zdarzeniu (pisanie palcem to po jednym znaku)
  const [dictating, setDictating] = useState(0);
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);

  const refresh = useCallback(async (markSeen: boolean) => {
    // nie nadpisujemy ekranu w trakcie własnych zapisów
    if (busy.current) return;
    try {
      const r = await fetch(`/api/lista/items${markSeen ? "?seen=1" : ""}`, { cache: "no-store" });
      if (r.status === 401) return location.replace("/lista/logowanie");
      const data = (await r.json()) as ListState & { ok: boolean };
      if (!data.ok || busy.current) return;
      setState(data);
      setOffline(false);
      return data;
    } catch {
      setOffline(true);
    }
  }, []);

  const clearBadge = useCallback(async () => {
    (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {});
    const reg = await navigator.serviceWorker?.getRegistration("/lista");
    (await reg?.getNotifications())?.forEach((n) => n.close());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CACHE, JSON.stringify(state));
    } catch {}
  }, [state]);

  useEffect(() => {
    clearBadge();
    // bez sieci pokazujemy ostatnią wersję listy zapamiętaną na telefonie
    refresh(false).then((ok) => {
      if (ok) return;
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE) || "null") as ListState | null;
        if (cached?.open) setState(cached);
      } catch {}
    });
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      const before = await refresh(true);
      if (before) setSince(before.seenAt);
      clearBadge();
    };
    const tick = setInterval(() => document.visibilityState === "visible" && refresh(true), POLL_MS);
    const onMessage = (e: MessageEvent) => e.data === "lista-refresh" && document.visibilityState === "visible" && refresh(true).then(clearBadge);
    document.addEventListener("visibilitychange", onVisible);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    window.addEventListener("online", onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
      window.removeEventListener("online", onVisible);
    };
  }, [refresh, clearBadge]);

  async function call(url: string, method: string, body?: unknown) {
    busy.current++;
    setError("");
    try {
      const r = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      if (r.status === 401) location.replace("/lista/logowanie");
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Nie udało się zapisać.");
      setOffline(false);
      return data;
    } catch (e) {
      setError(e instanceof TypeError ? "Brak internetu, zmiana się nie zapisała." : (e as Error).message);
      return null;
    } finally {
      busy.current--;
      if (!busy.current) refresh(false);
    }
  }

  function stopDictation() {
    clearTimeout(idle.current);
    setDictating(0);
  }

  function onComposerInput(e: React.FormEvent<HTMLTextAreaElement>) {
    grow(e);
    const ev = e.nativeEvent as InputEvent;
    const added = (ev.data ?? "").length;
    // pisanie palcem, kasowanie albo wklejenie wyłącza automatyczne dodawanie
    if (ev.inputType === "insertFromPaste" || ev.inputType?.startsWith("delete") || (ev.inputType === "insertText" && added <= 1 && !dictating)) {
      return stopDictation();
    }
    if (added > 1 || ev.inputType === "insertReplacementText" || dictating) {
      clearTimeout(idle.current);
      setDictating((n) => n + 1);
      idle.current = setTimeout(() => {
        setDictating(0);
        add();
      }, DICTATION_IDLE_MS);
    }
  }

  async function add(e?: React.SyntheticEvent) {
    e?.preventDefault();
    stopDictation();
    const t = textRef.current.trim();
    if (!t) return;
    const temp: Item = { id: -Date.now(), text: t, author: state.me, createdAt: new Date().toISOString(), doneAt: null, doneBy: null };
    setState((s) => ({ ...s, open: [temp, ...s.open] }));
    setText("");
    field.current?.style.removeProperty("height");
    const r = await call("/api/lista/items", "POST", { text: t });
    if (!r) {
      setState((s) => ({ ...s, open: s.open.filter((i) => i.id !== temp.id) }));
      setText(t);
    }
  }

  function toggle(item: Item) {
    const done = !item.doneAt;
    const moved: Item = { ...item, doneAt: done ? new Date().toISOString() : null, doneBy: done ? state.me : null };
    setState((s) => ({
      ...s,
      open: done ? s.open.filter((i) => i.id !== item.id) : [moved, ...s.open].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      done: done ? [moved, ...s.done] : s.done.filter((i) => i.id !== item.id),
    }));
    call(`/api/lista/items/${item.id}`, "PATCH", { done });
  }

  function edit(item: Item, t: string) {
    const map = (l: Item[]) => l.map((i) => (i.id === item.id ? { ...i, text: t } : i));
    setState((s) => ({ ...s, open: map(s.open), done: map(s.done) }));
    call(`/api/lista/items/${item.id}`, "PATCH", { text: t });
  }

  function remove(item: Item) {
    setState((s) => ({ ...s, open: s.open.filter((i) => i.id !== item.id), done: s.done.filter((i) => i.id !== item.id) }));
    call(`/api/lista/items/${item.id}`, "DELETE");
  }

  function clearDone() {
    if (!confirm("Usunąć wszystkie zrobione?")) return;
    setState((s) => ({ ...s, done: [] }));
    call("/api/lista/done", "DELETE");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-20 isolate overflow-hidden bg-plum-900 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-pearl">
        {/* złota panorama Łodzi nocą w tle nagłówka, jak w hero strony */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero/panorama.webp" alt="" aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-full w-full object-cover object-[78%_100%] opacity-45" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-plum-900/70 via-plum-900/20 to-plum-900/60" />
        <div className="flex items-center justify-between pb-10">
          <h1 className="font-display text-3xl font-semibold text-gold-500">
            lista<span className="text-pearl">.</span>
          </h1>
          <button type="button" onClick={() => setSettings(true)} className="rounded-full px-3 py-1.5 text-sm font-semibold text-pearl/70 hover:text-pearl" aria-label="Ustawienia">
            {state.me} ⚙︎
          </button>
        </div>
        <form onSubmit={add} className="mt-3 flex items-end gap-2">
          <textarea
            ref={field}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onInput={onComposerInput}
            onBlur={stopDictation}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) add(e);
            }}
            rows={1}
            maxLength={1000}
            placeholder="Co jest do zrobienia?"
            enterKeyHint="send"
            className="max-h-40 min-h-12 flex-1 resize-none rounded-2xl bg-pearl px-4 py-3 text-base text-graphite outline-none placeholder:text-graphite/40"
          />
          <button type="submit" disabled={!text.trim()} aria-label="Dodaj" className="grid size-12 shrink-0 place-items-center rounded-full bg-gold-500 text-2xl font-semibold text-plum-950 transition disabled:bg-pearl/15 disabled:text-pearl/40">
            +
          </button>
        </form>
        {dictating > 0 && (
          // pasek odliczania: wpis doda się sam, gdy dyktowanie ucichnie na 2 s
          <div className="mt-2 flex items-center gap-2 text-xs text-pearl/70">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-pearl/15">
              <span key={dictating} className="dictation-bar block h-full rounded-full bg-gold-500" style={{ animationDuration: `${DICTATION_IDLE_MS}ms` }} />
            </span>
            Dodam samo
          </div>
        )}
      </header>

      {(error || offline) && (
        <p role="alert" className="mx-4 mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-800">
          {error || "Brak połączenia. Widzisz ostatnią zapisaną wersję listy."}
        </p>
      )}

      <main className="flex-1 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3">
        {state.open.length === 0 ? (
          <p className="py-16 text-center text-graphite/45">Wszystko zrobione. Dodaj coś u góry.</p>
        ) : (
          <ul className="divide-y divide-graphite/10">
            {state.open.map((i) => (
              <Row key={i.id} item={i} fresh={i.author.toLowerCase() !== state.me.toLowerCase() && i.createdAt > since} onToggle={toggle} onEdit={edit} onRemove={remove} />
            ))}
          </ul>
        )}

        {state.done.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setShowDone((v) => !v)} className="py-2 text-sm font-semibold text-graphite/55">
                {showDone ? "▾" : "▸"} Zrobione ({state.done.length})
              </button>
              {showDone && (
                <button type="button" onClick={clearDone} className="py-2 text-sm font-semibold text-red-800/80">
                  Wyczyść
                </button>
              )}
            </div>
            {showDone && (
              <ul className="divide-y divide-graphite/10 opacity-60">
                {state.done.map((i) => (
                  <Row key={i.id} item={i} fresh={false} onToggle={toggle} onEdit={edit} onRemove={remove} />
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      {settings && <Settings me={state.me} onClose={() => setSettings(false)} />}
    </div>
  );
}

function Row({ item, fresh, onToggle, onEdit, onRemove }: { item: Item; fresh: boolean; onToggle: (i: Item) => void; onEdit: (i: Item, t: string) => void; onRemove: (i: Item) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const done = Boolean(item.doneAt);
  const pending = item.id < 0;

  function save() {
    setEditing(false);
    const t = draft.trim();
    if (t && t !== item.text) onEdit(item, t);
    else setDraft(item.text);
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => onToggle(item)}
        aria-label={done ? "Przywróć" : "Zrobione"}
        className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 text-sm font-bold transition ${done ? "border-plum-700 bg-plum-700 text-pearl" : "border-graphite/30 text-transparent hover:border-plum-700"}`}
      >
        ✓
      </button>
      <div className="min-w-0 flex-1">
        {editing ? (
          <>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onInput={grow}
              onFocus={grow}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  save();
                }
                if (e.key === "Escape") {
                  setDraft(item.text);
                  setEditing(false);
                }
              }}
              maxLength={1000}
              className="w-full resize-none rounded-xl border border-plum-700/40 bg-white px-3 py-2 text-base outline-none"
            />
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => confirm("Usunąć ten wpis?") && onRemove(item)} className="mt-1 text-sm font-semibold text-red-800">
              Usuń wpis
            </button>
          </>
        ) : (
          <button type="button" disabled={pending} onClick={() => setEditing(true)} className={`block w-full whitespace-pre-wrap break-words text-left text-[17px] leading-snug ${done ? "line-through" : ""}`}>
            {fresh && <span className="mr-2 inline-block size-2 -translate-y-0.5 rounded-full bg-gold-500" aria-label="nowe" />}
            {item.text}
          </button>
        )}
        <p className="mt-1 text-xs text-graphite/45" suppressHydrationWarning>
          {pending ? "Zapisuję…" : done ? `${item.doneBy} odhacza · ${ago(item.doneAt!)}` : `${item.author} · ${ago(item.createdAt)}`}
        </p>
      </div>
    </li>
  );
}

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "przed chwilą";
  if (s < 3600) return `${Math.floor(s / 60)} min temu`;
  if (s < 86400) return `${Math.floor(s / 3600)} godz. temu`;
  const d = new Date(iso);
  const days = Math.floor(s / 86400);
  if (days === 1) return "wczoraj";
  if (days < 7) return `${days} dni temu`;
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

// pole tekstowe rośnie razem z treścią (Safari nie zna jeszcze field-sizing)
function grow(e: React.SyntheticEvent<HTMLTextAreaElement>) {
  const t = e.currentTarget;
  t.style.height = "auto";
  t.style.height = `${t.scrollHeight}px`;
}
