"use client";

import { useEffect, useRef, useState } from "react";
import { uploadPhoto } from "@/app/crm/(panel)/actions";

// Zdjęcia oferty: dodawanie (zmniejszane w przeglądarce do 2400 px, potem wysyłane po jednym),
// zmiana kolejności (przeciąganiem myszką, na telefonie po przytrzymaniu palca) i usuwanie. Pierwsze zdjęcie to okładka na stronie. Lista trafia do formularza
// w ukrytym polu „images”, więc zmiany zapisują się dopiero przyciskiem „Zapisz”.

async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.88));
  } catch {
    return file; // przeglądarka nie umie odczytać (np. HEIC): serwer spróbuje sam
  }
}

export default function PhotoManager({ initial, prefix }: { initial: string[]; prefix: string }) {
  const [images, setImages] = useState(initial);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const pick = useRef<HTMLInputElement>(null);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const list = [...files];
    for (let i = 0; i < list.length; i++) {
      setBusy(`Wysyłam ${i + 1} z ${list.length}…`);
      const blob = await shrink(list[i]);
      const fd = new FormData();
      fd.set("file", new File([blob], list[i].name.replace(/\.\w+$/, ".jpg"), { type: blob.type || list[i].type }));
      fd.set("prefix", prefix);
      const r = await uploadPhoto(fd).catch(() => ({ error: `${list[i].name}: błąd wysyłki.`, url: undefined }));
      if (r.url) setImages((x) => [...x, r.url!]);
      else {
        // brak magazynu dotyczy wszystkich plików: jeden komunikat i koniec wysyłki
        if (r.error?.includes("Brak magazynu")) {
          setError(r.error);
          break;
        }
        setError((e) => [e, r.error].filter(Boolean).join(" "));
      }
    }
    setBusy("");
    if (pick.current) pick.current.value = "";
  }

  const move = (i: number, by: number) =>
    setImages((x) => {
      const j = i + by;
      if (j < 0 || j >= x.length) return x;
      const y = [...x];
      [y[i], y[j]] = [y[j], y[i]];
      return y;
    });

  // Przeciąganie: mysz od razu po ruszeniu o kilka px, dotyk po przytrzymaniu ~300 ms
  // (żeby zwykłe przewijanie strony dalej działało). Kolejność zmienia się na żywo.
  const [dragging, setDragging] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const drag = useRef<{ src: string; id: number; x: number; y: number; active: boolean; timer?: ReturnType<typeof setTimeout> } | null>(null);

  useEffect(() => {
    // gdy przeciąganie palcem trwa, blokujemy przewijanie strony
    const el = grid.current;
    if (!el) return;
    const stop = (e: TouchEvent) => {
      if (drag.current?.active) e.preventDefault();
    };
    // puszczenie przycisku gdziekolwiek (także poza siatką) kończy przeciąganie
    const finish = () => {
      if (drag.current) clearTimeout(drag.current.timer);
      drag.current = null;
      setDragging(null);
    };
    el.addEventListener("touchmove", stop, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      el.removeEventListener("touchmove", stop);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, []);

  function start(e: React.PointerEvent, src: string) {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    const d = { src, id: e.pointerId, x: e.clientX, y: e.clientY, active: false } as NonNullable<typeof drag.current>;
    drag.current = d;
    if (e.pointerType === "mouse") e.preventDefault(); // bez zaznaczania tekstu w trakcie
    else {
      d.timer = setTimeout(() => {
        d.active = true;
        setDragging(src);
        navigator.vibrate?.(15);
      }, 300);
    }
  }

  function over(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.active) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
      if (e.pointerType !== "mouse") {
        // palec ruszył przed przytrzymaniem: to przewijanie, nie przeciąganie
        clearTimeout(d.timer);
        drag.current = null;
        return;
      }
      d.active = true;
      setDragging(d.src);
    }
    e.preventDefault();
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-photo]");
    const target = hit?.dataset.photo;
    if (!target || target === d.src) return;
    setImages((x) => {
      const from = x.indexOf(d.src);
      const to = x.indexOf(target);
      if (from < 0 || to < 0) return x;
      const y = [...x];
      y.splice(from, 1);
      y.splice(to, 0, d.src);
      return y;
    });
  }

  return (
    <div>
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <div
        ref={grid}
        onPointerMove={over}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      >
        {images.map((src, i) => (
          <figure
            key={src}
            data-photo={src}
            onPointerDown={(e) => start(e, src)}
            onContextMenu={(e) => drag.current && e.preventDefault()}
            className={`group relative aspect-[4/3] cursor-grab touch-manipulation overflow-hidden rounded-xl bg-mist select-none transition-[opacity,box-shadow,transform] ${
              dragging === src ? "z-10 scale-[1.03] cursor-grabbing opacity-70 shadow-xl ring-2 ring-plum-700" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" draggable={false} className="pointer-events-none h-full w-full object-cover [-webkit-touch-callout:none]" loading="lazy" />
            {i === 0 && <span className="absolute top-2 left-2 rounded-full bg-plum-900 px-2 py-0.5 text-[11px] font-bold text-pearl">okładka</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 p-2">
              <div className="flex gap-1">
                <button type="button" aria-label="Wcześniej" onClick={() => move(i, -1)} className="h-8 w-8 rounded-full bg-white/90 text-sm font-bold">←</button>
                <button type="button" aria-label="Później" onClick={() => move(i, 1)} className="h-8 w-8 rounded-full bg-white/90 text-sm font-bold">→</button>
                {i > 0 && (
                  <button type="button" onClick={() => setImages((x) => [src, ...x.filter((y) => y !== src)])} className="h-8 rounded-full bg-white/90 px-2.5 text-[11px] font-bold">
                    okładka
                  </button>
                )}
              </div>
              <button type="button" aria-label="Usuń zdjęcie" onClick={() => setImages((x) => x.filter((y) => y !== src))} className="h-8 w-8 rounded-full bg-white/90 text-sm font-bold text-red-800">
                ×
              </button>
            </div>
          </figure>
        ))}
        <button
          type="button"
          onClick={() => pick.current?.click()}
          disabled={Boolean(busy)}
          className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-graphite/20 text-sm font-semibold text-graphite/60 hover:border-plum-700 hover:text-plum-900"
        >
          <span className="text-2xl">+</span>
          {busy || "Dodaj zdjęcia"}
        </button>
      </div>
      <input ref={pick} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      {error && <p className="mt-3 text-sm font-semibold text-red-800">{error}</p>}
      <p className="mt-3 text-xs text-graphite/50">Zdjęcia zmniejszamy do 2400 px i usuwamy z nich dane GPS. Kolejność zmienisz, przeciągając zdjęcie (na telefonie przytrzymaj je palcem). Zmiany kolejności i usunięcia zapisują się przyciskiem „Zapisz”.</p>
    </div>
  );
}
