import type { Metadata } from "next";
import { Suspense } from "react";
import { GradeProdutos } from "@/componentes/CartaoProduto";
import { CarregandoLista } from "@/componentes/ListaFiltrada";
import { EstadoVazio } from "@/componentes/Secao";
import { maisAcessados } from "@/lib/catalogo";

export const metadata: Metadata = { title: "Mais acessados", description: "Os produtos mais clicados no Olha o Achado nos últimos 30 dias.", alternates: { canonical: "/mais-acessados" } };

export default function MaisAcessados() {
  return (
    <div className="container-site flex flex-col gap-5 py-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Mais acessados</h1>
        <p className="mt-1 text-sm text-tinta-suave">Ranking pelos cliques feitos aqui no site nos últimos 30 dias. Não representa vendas nas lojas.</p>
      </div>
      <Suspense fallback={<CarregandoLista />}><Lista /></Suspense>
    </div>
  );
}

async function Lista() {
  const itens = await maisAcessados(30);
  return itens.length ? <GradeProdutos itens={itens} /> : (
    <EstadoVazio titulo="Ainda não há cliques suficientes">O ranking aparece quando houver acessos registrados.</EstadoVazio>
  );
}
