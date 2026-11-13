import { NextResponse, type NextRequest } from "next/server";

/**
 * Checagem rápida: sem o cookie de sessão, quem abre o painel vai direto para o login.
 * A verificação de verdade (sessão válida e permissões) acontece em cada página e ação do painel.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin/entrar")) return NextResponse.next();
  if (!request.cookies.has("oa_sessao")) {
    return NextResponse.redirect(new URL("/admin/entrar", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
