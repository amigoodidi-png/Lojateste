import type { Metadata } from "next";
import { Suspense } from "react";
import { CarregandoLista, ListaFiltrada } from "@/componentes/ListaFiltrada";

export const metadata: Metadata = { title: "Produtos em destaque", description: "Os achados escolhidos pela equipe do Olha o Achado.", alternates: { canonical: "/destaques" } };

export default function Destaques({ searchParams }: PageProps<"/destaques">) {
  return (
    <div className="container-site flex flex-col gap-5 py-8">
      <h1 className="font-display text-2xl font-extrabold">Produtos em destaque</h1>
      <Suspense fallback={<CarregandoLista />}>
        <ListaFiltrada acao="/destaques" searchParams={searchParams} fixos={{ somenteDestaques: true }} vazio={{ titulo: "Nenhum destaque escolhido ainda", texto: "Os produtos marcados como destaque no painel aparecem aqui." }} />
      </Suspense>
    </div>
  );
}
