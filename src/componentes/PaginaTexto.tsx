import type { ReactNode } from "react";

export function PaginaTexto({ titulo, atualizadoEm, children }: { titulo: string; atualizadoEm?: string; children: ReactNode }) {
  return (
    <div className="container-site py-10">
      <article className="texto-legal mx-auto max-w-3xl rounded-cartao border border-linha bg-superficie p-6 sm:p-10">
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{titulo}</h1>
        {atualizadoEm ? <p className="mt-2 text-sm">Última atualização: {atualizadoEm}</p> : null}
        <div className="mt-6">{children}</div>
      </article>
    </div>
  );
}
