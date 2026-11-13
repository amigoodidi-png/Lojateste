// Leitura de planilhas CSV para a importação de produtos. Funções puras, sem banco.
import { gerarSlug, lerPreco } from "../texto";

export const LIMITE_LINHAS = 2000;
export const LIMITE_BYTES = 2 * 1024 * 1024;

/** Lê um CSV (separado por ; , ou tab, como o Excel brasileiro salva). Aceita aspas e quebras de linha dentro de aspas. */
export function lerCsv(texto: string): string[][] {
  const t = texto.replace(/^﻿/, "");
  const primeira = t.slice(0, t.search(/\r?\n|$/));
  const contagem = (c: string) => primeira.split(c).length - 1;
  const sep = [";", "\t", ","].reduce((a, b) => (contagem(b) > contagem(a) ? b : a), ";");

  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"' && campo === "") aspas = true;
    else if (c === sep) { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((x) => x.trim())) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((x) => x.trim())) linhas.push(linha);
  return linhas;
}

/** Colunas aceitas e os nomes alternativos que as pessoas costumam usar. */
const COLUNAS = {
  nome: ["nome", "produto", "titulo", "nome do produto", "product name", "productname"],
  loja: ["loja", "plataforma", "marketplace", "origem"],
  linkAfiliado: ["link afiliado", "link de afiliado", "link", "url afiliado", "offer link", "offerlink"],
  linkOriginal: ["link original", "link do produto", "url", "url do produto", "product link", "productlink"],
  precoAtual: ["preco", "preco atual", "valor", "preco por", "price", "preco promocional"],
  precoAnterior: ["preco anterior", "preco original", "preco de", "de", "preco cheio"],
  codigo: ["codigo", "codigo na loja", "id", "id na loja", "item id", "itemid", "sku", "mlb"],
  imagens: ["imagens", "imagem", "foto", "fotos", "url imagem", "imagem url", "image url", "imageurl"],
  categoria: ["categoria"],
  subcategoria: ["subcategoria", "sub categoria"],
  descricao: ["descricao", "descrição", "description"],
  status: ["status", "situacao"],
} as const;
export type Coluna = keyof typeof COLUNAS;

const normalizar = (s: string) => gerarSlug(s).replace(/-/g, " ").trim();

/** Mapeia o cabeçalho para as colunas conhecidas. Devolve o índice de cada coluna e as que ficaram de fora. */
export function mapearCabecalho(cabecalho: string[]): { indices: Partial<Record<Coluna, number>>; ignoradas: string[] } {
  const indices: Partial<Record<Coluna, number>> = {};
  const ignoradas: string[] = [];
  cabecalho.forEach((bruto, i) => {
    const n = normalizar(bruto);
    const coluna = (Object.keys(COLUNAS) as Coluna[]).find((k) => (COLUNAS[k] as readonly string[]).map(normalizar).includes(n));
    if (coluna && indices[coluna] === undefined) indices[coluna] = i;
    else if (bruto.trim()) ignoradas.push(bruto.trim());
  });
  return { indices, ignoradas };
}

export type Referencias = {
  plataformas: { id: number; slug: string; nome: string }[];
  categorias: { id: number; slug: string; nome: string; paiId: number | null }[];
};

/** Dados de um produto prontos para gravar. É o mesmo formato para planilha e API. */
export type DadosProduto = {
  nome: string;
  plataformaId: number;
  idNaPlataforma: string | null;
  linkAfiliado: string | null;
  linkOriginal: string | null;
  precoAtual: string | null;
  precoAnterior: string | null;
  imagens: string[];
  categoriaId: number | null;
  subcategoriaId: number | null;
  descricao: string | null;
  status: "rascunho" | "ativo" | "inativo" | "indisponivel" | "revisar_preco" | null;
};

/** nomeBruto: o nome como veio, para mostrar na prévia mesmo quando a linha tem erro. */
export type LinhaLida = { linha: number; dados: DadosProduto | null; erro?: string; avisos: string[]; nomeBruto?: string };

const ehUrl = (s: string) => /^https?:\/\/\S+$/i.test(s);
const STATUS: Record<string, DadosProduto["status"]> = {
  rascunho: "rascunho", ativo: "ativo", publicado: "ativo", inativo: "inativo",
  indisponivel: "indisponivel", esgotado: "indisponivel", "revisar preco": "revisar_preco",
};

/** Confere cada linha da planilha. Não acessa o banco: recebe lojas e categorias já carregadas. */
export function lerLinhas(linhas: string[][], ref: Referencias, plataformaPadraoId?: number | null): { itens: LinhaLida[]; erroGeral?: string; ignoradas: string[] } {
  if (linhas.length < 2) return { itens: [], ignoradas: [], erroGeral: "A planilha está vazia. A primeira linha precisa ter os nomes das colunas e as seguintes, os produtos." };
  const [cabecalho, ...corpo] = linhas;
  const { indices, ignoradas } = mapearCabecalho(cabecalho);
  if (indices.nome === undefined) return { itens: [], ignoradas, erroGeral: "Não encontrei a coluna \"nome\". Use o modelo de planilha para ver os nomes das colunas." };
  if (indices.loja === undefined && !plataformaPadraoId) return { itens: [], ignoradas, erroGeral: "A planilha não tem a coluna \"loja\". Escolha a loja no formulário ou acrescente essa coluna." };
  if (corpo.length > LIMITE_LINHAS) return { itens: [], ignoradas, erroGeral: `A planilha tem ${corpo.length} produtos. O limite é ${LIMITE_LINHAS} por vez: divida em arquivos menores.` };

  const lojaPorChave = new Map<string, number>();
  for (const p of ref.plataformas) { lojaPorChave.set(normalizar(p.slug), p.id); lojaPorChave.set(normalizar(p.nome), p.id); }
  const catPorChave = new Map<string, Referencias["categorias"][number]>();
  for (const c of ref.categorias) { catPorChave.set(`${c.paiId ?? 0}:${normalizar(c.nome)}`, c); catPorChave.set(`${c.paiId ?? 0}:${normalizar(c.slug)}`, c); }

  const itens = corpo.map((cols, i): LinhaLida => {
    const v = (c: Coluna) => (indices[c] === undefined ? "" : (cols[indices[c]!] ?? "").trim());
    const avisos: string[] = [];
    const linha = i + 1;
    const falha = (erro: string): LinhaLida => ({ linha, dados: null, erro, avisos, nomeBruto: v("nome").slice(0, 200) });

    const nome = v("nome").replace(/\s+/g, " ");
    if (nome.length < 3) return falha("Sem nome do produto.");
    if (nome.length > 200) return falha("Nome com mais de 200 letras.");

    let plataformaId = plataformaPadraoId ?? null;
    if (v("loja")) {
      plataformaId = lojaPorChave.get(normalizar(v("loja"))) ?? null;
      if (!plataformaId) return falha(`Loja "${v("loja")}" não cadastrada. Use: ${ref.plataformas.map((p) => p.nome).join(", ")}.`);
    }
    if (!plataformaId) return falha("Sem loja. Preencha a coluna loja ou escolha a loja no formulário.");

    const linkAfiliado = v("linkAfiliado") || null;
    if (linkAfiliado && !ehUrl(linkAfiliado)) return falha("Link de afiliado inválido: precisa começar com https://");
    const linkOriginal = v("linkOriginal") || null;
    if (linkOriginal && !ehUrl(linkOriginal)) { avisos.push("Link original inválido, ignorado."); }

    const precoAtual = v("precoAtual") ? lerPreco(v("precoAtual")) : null;
    if (v("precoAtual") && precoAtual === null) return falha(`Preço "${v("precoAtual")}" inválido. Use, por exemplo, 89,90.`);
    let precoAnterior = v("precoAnterior") ? lerPreco(v("precoAnterior")) : null;
    if (v("precoAnterior") && precoAnterior === null) return falha(`Preço anterior "${v("precoAnterior")}" inválido.`);
    if (precoAnterior && (!precoAtual || Number(precoAnterior) <= Number(precoAtual))) {
      avisos.push("Preço anterior não é maior que o atual: ficou sem desconto.");
      precoAnterior = null;
    }

    const imagens = v("imagens").split(/[|\n]|,(?=\s*https?:)/).map((s) => s.trim()).filter(Boolean);
    const imagensOk = imagens.filter(ehUrl).slice(0, 15);
    if (imagensOk.length < imagens.length) avisos.push("Algumas imagens não eram endereços válidos e ficaram de fora.");

    let categoriaId: number | null = null;
    let subcategoriaId: number | null = null;
    if (v("categoria")) {
      const c = catPorChave.get(`0:${normalizar(v("categoria"))}`);
      if (c) categoriaId = c.id;
      else avisos.push(`Categoria "${v("categoria")}" não existe no painel: produto ficou sem categoria.`);
    }
    if (v("subcategoria")) {
      const s = categoriaId ? catPorChave.get(`${categoriaId}:${normalizar(v("subcategoria"))}`) : undefined;
      if (s) subcategoriaId = s.id;
      else avisos.push(`Subcategoria "${v("subcategoria")}" não encontrada dentro da categoria.`);
    }

    let status: DadosProduto["status"] = null;
    if (v("status")) {
      status = STATUS[normalizar(v("status"))] ?? null;
      if (!status) avisos.push(`Status "${v("status")}" desconhecido: ignorado.`);
    }

    return {
      linha, avisos,
      dados: {
        nome, plataformaId,
        idNaPlataforma: v("codigo").slice(0, 120) || null,
        linkAfiliado,
        linkOriginal: linkOriginal && ehUrl(linkOriginal) ? linkOriginal : null,
        precoAtual, precoAnterior,
        imagens: imagensOk,
        categoriaId, subcategoriaId,
        descricao: v("descricao").slice(0, 5000) || null,
        status,
      },
    };
  });
  return { itens, ignoradas };
}

/** Texto do arquivo-modelo oferecido para download no painel. */
export function modeloCsv(): string {
  const cab = ["nome", "loja", "link_afiliado", "preco_atual", "preco_anterior", "codigo", "link_original", "imagens", "categoria", "subcategoria", "descricao", "status"];
  const ex = [
    "[EXEMPLO] Apague esta linha", "Shopee", "https://s.shopee.com.br/SEU-LINK", "89,90", "129,90", "1234567890",
    "https://shopee.com.br/produto-i.111.222", "https://exemplo.com/foto1.jpg|https://exemplo.com/foto2.jpg",
    "Eletrônicos", "", "Descrição com suas palavras", "rascunho",
  ];
  const q = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return "﻿" + [cab, ex].map((l) => l.map(q).join(";")).join("\r\n") + "\r\n";
}
