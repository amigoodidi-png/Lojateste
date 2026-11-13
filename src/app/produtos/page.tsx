import type { Metadata } from "next";
import { Suspense } from "react";
import { CarregandoLista, ListaFiltrada } from "@/componentes/ListaFiltrada";

export const metadata: Metadata = { title: "Todos os produtos", description: "Todos os achados do Olha o Achado, com filtros por preço, categoria e loja.", alternates: { canonical: "/produtos" } };

export default function Produtos({ searchParams }: PageProps<"/produtos">) {
  return (
    <div className="container-site flex flex-col gap-5 py-8">
      <h1 className="font-display text-2xl font-extrabold">Todos os produtos</h1>
      <Suspense fallback={<CarregandoLista />}>
        <ListaFiltrada acao="/produtos" searchParams={searchParams} vazio={{ titulo: "Ainda não há produtos publicados", texto: "Os achados aparecem aqui assim que forem cadastrados no painel." }} />
      </Suspense>
    </div>
  );
}
