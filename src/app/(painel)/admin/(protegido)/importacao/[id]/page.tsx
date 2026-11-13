import Link from "next/link";
import { notFound } from "next/navigation";
import { Avisos, Titulo } from "@/componentes/painel/Avisos";
import { exigirUsuario } from "@/lib/auth";
import { obterImportacao } from "@/lib/importacao/processar";
import { ROTULO_IMPORTACAO, ROTULO_ITEM } from "@/lib/importacao/rotulos";
import { formatarDataHora, formatarPreco } from "@/lib/precos";
import { cancelar, confirmar } from "../../../acoes-importacao";

export const metadata = { title: "Importação" };

export default async function DetalheImportacao({ params, searchParams }: PageProps<"/admin/importacao/[id]">) {
  await exigirUsuario("produtos.importar");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const imp = Number.isInteger(Number(id)) ? await obterImportacao(Number(id)) : null;
  if (!imp) notFound();

  const previa = imp.status === "aguardando_confirmacao";
  const conta = (r: string) => imp.itens.filter((i) => i.resultado === r).length;
  const st = ROTULO_IMPORTACAO[imp.status];
  const resumo = previa
    ? [["novos", conta("novo")], ["para atualizar", conta("atualizar")], ["repetidos", conta("ignorar")], ["com erro", conta("erro")]]
    : [["criados", conta("criado")], ["atualizados", conta("atualizado")], ["ignorados", conta("ignorado")], ["com erro", conta("erro")]];
  const gravaveis = conta("novo") + conta("atualizar");

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/importacao" className="text-sm text-tinta-suave hover:underline">← Importação</Link>
      <Titulo acoes={<span className={`rounded px-2 py-1 text-xs font-semibold ${st?.cor ?? ""}`}>{st?.texto}</span>}>
        {previa ? "Prévia da importação" : `Importação #${imp.id}`}
      </Titulo>
      <Avisos sp={sp} />
      <p className="text-sm text-tinta-suave">
        {imp.tipo === "api" ? "API da Shopee" : "Planilha"} · {imp.descricao} · {formatarDataHora(imp.iniciadaEm)}{imp.usuario ? ` · ${imp.usuario}` : ""}
      </p>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {resumo.map(([rotulo, n]) => (
          <div key={rotulo} className="rounded-cartao border border-linha bg-superficie px-4 py-3">
            <dt className="text-xs text-tinta-suave">{rotulo}</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>

      <form action={confirmar} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={imp.id} />
        <section className="overflow-x-auto rounded-cartao border border-linha bg-superficie">
          <table className="w-full text-sm">
            <thead className="bg-fundo text-left text-xs text-tinta-suave">
              <tr>
                {previa ? <th className="w-10 px-3 py-2"><span className="sr-only">Importar</span></th> : null}
                <th className="px-3 py-2">Linha</th><th className="px-3 py-2">Situação</th><th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Loja</th><th className="px-3 py-2 text-right">Preço</th><th className="px-3 py-2">Observação</th>
              </tr>
            </thead>
            <tbody>
              {imp.itens.map((i) => {
                const r = ROTULO_ITEM[i.resultado];
                const marcavel = previa && (i.resultado === "novo" || i.resultado === "atualizar");
                const nome = i.dados?.nome ?? i.produtoNome ?? "—";
                return (
                  <tr key={i.id} className="border-t border-linha align-top">
                    {previa ? (
                      <td className="px-3 py-2">
                        {marcavel ? <input type="checkbox" name="itens" value={i.id} defaultChecked aria-label={`Importar ${nome}`} className="mt-0.5" /> : null}
                      </td>
                    ) : null}
                    <td className="px-3 py-2 tabular-nums text-tinta-suave">{i.linha}</td>
                    <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${r?.cor ?? ""}`}>{r?.texto ?? i.resultado}</span></td>
                    <td className="max-w-80 px-3 py-2">
                      <div className="flex items-start gap-2">
                        {i.dados?.imagens?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.dados.imagens[0]} alt="" className="size-10 shrink-0 rounded border border-linha object-contain" />
                        ) : null}
                        <span>
                          {i.produtoId && !previa ? <Link href={`/admin/produtos/${i.produtoId}`} className="font-medium text-azul hover:underline">{nome}</Link> : <span className="font-medium">{nome}</span>}
                          {i.dados?.idNaPlataforma ? <span className="block text-xs text-tinta-suave">código {i.dados.idNaPlataforma}</span> : null}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{i.loja}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                      {i.dados?.precoAtual ? formatarPreco(i.dados.precoAtual) : "—"}
                      {i.dados?.precoAnterior ? <span className="block text-xs text-tinta-suave line-through">{formatarPreco(i.dados.precoAnterior)}</span> : null}
                    </td>
                    <td className="max-w-72 px-3 py-2 text-xs text-tinta-suave">
                      {previa && i.resultado === "atualizar" ? <span className="block">Já existe{i.produtoNome ? `: "${i.produtoNome}"` : ""}. Atualiza preço e links.</span> : null}
                      {i.mensagem}
                      {previa && i.resultado === "novo" && !i.dados?.linkAfiliado ? <span className="block">Sem link de afiliado: entra como rascunho.</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {previa ? (
          <section className="grid gap-4 rounded-cartao border border-linha bg-superficie p-5">
            <h2 className="font-display text-base font-bold">Confirmar</h2>
            <fieldset className="grid gap-2 text-sm">
              <legend className="mb-1 font-semibold">Produtos novos entram como</legend>
              <label className="flex items-center gap-2"><input type="radio" name="statusNovos" value="rascunho" defaultChecked /> Rascunho, para eu revisar antes de publicar</label>
              <label className="flex items-center gap-2"><input type="radio" name="statusNovos" value="ativo" /> Ativos, já aparecendo no site (os que tiverem link e preço)</label>
            </fieldset>
            {imp.tipo === "planilha" ? (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="precoConferido" className="mt-1" />
                <span>Conferi hoje os preços desta planilha nas lojas
                  <span className="block text-xs text-tinta-suave">Sem isso, os produtos entram sem selo de desconto até alguém conferir o preço. A regra das 48 horas continua valendo.</span>
                </span>
              </label>
            ) : (
              <p className="text-xs text-tinta-suave">Os preços vieram agora da API da Shopee e contam como conferidos.</p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button disabled={!gravaveis} className="rounded-md bg-azul px-4 py-2.5 text-sm font-bold text-white hover:bg-azul-escuro disabled:opacity-50">Importar produtos marcados</button>
              <button formAction={cancelar} formNoValidate className="rounded-md border border-linha px-4 py-2.5 text-sm font-semibold hover:bg-fundo">Cancelar importação</button>
            </div>
            {!gravaveis ? <p className="text-sm text-rosa-escuro">Nenhuma linha pode ser importada. Corrija a planilha e envie de novo.</p> : null}
          </section>
        ) : null}
      </form>
    </div>
  );
}
