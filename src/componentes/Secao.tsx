import Link from "next/link";
import type { ReactNode } from "react";

export function Secao({ titulo, href, rotuloLink = "Ver todos", children, id }: {
  titulo: string; href?: string; rotuloLink?: string; children: ReactNode; id?: string;
}) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={id}>
      <div className="flex items-end justify-between gap-4">
        <h2 id={id} className="font-display text-lg font-bold sm:text-xl">{titulo}</h2>
        {href ? <Link href={href} className="shrink-0 text-sm font-semibold text-azul hover:underline">{rotuloLink} →</Link> : null}
      </div>
      {children}
    </section>
  );
}

export function EstadoVazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-cartao border border-dashed border-linha bg-superficie px-5 py-8 text-center">
      <p className="font-semibold">{titulo}</p>
      {children ? <div className="mt-1 text-sm text-tinta-suave">{children}</div> : null}
    </div>
  );
}
