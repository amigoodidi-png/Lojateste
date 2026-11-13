import type { Metadata } from "next";
import { PaginaTexto } from "@/componentes/PaginaTexto";

export const metadata: Metadata = { title: "Política de cookies", alternates: { canonical: "/cookies" } };

export default function Cookies() {
  return (
    <PaginaTexto titulo="Política de cookies" atualizadoEm="13/11/2026">
      <p>Cookies são pequenos arquivos guardados no seu navegador. O Olha o Achado usa poucos, e você escolhe quais aceita.</p>
      <h2>Essenciais (sempre ativos)</h2>
      <ul><li><strong>consentimento:</strong> guarda a sua escolha no aviso de cookies por 12 meses.</li></ul>
      <h2>Medição (só com a sua permissão)</h2>
      <ul>
        <li>Permitem registrar de onde veio a visita e parâmetros de campanha quando você clica em COMPRAR AGORA.</li>
        <li>Se o Google Analytics for ativado, os cookies dele entram nesta categoria.</li>
      </ul>
      <h2>Cookies das lojas</h2>
      <p>Ao abrir a página de uma loja (Shopee, Mercado Livre, Temu e outras), ela pode gravar os próprios cookies, inclusive para identificar que você veio por um link de afiliado. Esses cookies seguem a política de cada loja.</p>
      <h2>Como mudar a sua escolha</h2>
      <p>Apague os cookies deste site nas configurações do navegador. O aviso aparece de novo na próxima visita.</p>
    </PaginaTexto>
  );
}
