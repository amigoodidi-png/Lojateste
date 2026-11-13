import Link from "next/link";
import { Avisos, Titulo } from "@/componentes/painel/Avisos";
import { listarProdutosAdmin, ROTULO_STATUS, STATUS_PRODUTO } from "@/lib/admin-dados";
import { exigirUsuario } from "@/lib/auth";
import { listarPlataformas } from "@/lib/catalogo";
import { formatarDataHora, formatarPreco, precoRecente } from "@/lib/precos";
import { acaoEmLote, alternarAtivo, duplicarProduto } from "../../acoes";

export const metadata = { title: "Produtos" };

const COR_STATUS: Record<string, string> = {
  ativo: "bg-sucesso/10 text-sucesso", rascunho: "bg-fundo text-tinta-suave", inativo: "bg-fundo text-tinta-suave",
  indisponivel: "bg-rosa/10 text-rosa-escuro", revisar_preco: "bg-alerta/10 text-alerta",
};

export default async function Produtos({ searchParams }: PageProps<"/admin/produtos">) {
  await exigirUsuario("produtos.editar");
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const f = { busca: s("q")?.slice(0, 80), status: s("status"), plataforma: s("plataforma"), pagina: Number(s("pagina")) || 1 };
  const [{ itens, total, porPagina = 30, pagina = 1 }, plataformas] = await Promise.all([listarProdutosAdmin(f), listarPlataformas()]);
  const campo = "rounded-md border border-linha bg-superficie px-3 py-2 text-sm";
  const paginas = Math.ceil(total / porPagina);
  const link = (n: number) => `/admin/produtos?${new URLSearchParams({ ...(f.busca ? { q: f.busca } : {}), ...(f.status ? { status: f.status } : {}), ...(f.plataforma ? { plataforma: f.plataforma } : {}), pagina: String(n) })}`;

  return (
    <div className="flex flex-col gap-5">
      <Titulo acoes={<Link href="/admin/produtos/novo" className="rounded-md bg-rosa px-4 py-2 text-sm font-bold text-white hover:bg-rosa-escuro">+ Adicionar produto</Link>}>Produtos</Titulo>
      <Avisos sp={sp} />
      <form className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-0 flex-1 basis-56 gap-1 text-xs font-semibold text-tinta-suave">Buscar por nome ou código
          <input name="q" type="search" defaultValue={f.busca} className={campo} />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-tinta-suave">Status
          <select name="status" defaultValue={f.status ?? ""} className={campo}>
            <option value="">Todos</option>
            {STATUS_PRODUTO.map((st) => <option key={st} value={st}>{ROTULO_STATUS[st]}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-tinta-suave">Loja
          <select name="plataforma" defaultValue={f.plataforma ?? ""} className={campo}>
            <option value="">Todas</option>
            {plataformas.map((p) => <option key={p.slug} value={p.slug}>{p.nome}</option>)}
          </select>
        </label>
        <button className="rounded-md bg-azul px-4 py-2 text-sm font-bold text-white">Filtrar</button>
      </form>

      <form action={acaoEmLote} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-tinta-suave">{total} {total === 1 ? "produto" : "produtos"} · Com os selecionados:</span>
          <select name="acao" defaultValue="" className={campo} aria-label="Ação em lote">
            <option value="" disabled>Escolha…</option>
            <option value="ativar">Publicar no site</option>
            <option value="desativar">Retirar do site</option>
            <option value="destacar">Marcar como destaque</option>
            <option value="tirar-destaque">Tirar destaque</option>
          </select>
          <button className="rounded-md border border-linha bg-superficie px-3 py-2 font-semibold hover:bg-fundo">Aplicar</button>
        </div>
        <div className="overflow-x-auto rounded-cartao border border-linha bg-superficie">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-fundo text-left text-xs text-tinta-suave">
              <tr>
                <th className="w-8 px-3 py-2"><span className="sr-only">Selecionar</span></th>
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Loja</th>
                <th className="px-3 py-2">Preço</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Atualizado</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {itens.map((p) => (
                <tr key={p.id} className="align-middle">
                  <td className="px-3 py-2"><input type="checkbox" name="ids" value={p.id} aria-label={`Selecionar ${p.nome}`} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.imagem ? <img src={p.imagem} alt="" className="size-10 shrink-0 rounded border border-linha object-contain" /> : <div className="size-10 shrink-0 rounded bg-fundo" />}
                      <div className="min-w-0">
                        <Link href={`/admin/produtos/${p.id}`} className="line-clamp-2 font-semibold hover:text-azul">{p.nome}</Link>
                        <span className="text-xs text-tinta-suave">{p.categoria ?? "Sem categoria"}{p.destaque ? " · ★ Destaque" : ""}{p.temLink ? "" : " · sem link de afiliado"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">{p.plataforma}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {p.precoAtual ? formatarPreco(p.precoAtual) : "—"}
                    {p.precoAtual && !precoRecente(p.precoVerificadoEm) ? <span className="block text-xs text-alerta">conferir preço</span> : null}
                  </td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COR_STATUS[p.status]}`}>{ROTULO_STATUS[p.status]}</span></td>
                  <td className="px-3 py-2 text-xs text-tinta-suave tabular-nums">{formatarDataHora(p.atualizadoEm)}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/produtos/${p.id}`} className="rounded px-2 py-1 font-semibold text-azul hover:bg-fundo">Editar</Link>
                      <button formAction={duplicarProduto.bind(null, p.id)} className="rounded px-2 py-1 hover:bg-fundo">Duplicar</button>
                      <button formAction={alternarAtivo.bind(null, p.id)} className="rounded px-2 py-1 hover:bg-fundo">{p.status === "ativo" ? "Desativar" : "Ativar"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!itens.length ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-tinta-suave">
                  {f.busca || f.status || f.plataforma ? "Nenhum produto com esses filtros." : <>Nenhum produto ainda. <Link href="/admin/produtos/novo" className="font-semibold text-azul underline">Adicione o primeiro</Link>.</>}
                </td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </form>
      {paginas > 1 ? (
        <nav className="flex items-center justify-center gap-3 text-sm">
          {pagina > 1 ? <Link href={link(pagina - 1)} className="rounded border border-linha bg-superficie px-3 py-1.5">← Anterior</Link> : null}
          <span>Página {pagina} de {paginas}</span>
          {pagina < paginas ? <Link href={link(pagina + 1)} className="rounded border border-linha bg-superficie px-3 py-1.5">Próxima →</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
