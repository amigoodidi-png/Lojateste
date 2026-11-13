import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { produtos, plataformas, cliques } = schema;

/**
 * Botão COMPRAR AGORA: registra o clique e redireciona para o link de afiliado.
 * Origem e UTM só são guardadas quando o visitante aceitou cookies de medição (cookie "consentimento=medicao").
 */
export async function GET(request: Request, ctx: RouteContext<"/ir/[id]">) {
  const { id } = await ctx.params;
  const produtoId = Number(id);
  const voltar = new URL("/produtos", request.url);
  if (!db || !Number.isInteger(produtoId) || produtoId <= 0) return Response.redirect(voltar, 302);

  const [p] = await db
    .select({
      id: produtos.id,
      slug: produtos.slug,
      status: produtos.status,
      linkAfiliado: produtos.linkAfiliado,
      categoriaId: produtos.categoriaId,
      plataformaId: produtos.plataformaId,
      parametros: plataformas.parametrosRastreamento,
    })
    .from(produtos)
    .innerJoin(plataformas, eq(plataformas.id, produtos.plataformaId))
    .where(eq(produtos.id, produtoId))
    .limit(1);

  const destino = p?.linkAfiliado ? linkSeguro(p.linkAfiliado, p.parametros ?? {}) : null;
  if (!p || p.status !== "ativo" || !destino) {
    return Response.redirect(p ? new URL(`/produto/${p.slug}`, request.url) : voltar, 302);
  }

  const consentiu = /(?:^|;\s*)consentimento=medicao(?:;|$)/.test(request.headers.get("cookie") ?? "");
  const url = new URL(request.url);
  const utm = Object.fromEntries([...url.searchParams].filter(([k]) => k.startsWith("utm_")).slice(0, 5));
  try {
    await db.insert(cliques).values({
      produtoId: p.id,
      plataformaId: p.plataformaId,
      categoriaId: p.categoriaId,
      origem: consentiu ? origemDoReferer(request.headers.get("referer")) : null,
      utm: consentiu && Object.keys(utm).length ? utm : null,
      visitanteHash: consentiu ? hashVisitante(request) : null,
    });
  } catch (erro) {
    // Falha ao registrar não pode impedir o visitante de chegar à loja.
    console.error("Falha ao registrar clique", erro);
  }

  return new Response(null, {
    status: 302,
    headers: { Location: destino, "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}

function linkSeguro(link: string, parametros: Record<string, string>): string | null {
  try {
    const u = new URL(link);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    for (const [k, v] of Object.entries(parametros)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    return u.toString();
  } catch {
    return null;
  }
}

function origemDoReferer(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).hostname.slice(0, 120);
  } catch {
    return null;
  }
}

/** Hash diário e anônimo (não guarda IP): permite contar visitantes únicos sem identificar ninguém. */
function hashVisitante(request: Request): string {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ua = request.headers.get("user-agent") ?? "";
  const dia = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${process.env.CLIQUES_SAL ?? ""}|${dia}|${ip}|${ua}`).digest("hex").slice(0, 32);
}
