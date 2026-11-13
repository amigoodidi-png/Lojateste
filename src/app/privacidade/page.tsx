import type { Metadata } from "next";
import Link from "next/link";
import { PaginaTexto } from "@/componentes/PaginaTexto";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Política de privacidade", alternates: { canonical: "/privacidade" } };

export default function Privacidade() {
  return (
    <PaginaTexto titulo="Política de privacidade" atualizadoEm="13/11/2026">
      <p>Esta política explica quais dados o Olha o Achado trata quando você usa o site, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
      <h2>Dados que tratamos</h2>
      <ul>
        <li><strong>Cliques em COMPRAR AGORA:</strong> registramos qual produto foi clicado, a loja, a categoria, a data e a hora. Isso não identifica você.</li>
        <li><strong>Origem da visita:</strong> só se você aceitar os cookies de medição, guardamos o site de onde você veio (por exemplo, instagram.com), parâmetros de campanha (UTM) e um código anônimo que muda todo dia. Não guardamos seu endereço IP.</li>
        <li><strong>Ferramentas de análise:</strong> se o Google Analytics for ativado, ele só carrega com o seu consentimento.</li>
      </ul>
      <h2>Para que usamos</h2>
      <p>Para saber quais achados interessam mais, melhorar as vitrines e manter o site funcionando. Não vendemos dados.</p>
      <h2>Compras nas lojas</h2>
      <p>Ao clicar em um link, você vai para o site da loja de origem, que tem a própria política de privacidade. Não temos acesso aos dados do seu pedido ou do seu pagamento.</p>
      <h2>Seus direitos</h2>
      <p>Você pode pedir informações, correção ou exclusão de dados e retirar o consentimento a qualquer momento, apagando os cookies do navegador ou escolhendo &quot;Só essenciais&quot; no aviso de cookies. {SITE.emailContato ? <>Fale com a gente em {SITE.emailContato}.</> : <>Veja a página de <Link href="/contato" className="underline">contato</Link>.</>}</p>
      <p>Veja também a <Link href="/cookies" className="underline">política de cookies</Link>.</p>
    </PaginaTexto>
  );
}
