import type { Metadata } from "next";
import { PaginaTexto } from "@/componentes/PaginaTexto";

export const metadata: Metadata = { title: "Sobre a loja", alternates: { canonical: "/sobre" } };

export default function Sobre() {
  return (
    <PaginaTexto titulo="Sobre o Olha o Achado">
      <p>O Olha o Achado reúne, num só lugar, bons achados de lojas que você já conhece, como Shopee, Mercado Livre e Temu.</p>
      <p>Não vendemos, não guardamos estoque e não fazemos entregas. Quando você clica em <strong>COMPRAR AGORA</strong>, abre a página oficial do produto na loja de origem. A compra, o pagamento, a entrega e a garantia são feitos diretamente com essa loja.</p>
      <h2>Como escolhemos os achados</h2>
      <ul>
        <li>Mostramos o preço com a data e a hora em que foi consultado.</li>
        <li>Só exibimos desconto quando o preço foi conferido nas últimas 48 horas.</li>
        <li>Produtos com preço desatualizado saem da vitrine de ofertas até serem revisados.</li>
      </ul>
      <h2>Como o site se mantém</h2>
      <p>Participamos de programas de afiliados. Se você comprar por um link daqui, podemos receber uma comissão da loja, sem nenhum custo extra para você. Isso não muda o preço que você paga.</p>
    </PaginaTexto>
  );
}
