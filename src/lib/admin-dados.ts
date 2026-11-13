import "server-only";
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";

const { produtos, plataformas, categorias, produtoImagens, cliques, logAtividades, usuarios } = schema;

export type FiltroAdmin = { busca?: string; status?: string; plataforma?: string; pagina?: number };
export const STATUS_PRODUTO = ["rascunho", "ativo", "inativo", "indisponivel", "revisar_preco"] as const;
export const ROTULO_STATUS: Record<(typeof STATUS_PRODUTO)[number], string> = {
  rascunho: "Rascunho", ativo: "Ativo", inativo: "Inativo", indisponivel: "Indisponível", revisar_preco: "Revisar preço",
};

export async function listarProdutosAdmin(f: FiltroAdmin) {
  if (!db) return { itens: [], total: 0 };
  const porPagina = 30;
  const pagina = Math.max(1, f.pagina ?? 1);
  const conds: (SQL | undefined)[] = [];
  if (f.busca) conds.push(or(ilike(produtos.nome, `%${f.busca}%`), ilike(produtos.idNaPlataforma, `%${f.busca}%`)));
  if (f.status && (STATUS_PRODUTO as readonly string[]).includes(f.status)) conds.push(eq(produtos.status, f.status as (typeof STATUS_PRODUTO)[number]));
  if (f.plataforma) conds.push(eq(plataformas.slug, f.plataforma));
  const where = conds.length ? and(...conds) : undefined;
  const imagem = sql<string | null>`(select ${produtoImagens.url} from ${produtoImagens} where ${produtoImagens.produtoId} = ${produtos.id} order by ${produtoImagens.principal} desc, ${produtoImagens.ordem} limit 1)`;
  const [itens, [{ total }]] = await Promise.all([
    db.select({
      id: produtos.id, slug: produtos.slug, nome: produtos.nome, status: produtos.status, destaque: produtos.destaque,
      precoAtual: produtos.precoAtual, precoVerificadoEm: produtos.precoVerificadoEm, atualizadoEm: produtos.atualizadoEm,
      plataforma: plataformas.nome, categoria: categorias.nome, imagem,
      temLink: sql<boolean>`${produtos.linkAfiliado} is not null`,
    })
      .from(produtos)
      .innerJoin(plataformas, eq(plataformas.id, produtos.plataformaId))
      .leftJoin(categorias, eq(categorias.id, produtos.categoriaId))
      .where(where)
      .orderBy(desc(produtos.atualizadoEm))
      .limit(porPagina).offset((pagina - 1) * porPagina),
    db.select({ total: count() }).from(produtos).innerJoin(plataformas, eq(plataformas.id, produtos.plataformaId)).where(where),
  ]);
  return { itens, total, porPagina, pagina };
}

export async function obterProdutoAdmin(id: number) {
  if (!db) return null;
  const [p] = await db.select().from(produtos).where(eq(produtos.id, id)).limit(1);
  if (!p) return null;
  const imagens = await db.select().from(produtoImagens).where(eq(produtoImagens.produtoId, id))
    .orderBy(desc(produtoImagens.principal), asc(produtoImagens.ordem));
  return { ...p, imagens };
}

export async function opcoesFormulario() {
  if (!db) return { plataformas: [], categorias: [] };
  const [ps, cs] = await Promise.all([
    db.select({ id: plataformas.id, nome: plataformas.nome }).from(plataformas).orderBy(asc(plataformas.nome)),
    db.select({ id: categorias.id, nome: categorias.nome, paiId: categorias.paiId }).from(categorias).orderBy(asc(categorias.ordem), asc(categorias.nome)),
  ]);
  return { plataformas: ps, categorias: cs };
}

export async function listarCategoriasAdmin() {
  if (!db) return [];
  const total = sql<number>`(select count(*)::int from ${produtos} where ${produtos.categoriaId} = ${categorias.id} or ${produtos.subcategoriaId} = ${categorias.id})`;
  return db.select({ id: categorias.id, slug: categorias.slug, nome: categorias.nome, descricao: categorias.descricao, paiId: categorias.paiId, ordem: categorias.ordem, ativa: categorias.ativa, total })
    .from(categorias).orderBy(asc(categorias.ordem), asc(categorias.nome));
}

export async function resumoPainel() {
  if (!db) return null;
  const q = (cond?: SQL) => db!.select({ n: count() }).from(produtos).where(cond).then((r) => r[0].n);
  const [total, ativos, inativos, revisar, cliquesHoje, cliquesMes, atividades] = await Promise.all([
    q(),
    q(eq(produtos.status, "ativo")),
    q(sql`${produtos.status} in ('inativo', 'indisponivel', 'rascunho')`),
    q(eq(produtos.status, "revisar_preco")),
    db.select({ n: count() }).from(cliques).where(sql`${cliques.ocorridoEm} >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'`).then((r) => r[0].n),
    db.select({ n: count() }).from(cliques).where(sql`${cliques.ocorridoEm} >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'`).then((r) => r[0].n),
    db.select({ acao: logAtividades.acao, entidade: logAtividades.entidade, detalhes: logAtividades.detalhes, ocorridoEm: logAtividades.ocorridoEm, nome: usuarios.nome })
      .from(logAtividades).leftJoin(usuarios, eq(usuarios.id, logAtividades.usuarioId))
      .orderBy(desc(logAtividades.ocorridoEm)).limit(10),
  ]);
  return { total, ativos, inativos, revisar, cliquesHoje, cliquesMes, atividades };
}
