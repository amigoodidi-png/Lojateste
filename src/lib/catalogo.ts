import { and, asc, count, desc, eq, gt, gte, ilike, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "@/db";
import { VALIDADE_PRECO_HORAS, descontoConfirmado } from "./precos";

const { produtos, categorias, plataformas, produtoImagens, cliques, banners } = schema;

export type ProdutoResumo = {
  id: number;
  slug: string;
  nome: string;
  precoAtual: string | null;
  precoAnterior: string | null;
  precoVerificadoEm: Date | null;
  destaque: boolean;
  criadoEm: Date;
  imagem: string | null;
  /** Percentual de desconto confirmado (calculado dentro do cache), ou null. */
  desconto: number | null;
  plataforma: { slug: string; nome: string };
  categoria: { slug: string; nome: string } | null;
};

export type Ordem = "relevancia" | "menor-preco" | "maior-preco" | "novidades" | "populares";

export type Filtros = {
  busca?: string;
  categoria?: string;
  plataforma?: string;
  precoMin?: number;
  precoMax?: number;
  ordem?: Ordem;
  somenteOfertas?: boolean;
  somenteDestaques?: boolean;
  pagina?: number;
  porPagina?: number;
};

/** Condição SQL de "desconto confirmado": preço anterior maior, preço conferido há pouco e oferta dentro da validade. */
export const condicaoOfertaConfirmada = and(
  gt(produtos.precoAnterior, produtos.precoAtual),
  gte(produtos.precoVerificadoEm, sql`now() - make_interval(hours => ${VALIDADE_PRECO_HORAS})`),
  or(isNull(produtos.ofertaValidaAte), gt(produtos.ofertaValidaAte, sql`now()`)),
);

const imagemPrincipal = sql<string | null>`(
  select ${produtoImagens.url} from ${produtoImagens}
  where ${produtoImagens.produtoId} = ${produtos.id}
  order by ${produtoImagens.principal} desc, ${produtoImagens.ordem} asc limit 1)`;

const cliques30d = sql<number>`(
  select count(*)::int from ${cliques}
  where ${cliques.produtoId} = ${produtos.id} and ${cliques.ocorridoEm} > now() - interval '30 days')`;

function selecaoResumo() {
  return {
    id: produtos.id,
    slug: produtos.slug,
    nome: produtos.nome,
    precoAtual: produtos.precoAtual,
    precoAnterior: produtos.precoAnterior,
    precoVerificadoEm: produtos.precoVerificadoEm,
    destaque: produtos.destaque,
    criadoEm: produtos.criadoEm,
    imagem: imagemPrincipal,
    plataformaSlug: plataformas.slug,
    plataformaNome: plataformas.nome,
    categoriaSlug: categorias.slug,
    categoriaNome: categorias.nome,
  };
}

type Linha = {
  id: number; slug: string; nome: string; precoAtual: string | null; precoAnterior: string | null;
  precoVerificadoEm: Date | null; destaque: boolean; criadoEm: Date; imagem: string | null;
  plataformaSlug: string; plataformaNome: string; categoriaSlug: string | null; categoriaNome: string | null;
};

function paraResumo(l: Linha): ProdutoResumo {
  return {
    id: l.id, slug: l.slug, nome: l.nome, precoAtual: l.precoAtual, precoAnterior: l.precoAnterior,
    precoVerificadoEm: l.precoVerificadoEm, destaque: l.destaque, criadoEm: l.criadoEm, imagem: l.imagem,
    desconto: descontoConfirmado(l),
    plataforma: { slug: l.plataformaSlug, nome: l.plataformaNome },
    categoria: l.categoriaSlug ? { slug: l.categoriaSlug, nome: l.categoriaNome ?? l.categoriaSlug } : null,
  };
}

export async function listarProdutos(f: Filtros = {}): Promise<{ itens: ProdutoResumo[]; total: number }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("produtos");
  if (!db) return { itens: [], total: 0 };

  const porPagina = Math.min(f.porPagina ?? 24, 60);
  const pagina = Math.max(f.pagina ?? 1, 1);
  const conds: (SQL | undefined)[] = [eq(produtos.status, "ativo")];
  if (f.busca) {
    const termo = `%${f.busca.trim()}%`;
    conds.push(or(ilike(produtos.nome, termo), ilike(produtos.descricao, termo)));
  }
  if (f.categoria) {
    const idCategoria = sql`(select ${categorias.id} from ${categorias} where ${categorias.slug} = ${f.categoria})`;
    conds.push(or(eq(produtos.categoriaId, idCategoria), eq(produtos.subcategoriaId, idCategoria)));
  }
  if (f.plataforma) conds.push(eq(plataformas.slug, f.plataforma));
  if (f.precoMin != null) conds.push(gte(produtos.precoAtual, String(f.precoMin)));
  if (f.precoMax != null) conds.push(lte(produtos.precoAtual, String(f.precoMax)));
  if (f.somenteOfertas) conds.push(condicaoOfertaConfirmada);
  if (f.somenteDestaques) conds.push(eq(produtos.destaque, true));
  const where = and(...conds);

  const ordem =
    f.ordem === "menor-preco" ? [asc(produtos.precoAtual)]
    : f.ordem === "maior-preco" ? [desc(produtos.precoAtual)]
    : f.ordem === "novidades" ? [desc(produtos.criadoEm)]
    : f.ordem === "populares" ? [desc(cliques30d), desc(produtos.criadoEm)]
    : [desc(produtos.destaque), desc(produtos.atualizadoEm)];

  const base = db
    .select(selecaoResumo())
    .from(produtos)
    .innerJoin(plataformas, eq(plataformas.id, produtos.plataformaId))
    .leftJoin(categorias, eq(categorias.id, produtos.categoriaId));

  const [linhas, [{ total }]] = await Promise.all([
    base.where(where).orderBy(...ordem).limit(porPagina).offset((pagina - 1) * porPagina),
    db.select({ total: count() }).from(produtos)
      .innerJoin(plataformas, eq(plataformas.id, produtos.plataformaId))
      .leftJoin(categorias, eq(categorias.id, produtos.categoriaId))
      .where(where),
  ]);
  return { itens: linhas.map(paraResumo), total };
}

export async function obterProduto(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("produtos", `produto-${slug}`);
  if (!db) return null;
  const sub = alias(categorias, "subcategoria");
  const [p] = await db
    .select({
      ...selecaoResumo(),
      descricao: produtos.descricao,
      status: produtos.status,
      ofertaValidaAte: produtos.ofertaValidaAte,
      atualizadoEm: produtos.atualizadoEm,
      subcategoriaNome: sub.nome,
      subcategoriaSlug: sub.slug,
    })
    .from(produtos)
    .innerJoin(plataformas, eq(plataformas.id, produtos.plataformaId))
    .leftJoin(categorias, eq(categorias.id, produtos.categoriaId))
    .leftJoin(sub, eq(sub.id, produtos.subcategoriaId))
    .where(and(eq(produtos.slug, slug), eq(produtos.status, "ativo")))
    .limit(1);
  if (!p) return null;
  const galeria = await db
    .select({ url: produtoImagens.url, alt: produtoImagens.textoAlternativo })
    .from(produtoImagens)
    .where(eq(produtoImagens.produtoId, p.id))
    .orderBy(desc(produtoImagens.principal), asc(produtoImagens.ordem));
  return {
    ...paraResumo(p),
    descricao: p.descricao,
    ofertaValidaAte: p.ofertaValidaAte,
    atualizadoEm: p.atualizadoEm,
    subcategoria: p.subcategoriaSlug ? { slug: p.subcategoriaSlug, nome: p.subcategoriaNome ?? "" } : null,
    galeria,
  };
}

export type CategoriaComTotal = { id: number; slug: string; nome: string; descricao: string | null; paiId: number | null; total: number };

export async function listarCategorias(): Promise<CategoriaComTotal[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("categorias", "produtos");
  if (!db) return [];
  const total = sql<number>`(
    select count(*)::int from ${produtos}
    where (${produtos.categoriaId} = ${categorias.id} or ${produtos.subcategoriaId} = ${categorias.id})
      and ${produtos.status} = 'ativo')`;
  return db
    .select({ id: categorias.id, slug: categorias.slug, nome: categorias.nome, descricao: categorias.descricao, paiId: categorias.paiId, total })
    .from(categorias)
    .where(eq(categorias.ativa, true))
    .orderBy(asc(categorias.ordem), asc(categorias.nome));
}

export async function listarPlataformas() {
  "use cache";
  cacheLife("hours");
  cacheTag("plataformas");
  if (!db) return [];
  return db
    .select({ id: plataformas.id, slug: plataformas.slug, nome: plataformas.nome, corDestaque: plataformas.corDestaque })
    .from(plataformas)
    .where(eq(plataformas.ativa, true))
    .orderBy(asc(plataformas.nome));
}

/** Produtos mais acessados nos últimos 30 dias, pelos cliques do próprio site. Não representa vendas. */
export async function maisAcessados(limite = 12): Promise<ProdutoResumo[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("produtos", "cliques");
  if (!db) return [];
  const linhas = await db
    .select(selecaoResumo())
    .from(produtos)
    .innerJoin(plataformas, eq(plataformas.id, produtos.plataformaId))
    .leftJoin(categorias, eq(categorias.id, produtos.categoriaId))
    .where(and(eq(produtos.status, "ativo"), gt(cliques30d, 0)))
    .orderBy(desc(cliques30d))
    .limit(limite);
  return linhas.map(paraResumo);
}

export async function bannersAtivos() {
  "use cache";
  cacheLife("minutes");
  cacheTag("banners");
  if (!db) return [];
  return db
    .select()
    .from(banners)
    .where(and(
      eq(banners.ativo, true),
      or(isNull(banners.iniciaEm), lte(banners.iniciaEm, sql`now()`)),
      or(isNull(banners.terminaEm), gt(banners.terminaEm, sql`now()`)),
    ))
    .orderBy(asc(banners.ordem))
    .limit(5);
}

export async function listarSlugsProdutos(): Promise<{ slug: string; atualizadoEm: Date }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("produtos");
  if (!db) return [];
  return db.select({ slug: produtos.slug, atualizadoEm: produtos.atualizadoEm }).from(produtos).where(eq(produtos.status, "ativo"));
}

export async function obterCategoria(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("categorias");
  if (!db) return null;
  const pai = alias(categorias, "pai");
  const [c] = await db
    .select({ id: categorias.id, slug: categorias.slug, nome: categorias.nome, descricao: categorias.descricao, paiNome: pai.nome, paiSlug: pai.slug })
    .from(categorias)
    .leftJoin(pai, eq(pai.id, categorias.paiId))
    .where(and(eq(categorias.slug, slug), eq(categorias.ativa, true)))
    .limit(1);
  return c ?? null;
}
