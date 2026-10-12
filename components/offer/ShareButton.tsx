"use client";

import { useState } from "react";

// Udostępnianie: na telefonie systemowy arkusz, na komputerze kopiowanie linku.
export default function ShareButton({ title, className = "" }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const url = location.href.split("#")[0];
        if (navigator.share && matchMedia("(pointer: coarse)").matches) {
          try {
            await navigator.share({ title, url });
          } catch {}
          return;
        }
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {}
      }}
    >
      {copied ? "Link skopiowany" : "Udostępnij"}
    </button>
  );
}
