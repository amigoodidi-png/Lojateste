import Link from "next/link";
import { Logo } from "./Logo";

const colunas = [
  { titulo: "Navegar", links: [["/produtos", "Todos os produtos"], ["/categorias", "Categorias"], ["/ofertas", "Ofertas do dia"], ["/destaques", "Destaques"], ["/mais-acessados", "Mais acessados"]] },
  { titulo: "A loja", links: [["/sobre", "Sobre o Olha o Achado"], ["/contato", "Contato"], ["/aviso-de-afiliados", "Aviso de afiliados"]] },
  { titulo: "Privacidade", links: [["/privacidade", "Política de privacidade"], ["/cookies", "Política de cookies"]] },
] as const;

export function Rodape() {
  return (
    <footer className="mt-16 bg-tinta text-white/80">
      <div className="container-site grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-3">
          <Logo invertido />
          <p className="max-w-sm text-sm leading-relaxed">
            Reunimos achados de lojas como Shopee, Mercado Livre e Temu. A compra acontece no site da loja de origem.
          </p>
        </div>
        {colunas.map((c) => (
          <div key={c.titulo}>
            <h2 className="mb-3 text-xs font-bold tracking-widest text-white uppercase">{c.titulo}</h2>
            <ul className="grid gap-2 text-sm">
              {c.links.map(([href, rotulo]) => <li key={href}><Link href={href} className="hover:text-white hover:underline">{rotulo}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="container-site py-5 text-xs leading-relaxed text-white/60">
          O Olha o Achado participa de programas de afiliados. Quando você compra por um link daqui, podemos receber uma comissão da loja, sem custo extra para você. Preços e disponibilidade podem mudar na loja de origem.
        </p>
      </div>
    </footer>
  );
}
