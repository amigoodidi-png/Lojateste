import Link from "next/link";
import { Avisos, Titulo } from "@/componentes/painel/Avisos";
import { resumoPainel } from "@/lib/admin-dados";
import { exigirUsuario } from "@/lib/auth";
import { formatarDataHora } from "@/lib/precos";

export const metadata = { title: "Dashboard" };

const ACOES: Record<string, string> = { criou: "criou", editou: "editou", excluiu: "excluiu", duplicou: "duplicou", ativou: "publicou", desativou: "retirou do site" };

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const u = await exigirUsuario();
  const [r, sp] = await Promise.all([resumoPainel(), searchParams]);
  const cartoes = r ? [
    { rotulo: "Produtos cadastrados", valor: r.total, href: "/admin/produtos" },
    { rotulo: "Ativos no site", valor: r.ativos, href: "/admin/produtos?status=ativo" },
    { rotulo: "Fora do site (rascunho ou inativo)", valor: r.inativos, href: "/admin/produtos" },
    { rotulo: "Precisam revisar preço", valor: r.revisar, href: "/admin/produtos?status=revisar_preco", alerta: r.revisar > 0 },
    { rotulo: "Cliques hoje", valor: r.cliquesHoje },
    { rotulo: "Cliques no mês", valor: r.cliquesMes },
  ] : [];
  return (
    <div className="flex flex-col gap-6">
      <Titulo>Olá, {u.nome.split(" ")[0]}</Titulo>
      <Avisos sp={sp} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {cartoes.map((c) => {
          const corpo = (
            <>
              <span className="text-xs font-semibold text-tinta-suave">{c.rotulo}</span>
              <span className={`font-display text-2xl font-extrabold tabular-nums ${c.alerta ? "text-alerta" : ""}`}>{c.valor.toLocaleString("pt-BR")}</span>
            </>
          );
          const cls = "flex flex-col gap-1 rounded-cartao border border-linha bg-superficie p-4";
          return c.href ? <Link key={c.rotulo} href={c.href} className={`${cls} hover:border-azul`}>{corpo}</Link> : <div key={c.rotulo} className={cls}>{corpo}</div>;
        })}
      </div>
      <p className="text-xs text-tinta-suave">Cliques são acessos ao botão COMPRAR AGORA, não vendas. Relatórios completos chegam na etapa de estatísticas.</p>
      <section className="rounded-cartao border border-linha bg-superficie p-5">
        <h2 className="mb-3 font-display text-base font-bold">Atividade recente</h2>
        {r?.atividades.length ? (
          <ul className="divide-y divide-linha text-sm">
            {r.atividades.map((a, i) => {
              const nome = (a.detalhes as { nome?: string } | null)?.nome;
              return (
                <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                  <span><strong>{a.nome ?? "Alguém"}</strong> {ACOES[a.acao] ?? a.acao} {a.entidade === "categoria" ? "a categoria" : "o produto"} {nome ? <em>{nome}</em> : null}</span>
                  <span className="text-tinta-suave tabular-nums">{formatarDataHora(a.ocorridoEm)}</span>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-tinta-suave">Nada por aqui ainda. Comece <Link href="/admin/produtos/novo" className="font-semibold text-azul underline">cadastrando um produto</Link>.</p>}
      </section>
    </div>
  );
}
