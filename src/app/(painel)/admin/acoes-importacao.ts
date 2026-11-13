"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { exigirUsuario } from "@/lib/auth";
import { LIMITE_BYTES, lerCsv, lerLinhas } from "@/lib/importacao/planilha";
import { cancelarImportacao, confirmarImportacao, montarPrevia, referencias, registrarEstadoIntegracao } from "@/lib/importacao/processar";
import { ErroShopee, buscarOfertas, lerLinkShopee, ofertaParaDados, shopeeConfigurada } from "@/lib/importacao/shopee";

export type EstadoImportacao = { erro?: string; campos?: Record<string, string> } | undefined;

async function registrar(usuarioId: string, acao: string, id: number, detalhes?: object) {
  if (!db) return;
  await db.insert(schema.logAtividades).values({ usuarioId, acao, entidade: "importacao", entidadeId: String(id), detalhes: detalhes ?? null });
}

/** Excel no Brasil costuma salvar em Windows-1252; o resto do mundo em UTF-8. */
function decodificar(bytes: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(bytes) : utf8;
}

export async function enviarPlanilha(_: EstadoImportacao, form: FormData): Promise<EstadoImportacao> {
  const u = await exigirUsuario("produtos.importar");
  const campos = { plataformaId: String(form.get("plataformaId") ?? "") };
  const arquivo = form.get("arquivo");
  const colado = String(form.get("colado") ?? "").trim();
  let texto = colado;
  let descricao = "Texto colado";
  if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > LIMITE_BYTES) return { erro: "Arquivo maior que 2 MB. Divida a planilha em partes menores.", campos };
    if (!/\.(csv|txt|tsv)$/i.test(arquivo.name)) {
      return { erro: "Envie a planilha salva como CSV. No Excel: Arquivo › Salvar como › CSV (separado por vírgulas ou ponto e vírgula).", campos };
    }
    texto = decodificar(await arquivo.arrayBuffer());
    descricao = arquivo.name;
  }
  if (!texto) return { erro: "Escolha o arquivo da planilha ou cole o conteúdo.", campos };

  const plataformaPadrao = Number(campos.plataformaId) || null;
  const ref = await referencias();
  if (plataformaPadrao && !ref.plataformas.some((p) => p.id === plataformaPadrao)) return { erro: "Loja inválida.", campos };
  const { itens, erroGeral } = lerLinhas(lerCsv(texto), ref, plataformaPadrao);
  if (erroGeral) return { erro: erroGeral, campos };

  const id = await montarPrevia({ tipo: "planilha", descricao, plataformaId: plataformaPadrao, usuarioId: u.id, itens });
  await registrar(u.id, "previa", id, { tipo: "planilha", linhas: itens.length });
  redirect(`/admin/importacao/${id}`);
}

export async function buscarNaShopee(_: EstadoImportacao, form: FormData): Promise<EstadoImportacao> {
  const u = await exigirUsuario("produtos.importar");
  const campos = Object.fromEntries(["busca", "ordem", "quantidade"].map((k) => [k, String(form.get(k) ?? "").trim()]));
  if (!shopeeConfigurada()) return { erro: "A integração com a Shopee ainda não está configurada.", campos };
  if (!campos.busca) return { erro: "Digite uma palavra para buscar, um link de produto da Shopee ou o código do item.", campos };

  const link = lerLinkShopee(campos.busca);
  const soCodigo = /^\d{5,20}$/.test(campos.busca) ? campos.busca : null;
  const ref = await referencias();
  const shopee = ref.plataformas.find((p) => p.slug === "shopee");
  if (!shopee) return { erro: "A loja Shopee não está cadastrada no banco. Rode npm run db:semear.", campos };

  try {
    const { ofertas } = await buscarOfertas({
      palavra: link || soCodigo ? undefined : campos.busca.slice(0, 100),
      itemId: link?.itemId ?? soCodigo ?? undefined,
      shopId: link?.shopId,
      ordem: Number(campos.ordem) || undefined,
      quantidade: Number(campos.quantidade) || 20,
    });
    await registrarEstadoIntegracao("shopee", true, null);
    if (!ofertas.length) return { erro: "A Shopee não encontrou produtos com essa busca.", campos };
    const itens = ofertas.map((o, i) => ({ linha: i + 1, dados: ofertaParaDados(o, shopee.id), avisos: [] as string[] }));
    const id = await montarPrevia({ tipo: "api", descricao: `Busca na Shopee: ${campos.busca}`, plataformaId: shopee.id, usuarioId: u.id, itens });
    await registrar(u.id, "previa", id, { tipo: "api", resultados: ofertas.length });
    redirect(`/admin/importacao/${id}`);
  } catch (e) {
    if (e instanceof ErroShopee) {
      await registrarEstadoIntegracao("shopee", false, e.message);
      return { erro: e.message, campos };
    }
    throw e;
  }
}

export async function confirmar(form: FormData) {
  const u = await exigirUsuario("produtos.importar");
  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/admin/importacao?erro=importacao-nao-encontrada");
  const selecionados = new Set(form.getAll("itens").map(Number).filter((n) => Number.isInteger(n) && n > 0));
  let resumo;
  try {
    resumo = await confirmarImportacao(id, {
      statusNovos: form.get("statusNovos") === "ativo" ? "ativo" : "rascunho",
      precoConferido: form.get("precoConferido") === "on",
      selecionados,
    });
  } catch {
    redirect(`/admin/importacao/${id}?erro=importacao-processada`);
  }
  await registrar(u.id, "importou", id, { criados: resumo.criados, atualizados: resumo.atualizados, erros: resumo.erros });
  updateTag("produtos");
  updateTag("categorias");
  for (const slug of resumo.slugs.slice(0, 200)) updateTag(`produto-${slug}`);
  redirect(`/admin/importacao/${id}?ok=importado`);
}

export async function cancelar(form: FormData) {
  const u = await exigirUsuario("produtos.importar");
  const id = Number(form.get("id"));
  const ok = Number.isInteger(id) && id > 0 && (await cancelarImportacao(id));
  if (!ok) redirect(`/admin/importacao/${id}?erro=importacao-processada`);
  await registrar(u.id, "cancelou", id);
  redirect("/admin/importacao?ok=cancelada");
}
