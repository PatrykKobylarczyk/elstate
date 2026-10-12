"use client";

import { useRef, useState } from "react";
import { uploadPhoto } from "@/app/crm/(panel)/actions";

// Zdjęcia oferty: dodawanie (zmniejszane w przeglądarce do 2400 px, potem wysyłane po jednym),
// zmiana kolejności i usuwanie. Pierwsze zdjęcie to okładka na stronie. Lista trafia do formularza
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

  return (
    <div>
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((src, i) => (
          <figure key={src} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-mist">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
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
      <p className="mt-3 text-xs text-graphite/50">Zdjęcia zmniejszamy do 2400 px i usuwamy z nich dane GPS. Zmiany kolejności i usunięcia zapisują się przyciskiem „Zapisz”.</p>
    </div>
  );
}
