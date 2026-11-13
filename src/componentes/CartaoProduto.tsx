import Link from "next/link";
import type { ProdutoResumo } from "@/lib/catalogo";
import { formatarPreco } from "@/lib/precos";

export function CartaoProduto({ p }: { p: ProdutoResumo }) {
  const desconto = p.desconto;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-cartao border border-linha bg-superficie transition-shadow hover:shadow-[0_6px_24px_-8px_rgba(18,20,58,.25)]">
      <div className="relative aspect-square bg-fundo">
        {p.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imagem} alt={p.nome} loading="lazy" className="h-full w-full object-contain p-2" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-tinta-suave">Sem imagem</div>
        )}
        {desconto ? (
          <span className="absolute top-2 left-2 rounded-full bg-rosa px-2 py-0.5 text-xs font-bold text-white">-{desconto}%</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-[11px] font-semibold tracking-wide text-tinta-suave uppercase">{p.plataforma.nome}</span>
        <h3 className="line-clamp-2 min-h-[2.6em] text-sm leading-snug">
          <Link href={`/produto/${p.slug}`} className="after:absolute after:inset-0">{p.nome}</Link>
        </h3>
        <div className="mt-auto pt-1">
          {desconto ? <div className="text-xs text-tinta-suave line-through">{formatarPreco(p.precoAnterior)}</div> : null}
          <div className="font-display text-lg font-bold text-azul">{p.precoAtual ? formatarPreco(p.precoAtual) : "Ver preço na loja"}</div>
        </div>
      </div>
    </article>
  );
}

export function GradeProdutos({ itens }: { itens: ProdutoResumo[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {itens.map((p) => <CartaoProduto key={p.id} p={p} />)}
    </div>
  );
}
