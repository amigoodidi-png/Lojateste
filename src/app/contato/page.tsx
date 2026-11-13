import type { Metadata } from "next";
import { PaginaTexto } from "@/componentes/PaginaTexto";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Contato", alternates: { canonical: "/contato" } };

export default function Contato() {
  return (
    <PaginaTexto titulo="Contato">
      <p>Encontrou um preço errado, um link quebrado ou quer sugerir um achado? Fale com a gente.</p>
      {SITE.emailContato ? (
        <p>E-mail: <a className="font-semibold text-azul underline" href={`mailto:${SITE.emailContato}`}>{SITE.emailContato}</a></p>
      ) : (
        <p>Os canais de contato serão publicados em breve.</p>
      )}
      <h2>Dúvidas sobre um pedido</h2>
      <p>Como a compra acontece na loja de origem, dúvidas sobre pagamento, entrega, troca ou garantia devem ser tratadas diretamente com a Shopee, o Mercado Livre, a Temu ou a loja onde você comprou.</p>
    </PaginaTexto>
  );
}
