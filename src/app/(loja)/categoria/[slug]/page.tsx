import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CarregandoLista, ListaFiltrada } from "@/componentes/ListaFiltrada";
import { obterCategoria } from "@/lib/catalogo";

export async function generateMetadata({ params }: PageProps<"/categoria/[slug]">): Promise<Metadata> {
  const c = await obterCategoria((await params).slug);
  if (!c) return { title: "Categoria não encontrada" };
  return { title: c.nome, description: c.descricao ?? `Achados de ${c.nome} com preço conferido.`, alternates: { canonical: `/categoria/${c.slug}` } };
}

export default function PaginaCategoria(props: PageProps<"/categoria/[slug]">) {
  return (
    <div className="container-site flex flex-col gap-5 py-8">
      <Suspense fallback={<CarregandoLista />}><Conteudo {...props} /></Suspense>
    </div>
  );
}

async function Conteudo({ params, searchParams }: PageProps<"/categoria/[slug]">) {
  const c = await obterCategoria((await params).slug);
  if (!c) notFound();
  return (
    <>
      <div>
        <nav aria-label="Caminho" className="text-sm text-tinta-suave">
          <Link href="/categorias" className="hover:underline">Categorias</Link>
          {c.paiSlug ? <> › <Link href={`/categoria/${c.paiSlug}`} className="hover:underline">{c.paiNome}</Link></> : null}
        </nav>
        <h1 className="mt-1 font-display text-2xl font-extrabold">{c.nome}</h1>
        {c.descricao ? <p className="mt-1 max-w-2xl text-sm text-tinta-suave">{c.descricao}</p> : null}
      </div>
      <ListaFiltrada acao={`/categoria/${c.slug}`} searchParams={searchParams} fixos={{ categoria: c.slug }} ocultar={["categoria"]}
        vazio={{ titulo: "Nenhum produto nesta categoria ainda", texto: "Veja outras categorias ou as ofertas do dia." }} />
    </>
  );
}
