import Link from "next/link";
import { Logo } from "./Logo";

const atalhos = [
  { href: "/ofertas", rotulo: "Ofertas do dia" },
  { href: "/destaques", rotulo: "Destaques" },
  { href: "/mais-acessados", rotulo: "Mais acessados" },
  { href: "/categorias", rotulo: "Categorias" },
  { href: "/produtos", rotulo: "Todos os produtos" },
];

export function Cabecalho() {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 bg-azul text-white shadow-sm">
      <div className="container-site flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
        <Logo invertido />
        <form action="/produtos" role="search" className="order-last flex w-full min-w-0 overflow-hidden rounded-md bg-white md:order-none md:w-auto md:flex-1">
          <label htmlFor="busca-topo" className="sr-only">Buscar produtos</label>
          <input id="busca-topo" name="q" type="search" placeholder="Buscar fone, air fryer, tênis…"
            className="min-w-0 flex-1 px-3 py-2.5 text-sm text-tinta placeholder:text-tinta-suave/70 focus:outline-none" />
          <button type="submit" className="bg-rosa px-4 text-sm font-bold text-white hover:bg-rosa-escuro">Buscar</button>
        </form>
      </div>
      <nav aria-label="Atalhos" className="bg-azul-escuro/60">
        <ul className="container-site flex gap-1 overflow-x-auto py-1.5 text-sm whitespace-nowrap">
          {atalhos.map((a) => (
            <li key={a.href}><Link href={a.href} className="block rounded px-3 py-1.5 font-medium text-white/90 hover:bg-white/10 hover:text-white">{a.rotulo}</Link></li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
