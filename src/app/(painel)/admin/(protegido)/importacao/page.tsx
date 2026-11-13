import Link from "next/link";
import { Avisos, Titulo } from "@/componentes/painel/Avisos";
import { FormPlanilha } from "@/componentes/painel/FormImportacao";
import { exigirUsuario } from "@/lib/auth";
import { listarImportacoes, referencias } from "@/lib/importacao/processar";
import { shopeeConfigurada } from "@/lib/importacao/shopee";
import { ROTULO_IMPORTACAO } from "@/lib/importacao/rotulos";
import { formatarDataHora } from "@/lib/precos";

export const metadata = { title: "Importação de produtos" };

const COLUNAS: [string, string][] = [
  ["nome", "Obrigatória. Nome do produto como vai aparecer no site."],
  ["loja", "Shopee, Mercado Livre ou Temu. Pode ficar de fora se todos forem da mesma loja (escolha no formulário)."],
  ["link_afiliado", "O link gerado no painel de afiliados. Sem ele o produto entra como rascunho."],
  ["preco_atual", "Ex.: 89,90"],
  ["preco_anterior", "Ex.: 129,90. Só vira desconto se for maior que o atual e o preço estiver conferido."],
  ["codigo", "Código do produto na loja. Evita duplicar: se já existir, o produto é atualizado."],
  ["link_original", "Link normal da página do produto na loja."],
  ["imagens", "Endereços das imagens separados por | (a primeira é a principal)."],
  ["categoria / subcategoria", "Nome igual ao cadastrado no painel. Se não existir, o produto fica sem categoria."],
  ["descricao", "Texto com suas palavras."],
  ["status", "rascunho, ativo, inativo ou indisponível. Em branco usa a opção escolhida na confirmação."],
];

export default async function Importacao({ searchParams }: PageProps<"/admin/importacao">) {
  await exigirUsuario("produtos.importar");
  const [sp, ref, historico] = await Promise.all([searchParams, referencias(), listarImportacoes()]);
  const shopeeOk = shopeeConfigurada();

  return (
    <div className="flex flex-col gap-5">
      <Titulo>Importação de produtos</Titulo>
      <Avisos sp={sp} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <section className="grid gap-4 rounded-cartao border border-linha bg-superficie p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-base font-bold">Planilha (qualquer loja)</h2>
            <a href="/admin/importacao/modelo" download className="text-sm font-semibold text-azul hover:underline">Baixar modelo de planilha</a>
          </div>
          <FormPlanilha plataformas={ref.plataformas} />
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-azul">Quais colunas a planilha pode ter</summary>
            <dl className="mt-3 grid gap-2">
              {COLUNAS.map(([c, d]) => (
                <div key={c} className="grid gap-0.5 sm:grid-cols-[11rem_1fr] sm:gap-3">
                  <dt className="font-mono text-xs font-semibold">{c}</dt>
                  <dd className="text-tinta-suave">{d}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-tinta-suave">A ordem das colunas não importa, e nomes parecidos também são aceitos (por exemplo &quot;Preço&quot; ou &quot;Link de afiliado&quot;).</p>
          </details>
        </section>

        <section className="grid gap-3 rounded-cartao border border-linha bg-superficie p-5">
          <h2 className="font-display text-base font-bold">Shopee (API oficial)</h2>
          {shopeeOk ? (
            <p className="text-sm">Chaves configuradas. Busque produtos e importe com o link de afiliado já gerado pela Shopee.</p>
          ) : (
            <p className="text-sm"><span className="rounded bg-alerta/15 px-1.5 py-0.5 text-xs font-bold text-alerta">Sem acesso ainda</span> A sua conta de afiliado ainda não tem a Open API liberada. Enquanto isso, use a planilha.</p>
          )}
          <Link href="/admin/importacao/shopee" className="justify-self-start rounded-md border border-linha px-4 py-2 text-sm font-semibold hover:bg-fundo">
            {shopeeOk ? "Buscar produtos na Shopee" : "Como liberar o acesso"}
          </Link>
          <p className="border-t border-linha pt-3 text-xs text-tinta-suave">Mercado Livre e Temu: por enquanto só por planilha. Não usamos robôs para copiar páginas das lojas.</p>
        </section>
      </div>

      <section className="rounded-cartao border border-linha bg-superficie">
        <h2 className="px-5 pt-4 pb-2 font-display text-base font-bold">Histórico</h2>
        {historico.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-fundo text-left text-xs text-tinta-suave">
                <tr><th className="px-4 py-2">Nº</th><th className="px-4 py-2">Quando</th><th className="px-4 py-2">Origem</th><th className="px-4 py-2">Situação</th><th className="px-4 py-2 text-right">Novos</th><th className="px-4 py-2 text-right">Atualizados</th><th className="px-4 py-2 text-right">Erros</th><th className="px-4 py-2">Por</th></tr>
              </thead>
              <tbody>
                {historico.map((h) => {
                  const st = ROTULO_IMPORTACAO[h.status];
                  return (
                    <tr key={h.id} className="border-t border-linha">
                      <td className="px-4 py-2"><Link href={`/admin/importacao/${h.id}`} className="font-semibold text-azul hover:underline">#{h.id}</Link></td>
                      <td className="px-4 py-2 whitespace-nowrap tabular-nums">{formatarDataHora(h.iniciadaEm)}</td>
                      <td className="max-w-64 truncate px-4 py-2" title={h.descricao ?? ""}>{h.tipo === "api" ? "API · " : ""}{h.descricao} <span className="text-tinta-suave">({h.itens} {h.itens === 1 ? "linha" : "linhas"})</span></td>
                      <td className="px-4 py-2"><span className={`rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${st?.cor ?? ""}`}>{st?.texto ?? h.status}</span></td>
                      <td className="px-4 py-2 text-right tabular-nums">{h.totalNovos}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{h.totalAtualizados}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{h.totalErros}</td>
                      <td className="px-4 py-2 text-tinta-suave">{h.usuario ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 pb-5 text-sm text-tinta-suave">Nenhuma importação ainda.</p>
        )}
      </section>
    </div>
  );
}
