import Link from "next/link";
import { Suspense } from "react";
import { Simbolo } from "@/componentes/Logo";
import { exigirUsuario } from "@/lib/auth";
import { acaoSair } from "../acoes";

const MENU: { href?: string; rotulo: string }[] = [
  { href: "/admin", rotulo: "Dashboard" },
  { href: "/admin/produtos", rotulo: "Produtos" },
  { href: "/admin/categorias", rotulo: "Categorias" },
  { href: "/admin/importacao", rotulo: "Importação de produtos" },
  { rotulo: "Plataformas de afiliados" },
  { rotulo: "Ofertas" },
  { rotulo: "Banners" },
  { rotulo: "Estatísticas" },
  { rotulo: "Configurações gerais" },
  { rotulo: "Usuários e permissões" },
];

export default function LayoutProtegido({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b border-linha bg-tinta text-white md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:flex-col md:items-start">
          <Link href="/admin" className="flex items-center gap-2">
            <Simbolo tamanho={26} invertido />
            <span className="font-display text-sm font-extrabold">painel</span>
          </Link>
          <Suspense fallback={null}><Usuario /></Suspense>
        </div>
        <nav aria-label="Painel" className="overflow-x-auto px-2 pb-3 md:pb-6">
          <ul className="flex gap-1 md:flex-col">
            {MENU.map((m, i) => (
              <li key={m.rotulo} className="shrink-0">
                {i === 4 ? <span className="hidden px-3 pt-4 pb-1 text-[10px] font-bold tracking-widest text-white/40 uppercase md:block">Próximas etapas</span> : null}
                {m.href ? (
                  <Link href={m.href} className="block rounded px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">{m.rotulo}</Link>
                ) : (
                  <span className="block cursor-default rounded px-3 py-1.5 text-sm whitespace-nowrap text-white/35" title="Chega nas próximas etapas">{m.rotulo}</span>
                )}
              </li>
            ))}
            <li className="shrink-0 md:mt-4"><Link href="/" target="_blank" className="block rounded px-3 py-2 text-sm text-white/60 hover:text-white">Ver o site ↗</Link></li>
          </ul>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-cartao bg-superficie" />}>{children}</Suspense>
      </main>
    </div>
  );
}

async function Usuario() {
  const u = await exigirUsuario();
  return (
    <div className="flex items-center gap-3 text-xs md:mt-3 md:w-full md:justify-between">
      <span className="text-white/70"><span className="block font-semibold text-white">{u.nome}</span>{u.papel}</span>
      <form action={acaoSair}><button className="rounded border border-white/20 px-2 py-1 text-white/80 hover:bg-white/10">Sair</button></form>
    </div>
  );
}
