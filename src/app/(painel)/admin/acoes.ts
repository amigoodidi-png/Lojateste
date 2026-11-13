"use server";

import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { entrar, exigirUsuario, sair, type UsuarioLogado } from "@/lib/auth";
import { gerarSlug, lerPreco } from "@/lib/texto";

const { produtos, produtoImagens, historicoPrecos, categorias, logAtividades } = schema;

export type EstadoForm = { erro?: string; campos?: Record<string, string> } | undefined;

function banco() {
  if (!db) throw new Error("Banco de dados não configurado (DATABASE_URL).");
  return db;
}

async function registrar(u: UsuarioLogado, acao: string, entidade: string, entidadeId: string | number, detalhes?: object) {
  await banco().insert(logAtividades).values({ usuarioId: u.id, acao, entidade, entidadeId: String(entidadeId), detalhes: detalhes ?? null });
}

function atualizarVitrines(slug?: string) {
  updateTag("produtos");
  updateTag("categorias");
  if (slug) updateTag(`produto-${slug}`);
}

async function slugLivre(tabela: "produtos" | "categorias", base: string, ignorarId?: number): Promise<string> {
  const t = tabela === "produtos" ? produtos : categorias;
  let slug = gerarSlug(base);
  for (let i = 2; ; i++) {
    const [existe] = await banco().select({ id: t.id }).from(t)
      .where(ignorarId ? and(eq(t.slug, slug), ne(t.id, ignorarId)) : eq(t.slug, slug)).limit(1);
    if (!existe) return slug;
    slug = `${gerarSlug(base).slice(0, 74)}-${i}`;
  }
}

// ---------- Login ----------

export async function acaoEntrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const email = String(form.get("email") ?? "");
  const r = await entrar(email, String(form.get("senha") ?? ""));
  if (!r.ok) return { erro: r.erro, campos: { email } };
  redirect("/admin");
}

export async function acaoSair() {
  await sair();
  redirect("/admin/entrar");
}

// ---------- Produtos ----------

const urlOpcional = z.string().trim().max(2000).refine((v) => !v || /^https?:\/\/\S+$/i.test(v), "Use um endereço que comece com https://").transform((v) => v || null);
const idOpcional = z.string().trim().transform((v) => (v ? Number(v) : null)).refine((v) => v === null || (Number.isInteger(v) && v > 0));

const esquemaProduto = z.object({
  nome: z.string().trim().min(3, "Informe o nome do produto (mínimo 3 letras).").max(200),
  descricao: z.string().trim().max(5000).transform((v) => v || null),
  plataformaId: z.coerce.number({ message: "Escolha a loja de origem." }).int().positive("Escolha a loja de origem."),
  categoriaId: idOpcional,
  subcategoriaId: idOpcional,
  linkOriginal: urlOpcional,
  linkAfiliado: urlOpcional,
  idNaPlataforma: z.string().trim().max(120).transform((v) => v || null),
  status: z.enum(["rascunho", "ativo", "inativo", "indisponivel", "revisar_preco"]),
  ofertaValidaAte: z.string().trim().transform((v) => (v ? new Date(`${v}:00-03:00`) : null))
    .refine((d) => d === null || !Number.isNaN(d.getTime()), "Data de validade inválida."),
});

export async function salvarProduto(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirUsuario("produtos.editar");
  const campos = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const id = Number(form.get("id")) || null;
  const vazios = { descricao: "", categoriaId: "", subcategoriaId: "", linkOriginal: "", linkAfiliado: "", idNaPlataforma: "", ofertaValidaAte: "", plataformaId: "", status: "rascunho" };
  const r = esquemaProduto.safeParse({ ...vazios, ...campos });
  if (!r.success) return { erro: r.error.issues[0]?.message ?? "Confira os campos.", campos };
  const d = r.data;

  const precoAtual = lerPreco(form.get("precoAtual"));
  const precoAnterior = lerPreco(form.get("precoAnterior"));
  if (form.get("precoAtual") && precoAtual === null) return { erro: "Preço atual inválido. Use, por exemplo, 89,90.", campos };
  if (form.get("precoAnterior") && precoAnterior === null) return { erro: "Preço anterior inválido. Use, por exemplo, 129,90.", campos };
  if (precoAnterior && precoAtual && Number(precoAnterior) <= Number(precoAtual)) {
    return { erro: "O preço anterior precisa ser maior que o atual. Se não há desconto, deixe o preço anterior em branco.", campos };
  }
  if (d.status === "ativo" && !d.linkAfiliado) return { erro: "Para publicar (status Ativo), informe o link de afiliado.", campos };
  if (d.status === "ativo" && !precoAtual) return { erro: "Para publicar (status Ativo), informe o preço atual.", campos };

  const imagens = String(form.get("imagens") ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const imagemInvalida = imagens.find((url) => !/^https?:\/\/\S+$/i.test(url));
  if (imagemInvalida) return { erro: `Endereço de imagem inválido: ${imagemInvalida.slice(0, 60)}`, campos };
  if (imagens.length > 15) return { erro: "Use no máximo 15 imagens por produto.", campos };

  const precoConferido = form.get("precoConferido") === "on";
  const b = banco();

  if (d.idNaPlataforma) {
    const [duplicado] = await b.select({ id: produtos.id, nome: produtos.nome }).from(produtos)
      .where(and(eq(produtos.plataformaId, d.plataformaId), eq(produtos.idNaPlataforma, d.idNaPlataforma), id ? ne(produtos.id, id) : undefined)).limit(1);
    if (duplicado) return { erro: `Já existe um produto com esse código nesta loja: "${duplicado.nome}" (nº ${duplicado.id}).`, campos };
  }

  const anterior = id ? (await b.select().from(produtos).where(eq(produtos.id, id)).limit(1))[0] : null;
  if (id && !anterior) return { erro: "Produto não encontrado. Ele pode ter sido excluído.", campos };

  const precoMudou = !anterior || anterior.precoAtual !== precoAtual;
  const valores = {
    ...d,
    precoAtual,
    precoAnterior,
    destaque: form.get("destaque") === "on",
    precoVerificadoEm: precoConferido || precoMudou ? new Date() : anterior?.precoVerificadoEm ?? null,
    atualizadoEm: new Date(),
  };

  const salvo = await b.transaction(async (tx) => {
    let produtoId: number;
    let slug: string;
    if (anterior) {
      slug = anterior.slug;
      await tx.update(produtos).set(valores).where(eq(produtos.id, anterior.id));
      produtoId = anterior.id;
    } else {
      slug = await slugLivre("produtos", d.nome);
      const [novo] = await tx.insert(produtos).values({ ...valores, slug, origemCadastro: "manual" }).returning({ id: produtos.id });
      produtoId = novo.id;
    }
    await tx.delete(produtoImagens).where(eq(produtoImagens.produtoId, produtoId));
    if (imagens.length) {
      await tx.insert(produtoImagens).values(imagens.map((url, i) => ({ produtoId, url, ordem: i, principal: i === 0, origem: "upload" })));
    }
    if (precoAtual && precoMudou) await tx.insert(historicoPrecos).values({ produtoId, preco: precoAtual, origem: "manual" });
    return { produtoId, slug };
  });

  await registrar(u, anterior ? "editou" : "criou", "produto", salvo.produtoId, { nome: d.nome });
  atualizarVitrines(salvo.slug);
  redirect(`/admin/produtos?ok=${anterior ? "salvo" : "criado"}`);
}

function lerId(entrada: FormData | number): number {
  const id = typeof entrada === "number" ? entrada : Number(entrada.get("id"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Produto inválido.");
  return id;
}

/** Use com bind: duplicarProduto.bind(null, id) */
export async function duplicarProduto(produtoId: number) {
  const u = await exigirUsuario("produtos.editar");
  const id = lerId(produtoId);
  const b = banco();
  const [p] = await b.select().from(produtos).where(eq(produtos.id, id)).limit(1);
  if (!p) redirect("/admin/produtos?erro=nao-encontrado");
  const nome = `${p.nome} (cópia)`;
  const slug = await slugLivre("produtos", nome);
  const novoId = await b.transaction(async (tx) => {
    const { id: _id, slug: _s, criadoEm: _c, atualizadoEm: _a, ...resto } = p;
    const [novo] = await tx.insert(produtos)
      .values({ ...resto, nome, slug, status: "rascunho", idNaPlataforma: null, destaque: false })
      .returning({ id: produtos.id });
    const imgs = await tx.select().from(produtoImagens).where(eq(produtoImagens.produtoId, id));
    if (imgs.length) {
      await tx.insert(produtoImagens).values(imgs.map(({ id: _i, criadoEm: _ci, ...img }) => ({ ...img, produtoId: novo.id })));
    }
    return novo.id;
  });
  await registrar(u, "duplicou", "produto", novoId, { origem: id, nome });
  redirect(`/admin/produtos/${novoId}?ok=duplicado`);
}

/** Use com bind: alternarAtivo.bind(null, id) */
export async function alternarAtivo(produtoId: number) {
  const u = await exigirUsuario("produtos.editar");
  const id = lerId(produtoId);
  const b = banco();
  const [p] = await b.select({ status: produtos.status, slug: produtos.slug, link: produtos.linkAfiliado, preco: produtos.precoAtual }).from(produtos).where(eq(produtos.id, id)).limit(1);
  if (!p) redirect("/admin/produtos?erro=nao-encontrado");
  const ativar = p.status !== "ativo";
  if (ativar && (!p.link || !p.preco)) redirect(`/admin/produtos?erro=incompleto&id=${id}`);
  await b.update(produtos).set({ status: ativar ? "ativo" : "inativo", atualizadoEm: new Date() }).where(eq(produtos.id, id));
  await registrar(u, ativar ? "ativou" : "desativou", "produto", id);
  atualizarVitrines(p.slug);
  redirect(`/admin/produtos?ok=${ativar ? "ativado" : "desativado"}`);
}

export async function excluirProduto(form: FormData) {
  const u = await exigirUsuario("produtos.excluir");
  const id = lerId(form);
  if (form.get("confirmar") !== "sim") redirect(`/admin/produtos/${id}?erro=confirmar-exclusao`);
  const b = banco();
  const [p] = await b.delete(produtos).where(eq(produtos.id, id)).returning({ nome: produtos.nome, slug: produtos.slug });
  if (p) {
    await registrar(u, "excluiu", "produto", id, { nome: p.nome });
    atualizarVitrines(p.slug);
  }
  redirect("/admin/produtos?ok=excluido");
}

/** Ações em lote na lista de produtos. */
export async function acaoEmLote(form: FormData) {
  const u = await exigirUsuario("produtos.editar");
  const ids = form.getAll("ids").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const acao = String(form.get("acao") ?? "");
  if (!ids.length) redirect("/admin/produtos?erro=nada-selecionado");
  const b = banco();
  if (acao === "desativar") {
    await b.update(produtos).set({ status: "inativo", atualizadoEm: new Date() }).where(inArray(produtos.id, ids));
  } else if (acao === "ativar") {
    await b.update(produtos).set({ status: "ativo", atualizadoEm: new Date() })
      .where(and(inArray(produtos.id, ids), sql`${produtos.linkAfiliado} is not null and ${produtos.precoAtual} is not null`));
  } else if (acao === "destacar" || acao === "tirar-destaque") {
    await b.update(produtos).set({ destaque: acao === "destacar", atualizadoEm: new Date() }).where(inArray(produtos.id, ids));
  } else {
    redirect("/admin/produtos?erro=acao-invalida");
  }
  await registrar(u, `lote:${acao}`, "produto", ids.join(","), { quantidade: ids.length });
  atualizarVitrines();
  redirect(`/admin/produtos?ok=lote`);
}

// ---------- Categorias ----------

const esquemaCategoria = z.object({
  nome: z.string().trim().min(2, "Informe o nome da categoria.").max(80),
  descricao: z.string().trim().max(300).transform((v) => v || null),
  paiId: idOpcional,
  ordem: z.coerce.number().int().min(0).max(9999).catch(0),
});

export async function salvarCategoria(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigirUsuario("categorias.editar");
  const campos = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const r = esquemaCategoria.safeParse({ descricao: "", paiId: "", ordem: "0", ...campos });
  if (!r.success) return { erro: r.error.issues[0]?.message, campos };
  const id = Number(form.get("id")) || null;
  if (id && r.data.paiId === id) return { erro: "Uma categoria não pode ficar dentro dela mesma.", campos };
  const b = banco();
  if (r.data.paiId) {
    const [pai] = await b.select({ paiId: categorias.paiId }).from(categorias).where(eq(categorias.id, r.data.paiId)).limit(1);
    if (!pai) return { erro: "Categoria principal não encontrada.", campos };
    if (pai.paiId) return { erro: "Use só dois níveis: categoria e subcategoria.", campos };
    if (id) {
      const [filha] = await b.select({ id: categorias.id }).from(categorias).where(eq(categorias.paiId, id)).limit(1);
      if (filha) return { erro: "Esta categoria tem subcategorias, então não pode virar subcategoria.", campos };
    }
  }
  const ativa = form.get("ativa") === "on";
  if (id) {
    await b.update(categorias).set({ ...r.data, ativa, atualizadoEm: new Date() }).where(eq(categorias.id, id));
  } else {
    const slug = await slugLivre("categorias", r.data.nome);
    await b.insert(categorias).values({ ...r.data, slug, ativa: true });
  }
  await registrar(u, id ? "editou" : "criou", "categoria", id ?? r.data.nome, { nome: r.data.nome });
  atualizarVitrines();
  redirect(`/admin/categorias?ok=${id ? "salva" : "criada"}`);
}

export async function excluirCategoria(form: FormData) {
  const u = await exigirUsuario("categorias.editar");
  const id = Number(form.get("id"));
  const b = banco();
  const [usada] = await b.select({ id: produtos.id }).from(produtos)
    .where(sql`${produtos.categoriaId} = ${id} or ${produtos.subcategoriaId} = ${id}`).limit(1);
  if (usada) redirect("/admin/categorias?erro=em-uso");
  const [filha] = await b.select({ id: categorias.id }).from(categorias).where(eq(categorias.paiId, id)).limit(1);
  if (filha) redirect("/admin/categorias?erro=tem-subcategorias");
  const [c] = await b.delete(categorias).where(eq(categorias.id, id)).returning({ nome: categorias.nome });
  if (c) await registrar(u, "excluiu", "categoria", id, { nome: c.nome });
  atualizarVitrines();
  redirect("/admin/categorias?ok=excluida");
}
