import "server-only";
// Prévia e gravação das importações. A prévia não mexe em produtos; só a confirmação grava.
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { gerarSlug } from "../texto";
import type { DadosProduto, LinhaLida, Referencias } from "./planilha";

const { produtos, produtoImagens, historicoPrecos, plataformas, categorias, importacoes, importacaoItens, usuarios } = schema;

function banco() {
  if (!db) throw new Error("Banco de dados não configurado (DATABASE_URL).");
  return db;
}

export async function referencias(): Promise<Referencias> {
  const b = banco();
  const [ps, cs] = await Promise.all([
    b.select({ id: plataformas.id, slug: plataformas.slug, nome: plataformas.nome }).from(plataformas).orderBy(asc(plataformas.nome)),
    b.select({ id: categorias.id, slug: categorias.slug, nome: categorias.nome, paiId: categorias.paiId }).from(categorias),
  ]);
  return { plataformas: ps, categorias: cs };
}

type Banco = NonNullable<typeof db>;
type Transacao = Parameters<Parameters<Banco["transaction"]>[0]>[0];

/** Procura um produto já cadastrado: pelo código na loja e, sem código, pelo link de afiliado. */
async function encontrarExistente(b: Banco | Transacao, d: DadosProduto) {
  if (d.idNaPlataforma) {
    const [p] = await b.select({ id: produtos.id }).from(produtos)
      .where(and(eq(produtos.plataformaId, d.plataformaId), eq(produtos.idNaPlataforma, d.idNaPlataforma))).limit(1);
    if (p) return p.id;
  }
  if (d.linkAfiliado) {
    // Só conta como o mesmo produto quando um único produto usa esse link (links genéricos não servem para comparar).
    const achados = await b.select({ id: produtos.id }).from(produtos)
      .where(and(eq(produtos.plataformaId, d.plataformaId), eq(produtos.linkAfiliado, d.linkAfiliado))).limit(2);
    if (achados.length === 1) return achados[0].id;
  }
  if (!d.idNaPlataforma && !d.linkAfiliado) {
    // Sem código nem link, o último recurso é o nome exato na mesma loja.
    const achados = await b.select({ id: produtos.id }).from(produtos)
      .where(and(eq(produtos.plataformaId, d.plataformaId), eq(produtos.nome, d.nome))).limit(2);
    if (achados.length === 1) return achados[0].id;
  }
  return null;
}

export type NovaImportacao = {
  tipo: "planilha" | "api";
  descricao: string;
  plataformaId: number | null;
  usuarioId: string;
  itens: LinhaLida[];
};

/** Classifica cada linha (novo, atualizar, ignorar, erro) e guarda a prévia. Devolve o número da importação. */
export async function montarPrevia(n: NovaImportacao): Promise<number> {
  const b = banco();
  const vistos = new Set<string>();
  const linhas: { linha: number; resultado: string; mensagem: string | null; produtoId: number | null; idNaPlataforma: string | null; dados: DadosProduto | null }[] = [];
  for (const item of n.itens) {
    if (!item.dados) {
      // Guarda só o nome, para a prévia mostrar qual produto deu erro.
      const soNome = item.nomeBruto ? ({ nome: item.nomeBruto } as unknown as DadosProduto) : null;
      linhas.push({ linha: item.linha, resultado: "erro", mensagem: item.erro ?? "Linha inválida.", produtoId: null, idNaPlataforma: null, dados: soNome });
      continue;
    }
    const d = item.dados;
    const chave = d.idNaPlataforma ? `${d.plataformaId}:c:${d.idNaPlataforma}` : d.linkAfiliado ? `${d.plataformaId}:l:${d.linkAfiliado}` : `${d.plataformaId}:n:${d.nome}`;
    if (vistos.has(chave)) {
      linhas.push({ linha: item.linha, resultado: "ignorar", mensagem: "Repetido nesta mesma planilha.", produtoId: null, idNaPlataforma: d.idNaPlataforma, dados: d });
      continue;
    }
    vistos.add(chave);
    const existente = await encontrarExistente(b, d);
    linhas.push({
      linha: item.linha,
      resultado: existente ? "atualizar" : "novo",
      mensagem: item.avisos.join(" ") || null,
      produtoId: existente,
      idNaPlataforma: d.idNaPlataforma,
      dados: d,
    });
  }
  return b.transaction(async (tx) => {
    const [imp] = await tx.insert(importacoes).values({
      tipo: n.tipo, descricao: n.descricao.slice(0, 300), plataformaId: n.plataformaId, usuarioId: n.usuarioId,
      status: "aguardando_confirmacao",
      totalErros: linhas.filter((l) => l.resultado === "erro").length,
    }).returning({ id: importacoes.id });
    for (let i = 0; i < linhas.length; i += 500) {
      await tx.insert(importacaoItens).values(linhas.slice(i, i + 500).map((l) => ({ ...l, importacaoId: imp.id, dados: l.dados as Record<string, unknown> | null })));
    }
    return imp.id;
  });
}

async function slugLivre(tx: Transacao, base: string): Promise<string> {
  const raiz = gerarSlug(base).slice(0, 74);
  const usados = new Set((await tx.select({ slug: produtos.slug }).from(produtos)
    .where(sql`${produtos.slug} = ${raiz} or ${produtos.slug} like ${raiz + "-%"}`)).map((r) => r.slug));
  if (!usados.has(raiz)) return raiz;
  for (let i = 2; ; i++) if (!usados.has(`${raiz}-${i}`)) return `${raiz}-${i}`;
}

export type OpcoesConfirmacao = {
  /** Status dos produtos novos quando a linha não diz qual. */
  statusNovos: "rascunho" | "ativo";
  /** Quem importou conferiu os preços nas lojas agora (a API conta sempre como conferido). */
  precoConferido: boolean;
  /** Itens marcados na prévia. */
  selecionados: Set<number>;
};

export type ResumoConfirmacao = { criados: number; atualizados: number; ignorados: number; erros: number; slugs: string[] };

/** Grava os itens marcados da prévia. Cada produto é gravado separadamente: um erro não desfaz os outros. */
export async function confirmarImportacao(id: number, o: OpcoesConfirmacao): Promise<ResumoConfirmacao> {
  const b = banco();
  const [imp] = await b.select().from(importacoes).where(eq(importacoes.id, id)).limit(1);
  if (!imp) throw new Error("Importação não encontrada.");
  // Trava contra clique duplo: só uma confirmação passa daqui.
  const [trava] = await b.update(importacoes).set({ status: "em_andamento" })
    .where(and(eq(importacoes.id, id), eq(importacoes.status, "aguardando_confirmacao"))).returning({ id: importacoes.id });
  if (!trava) throw new Error("Esta importação já foi confirmada ou cancelada.");

  const origem = imp.tipo === "api" ? "api" : "planilha";
  const conferido = imp.tipo === "api" || o.precoConferido;
  const itens = await b.select().from(importacaoItens).where(eq(importacaoItens.importacaoId, id)).orderBy(asc(importacaoItens.linha));
  const r: ResumoConfirmacao = { criados: 0, atualizados: 0, ignorados: 0, erros: 0, slugs: [] };

  for (const item of itens) {
    const fim = (resultado: string, mensagem: string | null, produtoId?: number | null) =>
      b.update(importacaoItens).set({ resultado, mensagem, ...(produtoId ? { produtoId } : {}) }).where(eq(importacaoItens.id, item.id));
    if (item.resultado === "erro") { r.erros++; continue; }
    if (item.resultado === "ignorar" || !o.selecionados.has(item.id) || !item.dados) {
      r.ignorados++;
      await fim("ignorado", item.resultado === "ignorar" ? item.mensagem : "Desmarcado na prévia.");
      continue;
    }
    const d = item.dados as unknown as DadosProduto;
    const avisos: string[] = item.mensagem ? [item.mensagem] : [];
    try {
      const salvo = await b.transaction(async (tx) => {
        const agora = new Date();
        const existenteId = await encontrarExistente(tx, d);
        if (existenteId) {
          const [atual] = await tx.select().from(produtos).where(eq(produtos.id, existenteId)).limit(1);
          const precoMudou = d.precoAtual !== null && d.precoAtual !== atual.precoAtual;
          await tx.update(produtos).set({
            ...(d.precoAtual !== null ? { precoAtual: d.precoAtual, precoAnterior: d.precoAnterior } : {}),
            precoVerificadoEm: conferido && d.precoAtual !== null ? agora : precoMudou ? null : atual.precoVerificadoEm,
            linkAfiliado: d.linkAfiliado ?? atual.linkAfiliado,
            linkOriginal: d.linkOriginal ?? atual.linkOriginal,
            idNaPlataforma: atual.idNaPlataforma ?? d.idNaPlataforma,
            descricao: atual.descricao ?? d.descricao,
            categoriaId: atual.categoriaId ?? d.categoriaId,
            subcategoriaId: atual.categoriaId ? atual.subcategoriaId : d.subcategoriaId,
            ...(d.status ? { status: d.status } : {}),
            atualizadoEm: agora,
          }).where(eq(produtos.id, existenteId));
          const [temImagem] = await tx.select({ id: produtoImagens.id }).from(produtoImagens).where(eq(produtoImagens.produtoId, existenteId)).limit(1);
          if (!temImagem && d.imagens.length) {
            await tx.insert(produtoImagens).values(d.imagens.map((url, i) => ({ produtoId: existenteId, url, ordem: i, principal: i === 0, origem })));
          }
          if (precoMudou) await tx.insert(historicoPrecos).values({ produtoId: existenteId, preco: d.precoAtual!, origem });
          if (precoMudou && !conferido) avisos.push("Preço mudou sem conferência: o desconto fica escondido até alguém conferir.");
          return { produtoId: existenteId, slug: atual.slug, novo: false };
        }
        let status = d.status ?? o.statusNovos;
        if (status === "ativo" && (!d.linkAfiliado || !d.precoAtual)) {
          status = "rascunho";
          avisos.push("Ficou como rascunho: falta link de afiliado ou preço para publicar.");
        }
        const slug = await slugLivre(tx, d.nome);
        const [novo] = await tx.insert(produtos).values({
          nome: d.nome, slug, descricao: d.descricao, plataformaId: d.plataformaId,
          categoriaId: d.categoriaId, subcategoriaId: d.subcategoriaId,
          linkOriginal: d.linkOriginal, linkAfiliado: d.linkAfiliado, idNaPlataforma: d.idNaPlataforma,
          precoAtual: d.precoAtual, precoAnterior: d.precoAnterior,
          precoVerificadoEm: conferido && d.precoAtual ? agora : null,
          status, origemCadastro: origem,
        }).returning({ id: produtos.id });
        if (d.imagens.length) {
          await tx.insert(produtoImagens).values(d.imagens.map((url, i) => ({ produtoId: novo.id, url, ordem: i, principal: i === 0, origem })));
        }
        if (d.precoAtual) await tx.insert(historicoPrecos).values({ produtoId: novo.id, preco: d.precoAtual, origem });
        return { produtoId: novo.id, slug, novo: true };
      });
      if (salvo.novo) r.criados++; else r.atualizados++;
      r.slugs.push(salvo.slug);
      await fim(salvo.novo ? "criado" : "atualizado", avisos.join(" ") || null, salvo.produtoId);
    } catch (e) {
      r.erros++;
      console.error(`Importação ${id}, linha ${item.linha}:`, e);
      await fim("erro", "Não foi possível gravar este produto. Tente de novo ou cadastre à mão.");
    }
  }

  await b.update(importacoes).set({
    status: r.erros ? "com_erros" : "concluida",
    concluidaEm: new Date(),
    totalNovos: r.criados, totalAtualizados: r.atualizados, totalErros: r.erros,
  }).where(eq(importacoes.id, id));
  return r;
}

export async function cancelarImportacao(id: number): Promise<boolean> {
  const [c] = await banco().update(importacoes).set({ status: "cancelada", concluidaEm: new Date() })
    .where(and(eq(importacoes.id, id), eq(importacoes.status, "aguardando_confirmacao"))).returning({ id: importacoes.id });
  if (c) await banco().update(importacaoItens).set({ dados: null }).where(eq(importacaoItens.importacaoId, id));
  return Boolean(c);
}

export async function listarImportacoes(limite = 30) {
  if (!db) return [];
  return db.select({
    id: importacoes.id, tipo: importacoes.tipo, descricao: importacoes.descricao, status: importacoes.status,
    iniciadaEm: importacoes.iniciadaEm, totalNovos: importacoes.totalNovos, totalAtualizados: importacoes.totalAtualizados,
    totalErros: importacoes.totalErros, loja: plataformas.nome, usuario: usuarios.nome,
    itens: sql<number>`(select count(*)::int from ${importacaoItens} where ${importacaoItens.importacaoId} = ${importacoes.id})`,
  })
    .from(importacoes)
    .leftJoin(plataformas, eq(plataformas.id, importacoes.plataformaId))
    .leftJoin(usuarios, eq(usuarios.id, importacoes.usuarioId))
    .orderBy(desc(importacoes.iniciadaEm))
    .limit(limite);
}

export async function obterImportacao(id: number) {
  if (!db) return null;
  const [imp] = await db.select({
    id: importacoes.id, tipo: importacoes.tipo, descricao: importacoes.descricao, status: importacoes.status,
    iniciadaEm: importacoes.iniciadaEm, concluidaEm: importacoes.concluidaEm,
    totalNovos: importacoes.totalNovos, totalAtualizados: importacoes.totalAtualizados, totalErros: importacoes.totalErros,
    loja: plataformas.nome, usuario: usuarios.nome,
  })
    .from(importacoes)
    .leftJoin(plataformas, eq(plataformas.id, importacoes.plataformaId))
    .leftJoin(usuarios, eq(usuarios.id, importacoes.usuarioId))
    .where(eq(importacoes.id, id)).limit(1);
  if (!imp) return null;
  const itens = await db.select({
    id: importacaoItens.id, linha: importacaoItens.linha, resultado: importacaoItens.resultado, mensagem: importacaoItens.mensagem,
    produtoId: importacaoItens.produtoId, dados: importacaoItens.dados, produtoNome: produtos.nome, produtoPreco: produtos.precoAtual,
  })
    .from(importacaoItens)
    .leftJoin(produtos, eq(produtos.id, importacaoItens.produtoId))
    .where(eq(importacaoItens.importacaoId, id))
    .orderBy(asc(importacaoItens.linha));
  const lojas = new Map((await db.select({ id: plataformas.id, nome: plataformas.nome }).from(plataformas)).map((p) => [p.id, p.nome]));
  return {
    ...imp,
    itens: itens.map((i) => {
      const d = i.dados as unknown as DadosProduto | null;
      return { ...i, dados: d, loja: d?.plataformaId ? lojas.get(d.plataformaId) ?? "" : "" };
    }),
  };
}

/** Atualiza o estado da integração mostrado no painel depois de uma consulta à API. */
export async function registrarEstadoIntegracao(slug: string, ok: boolean, observacao: string | null) {
  if (!db) return;
  await db.update(plataformas).set({
    statusIntegracao: ok ? "ativa" : "com_erro",
    observacaoIntegracao: observacao,
    ...(ok ? { ultimaSincronizacao: new Date() } : {}),
    atualizadoEm: new Date(),
  }).where(eq(plataformas.slug, slug));
}


