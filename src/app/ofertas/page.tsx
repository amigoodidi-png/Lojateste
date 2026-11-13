import type { Metadata } from "next";
import { Suspense } from "react";
import { CarregandoLista, ListaFiltrada } from "@/componentes/ListaFiltrada";
import { VALIDADE_PRECO_HORAS } from "@/lib/precos";

export const metadata: Metadata = { title: "Ofertas do dia", description: "Produtos com desconto conferido nas últimas horas.", alternates: { canonical: "/ofertas" } };

export default function Ofertas({ searchParams }: PageProps<"/ofertas">) {
  return (
    <div className="container-site flex flex-col gap-5 py-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Ofertas do dia</h1>
        <p className="mt-1 text-sm text-tinta-suave">Aqui só entram produtos cujo preço foi conferido nas últimas {VALIDADE_PRECO_HORAS} horas e está abaixo do preço anterior.</p>
      </div>
      <Suspense fallback={<CarregandoLista />}>
        <ListaFiltrada acao="/ofertas" searchParams={searchParams} fixos={{ somenteOfertas: true }} vazio={{ titulo: "Nenhuma oferta conferida no momento", texto: "Volte mais tarde: as ofertas são atualizadas ao longo do dia." }} />
      </Suspense>
    </div>
  );
}
