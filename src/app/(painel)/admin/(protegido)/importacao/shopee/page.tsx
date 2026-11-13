import Link from "next/link";
import { Titulo } from "@/componentes/painel/Avisos";
import { FormBuscaShopee } from "@/componentes/painel/FormImportacao";
import { exigirUsuario } from "@/lib/auth";
import { LINK_PEDIDO_ACESSO, shopeeConfigurada } from "@/lib/importacao/shopee";

export const metadata = { title: "Shopee" };

export default async function Shopee() {
  await exigirUsuario("produtos.importar");
  const ok = shopeeConfigurada();
  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/importacao" className="text-sm text-tinta-suave hover:underline">← Importação</Link>
      <Titulo>Shopee (API oficial)</Titulo>
      {ok ? (
        <section className="grid max-w-2xl gap-4 rounded-cartao border border-linha bg-superficie p-5">
          <FormBuscaShopee />
          <p className="border-t border-linha pt-3 text-xs text-tinta-suave">
            Os produtos chegam com o link de afiliado gerado pela própria Shopee e o preço de agora. O preço anterior é calculado pelo desconto que a Shopee mostra na página do produto.
          </p>
        </section>
      ) : (
        <section className="grid max-w-2xl gap-4 rounded-cartao border border-linha bg-superficie p-5 text-sm">
          <p><span className="rounded bg-alerta/15 px-1.5 py-0.5 text-xs font-bold text-alerta">Sem acesso ainda</span> Para importar direto da Shopee, a sua conta de afiliado precisa da <strong>Open API</strong> liberada. Hoje ela não está.</p>
          <ol className="grid list-decimal gap-3 pl-5">
            <li>
              Peça o acesso no formulário oficial da Shopee:{" "}
              <a href={LINK_PEDIDO_ACESSO} target="_blank" rel="noreferrer" className="font-semibold text-azul hover:underline">help.shopee.com.br (formulário da Open API)</a>.
              Quem decide e quanto tempo leva é a Shopee.
            </li>
            <li>Quando for aprovado, o <strong>AppID</strong> e a <strong>Senha</strong> aparecem no painel de afiliados, no menu <strong>Abrir API</strong> (affiliate.shopee.com.br/open_api).</li>
            <li>
              Abra o arquivo <code className="rounded bg-fundo px-1">.env.local</code> na pasta do site e preencha as duas linhas:
              <pre className="mt-2 overflow-x-auto rounded-md bg-tinta p-3 text-xs text-white">SHOPEE_APP_ID=seu AppID{"\n"}SHOPEE_APP_SECRET=sua Senha</pre>
              Nunca coloque essas chaves no código nem mande por mensagem: a Senha vale como uma senha de banco.
            </li>
            <li>Feche e abra o site de novo (<code className="rounded bg-fundo px-1">npm run dev</code>). Esta página passa a mostrar a busca.</li>
          </ol>
          <p className="border-t border-linha pt-3 text-tinta-suave">Enquanto isso, dá para importar produtos da Shopee pela <Link href="/admin/importacao" className="font-semibold text-azul hover:underline">planilha</Link>, com os links que você já gera no painel de afiliados.</p>
        </section>
      )}
    </div>
  );
}
