"use client";
import { useState } from "react";

export function Compartilhar({ titulo, url }: { titulo: string; url: string }) {
  const [copiado, setCopiado] = useState(false);
  const texto = encodeURIComponent(`Olha o achado! ${titulo} ${url}`);
  const copiar = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: titulo, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* o visitante cancelou */ }
  };
  const btn = "inline-flex items-center gap-2 rounded-md border border-linha bg-superficie px-3 py-2 text-sm font-semibold hover:bg-fundo";
  return (
    <div className="flex flex-wrap gap-2">
      <a className={btn} href={`https://wa.me/?text=${texto}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a className={btn} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
      <a className={btn} href={`https://x.com/intent/post?text=${texto}`} target="_blank" rel="noopener noreferrer">X</a>
      <button type="button" className={btn} onClick={copiar}>{copiado ? "Link copiado" : "Copiar link"}</button>
    </div>
  );
}
