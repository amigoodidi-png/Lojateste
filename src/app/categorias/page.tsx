import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EstadoVazio } from "@/componentes/Secao";
import { listarCategorias } from "@/lib/catalogo";

export const metadata: Metadata = { title: "Categorias", description: "Navegue pelos achados por categoria.", alternates: { canonical: "/categorias" } };

export default function Categorias() {
  return (
    <div className="container-site flex flex-col gap-6 py-8">
      <h1 className="font-display text-2xl font-extrabold">Categorias</h1>
      <Suspense fallback={null}><Lista /></Suspense>
    </div>
  );
}

async function Lista() {
  const todas = await listarCategorias();
  const principais = todas.filter((c) => !c.paiId);
  if (!principais.length) return <EstadoVazio titulo="Nenhuma categoria cadastrada ainda" />;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {principais.map((c) => {
        const subs = todas.filter((s) => s.paiId === c.id);
        return (
          <li key={c.id} className="rounded-cartao border border-linha bg-superficie p-5">
            <Link href={`/categoria/${c.slug}`} className="font-display text-lg font-bold hover:text-azul">{c.nome}</Link>
            <p className="text-sm text-tinta-suave">{c.total} {c.total === 1 ? "produto" : "produtos"}</p>
            {subs.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {subs.map((s) => <li key={s.id}><Link href={`/categoria/${s.slug}`} className="rounded-full bg-fundo px-3 py-1 text-sm hover:text-azul">{s.nome}</Link></li>)}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
