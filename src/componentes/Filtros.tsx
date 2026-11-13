import Link from "next/link";
import type { Filtros } from "@/lib/catalogo";

type Opcao = { slug: string; nome: string };

export function PainelFiltros({ acao, f, categorias, plataformas, ocultar = [] }: {
  acao: string; f: Filtros; categorias: Opcao[]; plataformas: Opcao[]; ocultar?: ("categoria" | "plataforma")[];
}) {
  const campo = "w-full min-w-0 rounded-md border border-linha bg-superficie px-3 py-2 text-sm";
  return (
    <form action={acao} className="grid gap-3 rounded-cartao border border-linha bg-superficie p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_.7fr_.7fr_1fr_auto] lg:items-end">
      <label className="grid gap-1 text-xs font-semibold text-tinta-suave">Buscar
        <input name="q" type="search" defaultValue={f.busca} className={campo} placeholder="Nome do produto" />
      </label>
      {ocultar.includes("categoria") ? null : (
        <label className="grid gap-1 text-xs font-semibold text-tinta-suave">Categoria
          <select name="categoria" defaultValue={f.categoria ?? ""} className={campo}>
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
          </select>
        </label>
      )}
      {ocultar.includes("plataforma") ? null : (
        <label className="grid gap-1 text-xs font-semibold text-tinta-suave">Loja
          <select name="plataforma" defaultValue={f.plataforma ?? ""} className={campo}>
            <option value="">Todas</option>
            {plataformas.map((p) => <option key={p.slug} value={p.slug}>{p.nome}</option>)}
          </select>
        </label>
      )}
      <label className="grid gap-1 text-xs font-semibold text-tinta-suave">Preço mín.
        <input name="min" inputMode="decimal" defaultValue={f.precoMin ?? ""} className={campo} placeholder="R$" />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-tinta-suave">Preço máx.
        <input name="max" inputMode="decimal" defaultValue={f.precoMax ?? ""} className={campo} placeholder="R$" />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-tinta-suave">Ordenar por
        <select name="ordem" defaultValue={f.ordem ?? "relevancia"} className={campo}>
          <option value="relevancia">Relevância</option>
          <option value="menor-preco">Menor preço</option>
          <option value="maior-preco">Maior preço</option>
          <option value="populares">Mais acessados</option>
          <option value="novidades">Novidades</option>
        </select>
      </label>
      <div className="flex gap-2">
        <button type="submit" className="rounded-md bg-azul px-4 py-2 text-sm font-bold text-white hover:bg-azul-escuro">Filtrar</button>
        <Link href={acao} className="rounded-md px-3 py-2 text-sm font-semibold text-tinta-suave hover:bg-fundo">Limpar</Link>
      </div>
    </form>
  );
}

export function Paginacao({ pagina, total, porPagina, hrefPagina }: {
  pagina: number; total: number; porPagina: number; hrefPagina: (n: number) => string;
}) {
  const paginas = Math.ceil(total / porPagina);
  if (paginas <= 1) return null;
  return (
    <nav aria-label="Páginas" className="flex items-center justify-center gap-3 text-sm">
      {pagina > 1 ? <Link className="rounded-md border border-linha bg-superficie px-3 py-2 font-semibold" href={hrefPagina(pagina - 1)}>← Anterior</Link> : null}
      <span className="text-tinta-suave">Página {pagina} de {paginas}</span>
      {pagina < paginas ? <Link className="rounded-md border border-linha bg-superficie px-3 py-2 font-semibold" href={hrefPagina(pagina + 1)}>Próxima →</Link> : null}
    </nav>
  );
}
