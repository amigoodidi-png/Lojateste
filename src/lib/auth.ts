import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { conferirSenha } from "./senha";

const { usuarios, sessoes, tentativasLogin } = schema;

export const COOKIE_SESSAO = "oa_sessao";
const DURACAO_SESSAO_DIAS = 7;
const LIMITE_TENTATIVAS = 5;
const JANELA_TENTATIVAS_MIN = 15;

export type Papel = "administrador" | "editor" | "colaborador";
export type UsuarioLogado = { id: string; nome: string; email: string; papel: Papel };

/**
 * O que cada papel pode fazer no painel.
 * - administrador: tudo, inclusive usuários e configurações
 * - editor: produtos, categorias, ofertas, banners e importação (pode excluir)
 * - colaborador: cadastra e edita produtos, mas não exclui nem mexe em categorias
 */
const PERMISSOES = {
  "produtos.editar": ["administrador", "editor", "colaborador"],
  "produtos.excluir": ["administrador", "editor"],
  "categorias.editar": ["administrador", "editor"],
  "usuarios.gerenciar": ["administrador"],
} as const satisfies Record<string, readonly Papel[]>;
export type Permissao = keyof typeof PERMISSOES;

export function pode(usuario: Pick<UsuarioLogado, "papel">, permissao: Permissao): boolean {
  return (PERMISSOES[permissao] as readonly Papel[]).includes(usuario.papel);
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type ResultadoLogin = { ok: true } | { ok: false; erro: string };

export async function entrar(emailBruto: string, senha: string): Promise<ResultadoLogin> {
  if (!db) return { ok: false, erro: "O banco de dados não está configurado." };
  const email = emailBruto.trim().toLowerCase();
  const [{ falhas }] = await db
    .select({ falhas: count() })
    .from(tentativasLogin)
    .where(and(
      eq(tentativasLogin.email, email),
      eq(tentativasLogin.sucesso, false),
      gt(tentativasLogin.ocorridoEm, new Date(Date.now() - JANELA_TENTATIVAS_MIN * 60_000)),
    ));
  if (falhas >= LIMITE_TENTATIVAS) {
    return { ok: false, erro: `Muitas tentativas. Espere ${JANELA_TENTATIVAS_MIN} minutos e tente de novo.` };
  }

  const [u] = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1);
  // Compara mesmo quando o usuário não existe, para não revelar quais e-mails estão cadastrados.
  const senhaOk = await conferirSenha(senha, u?.senhaHash ?? "scrypt:AAAAAAAAAAAAAAAAAAAAAA==:" + "A".repeat(86) + "==");
  const ok = Boolean(u && u.ativo && senhaOk);
  await db.insert(tentativasLogin).values({ email, sucesso: ok });
  if (!ok || !u) return { ok: false, erro: "E-mail ou senha incorretos." };

  const token = randomBytes(32).toString("base64url");
  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_DIAS * 86_400_000);
  await db.insert(sessoes).values({ tokenHash: hashToken(token), usuarioId: u.id, expiraEm });
  await db.update(usuarios).set({ ultimoAcesso: new Date() }).where(eq(usuarios.id, u.id));
  const jar = await cookies();
  jar.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiraEm,
  });
  return { ok: true };
}

export async function sair(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;
  if (token && db) await db.delete(sessoes).where(eq(sessoes.tokenHash, hashToken(token)));
  jar.delete(COOKIE_SESSAO);
}

export async function usuarioAtual(): Promise<UsuarioLogado | null> {
  if (!db) return null;
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  const [linha] = await db
    .select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email, papel: usuarios.papel, ativo: usuarios.ativo, expiraEm: sessoes.expiraEm })
    .from(sessoes)
    .innerJoin(usuarios, eq(usuarios.id, sessoes.usuarioId))
    .where(eq(sessoes.tokenHash, hashToken(token)))
    .limit(1);
  if (!linha || !linha.ativo || linha.expiraEm.getTime() < Date.now()) return null;
  return { id: linha.id, nome: linha.nome, email: linha.email, papel: linha.papel };
}

/** Use no começo de toda página e ação do painel. Sem login, manda para a tela de entrada. */
export async function exigirUsuario(permissao?: Permissao): Promise<UsuarioLogado> {
  const u = await usuarioAtual();
  if (!u) redirect("/admin/entrar");
  if (permissao && !pode(u, permissao)) redirect("/admin?erro=sem-permissao");
  return u;
}
