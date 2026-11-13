import type { Metadata } from "next";
import { PaginaTexto } from "@/componentes/PaginaTexto";

export const metadata: Metadata = { title: "Aviso de afiliados", alternates: { canonical: "/aviso-de-afiliados" } };

export default function AvisoAfiliados() {
  return (
    <PaginaTexto titulo="Aviso de afiliados" atualizadoEm="13/11/2026">
      <p>O Olha o Achado participa de programas de afiliados de lojas on-line, como os da Shopee, do Mercado Livre e da Temu, e poderá participar de outros no futuro.</p>
      <p>Os links do botão <strong>COMPRAR AGORA</strong> são links de afiliado. Quando você compra depois de clicar em um deles, a loja pode nos pagar uma comissão. Você não paga nada a mais por isso.</p>
      <h2>O que isso significa para você</h2>
      <ul>
        <li>A compra é feita na loja de origem, que é a responsável pelo produto, pelo pagamento, pela entrega e pelo atendimento.</li>
        <li>Preços, estoque e condições podem mudar na loja a qualquer momento. Sempre confira o valor final antes de pagar.</li>
        <li>Contamos os cliques nos links para saber quais achados interessam mais. Clique não é venda, e não temos acesso aos seus dados de compra.</li>
      </ul>
    </PaginaTexto>
  );
}
