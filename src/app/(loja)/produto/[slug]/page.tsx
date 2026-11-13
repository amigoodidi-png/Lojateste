import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Compartilhar } from "@/componentes/Compartilhar";
import { GaleriaProduto } from "@/componentes/GaleriaProduto";
import { obterProduto } from "@/lib/catalogo";
import { formatarDataHora, formatarPreco } from "@/lib/precos";
import { SITE } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/produto/[slug]">): Promise<Metadata> {
  const p = await obterProduto((await params).slug);
  if (!p) return { title: "Produto não encontrado", robots: { index: false } };
  const descricao = (p.descricao ?? `${p.nome} na ${p.plataforma.nome}.`).slice(0, 155);
  return {
    title: p.nome,
    description: descricao,
    alternates: { canonical: `/produto/${p.slug}` },
    openGraph: { title: p.nome, description: descricao, images: p.imagem ? [{ url: p.imagem }] : undefined },
  };
}

export default function PaginaProduto(props: PageProps<"/produto/[slug]">) {
  return (
    <div className="container-site py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-cartao bg-superficie" />}><Conteudo {...props} /></Suspense>
    </div>
  );
}

async function Conteudo({ params }: PageProps<"/produto/[slug]">) {
  const p = await obterProduto((await params).slug);
  if (!p) notFound();
  const desconto = p.desconto;
  const url = `${SITE.url}/produto/${p.slug}`;
  const dados = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nome,
    description: p.descricao ?? undefined,
    image: p.galeria.map((g) => g.url),
    url,
    ...(p.precoAtual ? { offers: { "@type": "Offer", price: Number(p.precoAtual).toFixed(2), priceCurrency: "BRL", url, seller: { "@type": "Organization", name: p.plataforma.nome } } } : {}),
  };
  return (
    <article className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }} />
      <GaleriaProduto nome={p.nome} imagens={p.galeria} />
      <div className="flex min-w-0 flex-col gap-4">
        <nav aria-label="Caminho" className="text-sm text-tinta-suave">
          <Link href="/produtos" className="hover:underline">Produtos</Link>
          {p.categoria ? <> › <Link href={`/categoria/${p.categoria.slug}`} className="hover:underline">{p.categoria.nome}</Link></> : null}
          {p.subcategoria ? <> › <Link href={`/categoria/${p.subcategoria.slug}`} className="hover:underline">{p.subcategoria.nome}</Link></> : null}
        </nav>
        <span className="w-fit rounded-full bg-superficie px-3 py-1 text-xs font-bold tracking-wide text-tinta-suave uppercase ring-1 ring-linha">Vendido na {p.plataforma.nome}</span>
        <h1 className="font-display text-2xl leading-tight font-extrabold sm:text-3xl">{p.nome}</h1>
        <div className="rounded-cartao border border-linha bg-superficie p-5">
          {desconto ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-tinta-suave line-through">{formatarPreco(p.precoAnterior)}</span>
              <span className="rounded-full bg-rosa px-2 py-0.5 text-xs font-bold text-white">-{desconto}%</span>
            </div>
          ) : null}
          <p className="font-display text-3xl font-extrabold text-azul">{p.precoAtual ? formatarPreco(p.precoAtual) : "Preço na loja"}</p>
          <p className="mt-1 text-xs text-tinta-suave">
            {p.precoVerificadoEm ? <>Preço consultado em {formatarDataHora(p.precoVerificadoEm)}. </> : null}
            O valor pode mudar na {p.plataforma.nome}.
            {p.ofertaValidaAte ? <> Oferta válida até {formatarDataHora(p.ofertaValidaAte)}.</> : null}
          </p>
          <a href={`/ir/${p.id}`} target="_blank" rel="nofollow sponsored noopener" className="mt-4 flex w-full items-center justify-center rounded-md bg-rosa px-5 py-4 text-base font-extrabold tracking-wide text-white hover:bg-rosa-escuro">
            COMPRAR AGORA
          </a>
          <p className="mt-2 text-center text-xs text-tinta-suave">Abre a página do produto na {p.plataforma.nome} em uma nova aba.</p>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-bold">Compartilhar</h2>
          <Compartilhar titulo={p.nome} url={url} />
        </div>
        {p.descricao ? (
          <section>
            <h2 className="mb-2 font-display text-lg font-bold">Descrição</h2>
            <p className="leading-relaxed whitespace-pre-line text-tinta-suave">{p.descricao}</p>
          </section>
        ) : null}
        <p className="text-xs text-tinta-suave">
          Link de afiliado: podemos receber uma comissão se você comprar, sem custo extra. <Link href="/aviso-de-afiliados" className="underline">Saiba mais</Link>
        </p>
      </div>
    </article>
  );
}
