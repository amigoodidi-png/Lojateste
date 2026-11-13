"use client";
import { useState } from "react";

export function GaleriaProduto({ nome, imagens }: { nome: string; imagens: { url: string; alt: string | null }[] }) {
  const [atual, setAtual] = useState(0);
  if (!imagens.length) {
    return <div className="grid aspect-square place-items-center rounded-cartao border border-linha bg-superficie text-sm text-tinta-suave">Sem imagem</div>;
  }
  const img = imagens[Math.min(atual, imagens.length - 1)];
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="aspect-square overflow-hidden rounded-cartao border border-linha bg-superficie">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.alt ?? nome} className="h-full w-full object-contain p-4" />
      </div>
      {imagens.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {imagens.map((g, i) => (
            <button key={g.url} type="button" onClick={() => setAtual(i)} aria-label={`Ver imagem ${i + 1}`} aria-current={i === atual}
              className={`size-16 shrink-0 overflow-hidden rounded-md border-2 bg-superficie ${i === atual ? "border-azul" : "border-linha"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.url} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
