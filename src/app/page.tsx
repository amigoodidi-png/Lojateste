import Link from "next/link";
import { Suspense } from "react";
import { GradeProdutos } from "@/componentes/CartaoProduto";
import { EstadoVazio, Secao } from "@/componentes/Secao";
import { bannersAtivos, listarCategorias, listarPlataformas, listarProdutos } from "@/lib/catalogo";

export default function Inicio() {
  return (
    <div className="container-site flex flex-col gap-12 py-6">
      <Suspense fallback={<BannerPadrao />}><Banner /></Suspense>
      <Suspense fallback={null}><Vitrines /></Suspense>
    </div>
  );
}

async function Banner() {
  const [b] = await bannersAtivos();
  if (!b) return <BannerPadrao />;
  return (
    <Link href={b.link ?? "/ofertas"} className="relative block overflow-hidden rounded-cartao bg-azul text-white">
      {b.imagemDesktop ? (
        <picture>
          {b.imagemCelular ? <source media="(max-width: 640px)" srcSet={b.imagemCelular} /> : null}
          { }
          <img src={b.imagemDesktop} alt={b.titulo} className="h-48 w-full object-cover sm:h-72" />
        </picture>
      ) : (
        <div className="px-6 py-10 sm:px-10">
          <p className="font-display text-2xl font-extrabold sm:text-4xl">{b.titulo}</p>
          {b.subtitulo ? <p className="mt-2 text-white/85">{b.subtitulo}</p> : null}
        </div>
      )}
    </Link>
  );
}

function BannerPadrao() {
  return (
    <section className="relative overflow-hidden rounded-cartao bg-azul px-6 py-10 text-white sm:px-10 sm:py-14">
      <div className="relative z-10 max-w-xl">
        <p className="text-xs font-bold tracking-widest text-white/75 uppercase">Shopee · Mercado Livre · Temu</p>
        <h1 className="mt-3 font-display text-3xl leading-tight font-extrabold sm:text-5xl">Olha o achado!</h1>
        <p className="mt-3 text-base text-white/85 sm:text-lg">Os melhores achados das lojas que você já conhece, num lugar só, com o preço conferido.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/ofertas" className="rounded-md bg-rosa px-5 py-3 text-sm font-bold text-white hover:bg-rosa-escuro">Ver ofertas do dia</Link>
          <Link href="/categorias" className="rounded-md bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20">Explorar categorias</Link>
        </div>
      </div>
      <svg viewBox="0 0 48 48" aria-hidden="true" className="pointer-events-none absolute -right-10 -bottom-16 w-72 opacity-20 sm:w-96">
        <path d="M3 24c5-9 12.5-14 21-14s16 5 21 14c-5 9-12.5 14-21 14S8 33 3 24Z" fill="#fff" />
        <circle cx="24" cy="24" r="8" fill="#2E3CF0" /><circle cx="26.5" cy="21.5" r="3.4" fill="#FF4F8B" />
      </svg>
    </section>
  );
}

async function Vitrines() {
  const [ofertas, destaques, recentes, categorias, plataformas] = await Promise.all([
    listarProdutos({ somenteOfertas: true, porPagina: 10 }),
    listarProdutos({ somenteDestaques: true, porPagina: 10 }),
    listarProdutos({ ordem: "novidades", porPagina: 10 }),
    listarCategorias(),
    listarPlataformas(),
  ]);
  const porPlataforma = await Promise.all(
    plataformas.map(async (p) => ({ p, itens: (await listarProdutos({ plataforma: p.slug, porPagina: 5 })).itens })),
  );
  const populares = categorias.filter((c) => !c.paiId && c.total > 0).sort((a, b) => b.total - a.total).slice(0, 8);

  if (recentes.total === 0) {
    return (
      <EstadoVazio titulo="Ainda não há produtos publicados">
        Assim que os primeiros achados forem cadastrados no painel, eles aparecem aqui.
      </EstadoVazio>
    );
  }

  return (
    <>
      {ofertas.itens.length ? (
        <Secao id="ofertas" titulo="Ofertas em destaque" href="/ofertas"><GradeProdutos itens={ofertas.itens} /></Secao>
      ) : null}
      {destaques.itens.length ? (
        <Secao id="recomendados" titulo="Recomendados para você" href="/destaques"><GradeProdutos itens={destaques.itens} /></Secao>
      ) : null}
      {populares.length ? (
        <Secao id="categorias" titulo="Categorias populares" href="/categorias">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {populares.map((c) => (
              <li key={c.id}>
                <Link href={`/categoria/${c.slug}`} className="flex h-full flex-col rounded-cartao border border-linha bg-superficie p-4 hover:border-azul">
                  <span className="font-display font-bold">{c.nome}</span>
                  <span className="text-sm text-tinta-suave">{c.total} {c.total === 1 ? "produto" : "produtos"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Secao>
      ) : null}
      <Secao id="recentes" titulo="Chegaram agora" href="/produtos?ordem=novidades"><GradeProdutos itens={recentes.itens} /></Secao>
      {ofertas.itens.length ? (
        <section className="flex flex-col items-start gap-3 rounded-cartao bg-rosa px-6 py-8 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <h2 className="font-display text-xl font-extrabold sm:text-2xl">Promoções com desconto conferido</h2>
            <p className="mt-1 text-white/90">Só mostramos desconto quando o preço foi conferido nas últimas 48 horas.</p>
          </div>
          <Link href="/ofertas" className="rounded-md bg-white px-5 py-3 text-sm font-bold text-rosa-escuro">Ver todas as promoções</Link>
        </section>
      ) : null}
      {porPlataforma.filter((x) => x.itens.length).map(({ p, itens }) => (
        <Secao key={p.slug} id={`loja-${p.slug}`} titulo={`Achados na ${p.nome}`} href={`/produtos?plataforma=${p.slug}`}>
          <GradeProdutos itens={itens} />
        </Secao>
      ))}
    </>
  );
}
