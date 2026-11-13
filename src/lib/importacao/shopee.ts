import "server-only";
// Cliente da Shopee Affiliate Open API (Brasil), conforme a documentação oficial do painel de afiliados
// (affiliate.shopee.com.br/open_api). As chaves ficam só em variáveis de ambiente: SHOPEE_APP_ID e SHOPEE_APP_SECRET.
import { createHash } from "node:crypto";
import type { DadosProduto } from "./planilha";

const ENDERECO_PADRAO = "https://open-api.affiliate.shopee.com.br/graphql";
/** Página oficial para pedir acesso à Open API (citada no erro 10035 da documentação). */
export const LINK_PEDIDO_ACESSO = "https://help.shopee.com.br/portal/webform/bbce78695c364ba18c9cbceb74ec9091";

export function shopeeConfigurada(): boolean {
  return Boolean(process.env.SHOPEE_APP_ID?.trim() && process.env.SHOPEE_APP_SECRET?.trim());
}

/** Assinatura oficial: SHA256(AppId + Timestamp + Payload + Secret), em hexadecimal minúsculo. */
export function assinar(appId: string, timestamp: number, payload: string, segredo: string): string {
  return createHash("sha256").update(`${appId}${timestamp}${payload}${segredo}`).digest("hex");
}

export class ErroShopee extends Error {
  constructor(message: string, readonly codigo?: number) { super(message); }
}

const MENSAGENS: Record<number, string> = {
  10020: "A Shopee recusou a assinatura. Confira SHOPEE_APP_ID, SHOPEE_APP_SECRET e o relógio do computador.",
  10030: "Limite de consultas da Shopee atingido. Espere alguns minutos e tente de novo.",
  10031: "A Shopee negou o acesso a esta consulta.",
  10033: "A conta de afiliado está congelada na Shopee.",
  10035: "Sua conta ainda não tem acesso à Open API da Shopee. Peça o acesso pelo formulário oficial.",
};

async function consultar<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const appId = process.env.SHOPEE_APP_ID?.trim();
  const segredo = process.env.SHOPEE_APP_SECRET?.trim();
  if (!appId || !segredo) throw new ErroShopee("Faltam SHOPEE_APP_ID e SHOPEE_APP_SECRET no arquivo .env.local.");
  const payload = JSON.stringify(variables ? { query, variables } : { query });
  const timestamp = Math.floor(Date.now() / 1000);
  let resposta: Response;
  try {
    resposta = await fetch(process.env.SHOPEE_API_URL || ENDERECO_PADRAO, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${assinar(appId, timestamp, payload, segredo)}`,
      },
      body: payload,
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch {
    throw new ErroShopee("Não foi possível falar com a Shopee agora. Verifique a internet e tente de novo.");
  }
  const corpo = (await resposta.json().catch(() => null)) as { data?: T; errors?: { message?: string; extensions?: { code?: number; message?: string } }[] } | null;
  if (!corpo) throw new ErroShopee(`A Shopee respondeu de forma inesperada (HTTP ${resposta.status}).`);
  const erro = corpo.errors?.[0];
  if (erro) {
    const codigo = erro.extensions?.code;
    throw new ErroShopee((codigo && MENSAGENS[codigo]) || `Erro da Shopee${codigo ? ` ${codigo}` : ""}: ${erro.extensions?.message ?? erro.message ?? "sem detalhes"}`, codigo);
  }
  if (!corpo.data) throw new ErroShopee("A Shopee não devolveu dados.");
  return corpo.data;
}

export type OfertaShopee = {
  itemId: number | string;
  productName: string;
  priceMin: string | null;
  priceMax: string | null;
  priceDiscountRate: number | null;
  imageUrl: string | null;
  productLink: string | null;
  offerLink: string | null;
  shopName: string | null;
  commissionRate: string | null;
  sales: number | null;
  periodEndTime: number | null;
};

export type BuscaShopee = { palavra?: string; itemId?: string; shopId?: string; ordem?: number; pagina?: number; quantidade?: number };

const CAMPOS = "itemId productName priceMin priceMax priceDiscountRate imageUrl productLink offerLink shopName commissionRate sales periodEndTime";

/**
 * Consulta productOfferV2. Os filtros vão escritos na própria consulta, como nos exemplos da documentação,
 * para não depender do nome interno dos tipos do GraphQL.
 */
export async function buscarOfertas(b: BuscaShopee): Promise<{ ofertas: OfertaShopee[]; temMais: boolean }> {
  const args: string[] = [`page: ${Math.max(1, Math.trunc(b.pagina ?? 1))}`, `limit: ${Math.min(Math.max(Math.trunc(b.quantidade ?? 20), 1), 50)}`];
  if (b.palavra) args.push(`keyword: ${JSON.stringify(b.palavra)}`);
  if (b.itemId && /^\d{1,20}$/.test(b.itemId)) args.push(`itemId: ${b.itemId}`);
  if (b.shopId && /^\d{1,20}$/.test(b.shopId)) args.push(`shopId: ${b.shopId}`);
  if (b.ordem && [1, 2, 3, 4, 5].includes(b.ordem)) args.push(`sortType: ${b.ordem}`);
  const query = `{ productOfferV2(${args.join(", ")}) { nodes { ${CAMPOS} } pageInfo { page limit hasNextPage } } }`;
  const data = await consultar<{ productOfferV2: { nodes: OfertaShopee[]; pageInfo: { hasNextPage: boolean } } }>(query);
  return { ofertas: data.productOfferV2?.nodes ?? [], temMais: Boolean(data.productOfferV2?.pageInfo?.hasNextPage) };
}

/** Lê shopId e itemId de um link de produto da Shopee, como https://shopee.com.br/Nome-i.52377417.6309028319 */
export function lerLinkShopee(link: string): { shopId: string; itemId: string } | null {
  const m = link.match(/-i\.(\d+)\.(\d+)/) ?? link.match(/\/product\/(\d+)\/(\d+)/);
  return m ? { shopId: m[1], itemId: m[2] } : null;
}

/**
 * Converte uma oferta da API para o formato de importação.
 * O preço anterior vem do desconto que a própria Shopee mostra (priceDiscountRate): preço / (1 - desconto).
 */
export function ofertaParaDados(o: OfertaShopee, plataformaId: number): DadosProduto {
  const atual = o.priceMin ? Number(o.priceMin) : NaN;
  const desconto = o.priceDiscountRate ?? 0;
  const anterior = Number.isFinite(atual) && desconto > 0 && desconto < 100 ? atual / (1 - desconto / 100) : null;
  return {
    nome: o.productName.trim().slice(0, 200),
    plataformaId,
    idNaPlataforma: String(o.itemId),
    linkAfiliado: o.offerLink || null,
    linkOriginal: o.productLink || null,
    precoAtual: Number.isFinite(atual) ? atual.toFixed(2) : null,
    precoAnterior: anterior && anterior > atual ? anterior.toFixed(2) : null,
    imagens: o.imageUrl ? [o.imageUrl] : [],
    categoriaId: null,
    subcategoriaId: null,
    descricao: null,
    status: null,
  };
}
