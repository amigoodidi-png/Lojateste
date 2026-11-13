import Link from "next/link";
import { Avisos, Titulo } from "@/componentes/painel/Avisos";
import { FormCategoria } from "@/componentes/painel/FormCategoria";
import { listarCategoriasAdmin } from "@/lib/admin-dados";
import { exigirUsuario } from "@/lib/auth";
import { excluirCategoria } from "../../acoes";

export const metadata = { title: "Categorias" };

export default async function Categorias({ searchParams }: PageProps<"/admin/categorias">) {
  await exigirUsuario("categorias.editar");
  const [todas, sp] = await Promise.all([listarCategoriasAdmin(), searchParams]);
  const principais = todas.filter((c) => !c.paiId);
  const grupos = principais.map((p) => ({ p, subs: todas.filter((s) => s.paiId === p.id) }));

  const Linha = ({ c, sub }: { c: (typeof todas)[number]; sub?: boolean }) => (
    <li className={sub ? "ml-6 border-l-2 border-linha pl-4" : ""}>
      <details className="group rounded-md">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-3 py-2.5 hover:bg-fundo">
          <span className={`font-semibold ${c.ativa ? "" : "text-tinta-suave line-through"}`}>{c.nome}</span>
          <span className="text-xs text-tinta-suave">{c.total} {c.total === 1 ? "produto" : "produtos"} · ordem {c.ordem}{c.ativa ? "" : " · inativa"}</span>
          <Link href={`/categoria/${c.slug}`} target="_blank" className="text-xs text-azul hover:underline">/categoria/{c.slug}</Link>
          <span className="ml-auto text-xs font-semibold text-azul group-open:hidden">Editar</span>
        </summary>
        <div className="grid gap-3 px-3 pt-2 pb-4">
          <FormCategoria categoria={c} principais={principais} />
          <form action={excluirCategoria}>
            <input type="hidden" name="id" value={c.id} />
            <button className="text-xs font-semibold text-rosa-escuro hover:underline">Excluir categoria</button>
            <span className="ml-2 text-xs text-tinta-suave">Só é possível se não tiver produtos nem subcategorias.</span>
          </form>
        </div>
      </details>
    </li>
  );

  return (
    <div className="flex flex-col gap-5">
      <Titulo>Categorias</Titulo>
      <Avisos sp={sp} />
      <section className="rounded-cartao border border-linha bg-superficie p-5">
        <h2 className="mb-3 font-display text-base font-bold">Nova categoria</h2>
        <FormCategoria principais={principais} />
      </section>
      <section className="rounded-cartao border border-linha bg-superficie p-3">
        {grupos.length ? (
          <ul className="grid gap-1">
            {grupos.map(({ p, subs }) => (
              <li key={p.id}>
                <ul className="grid gap-1"><Linha c={p} />{subs.map((s) => <Linha key={s.id} c={s} sub />)}</ul>
              </li>
            ))}
          </ul>
        ) : <p className="p-4 text-sm text-tinta-suave">Nenhuma categoria ainda.</p>}
        <p className="px-3 pt-3 text-xs text-tinta-suave">A ordem define a posição no menu do site (menor número aparece primeiro).</p>
      </section>
    </div>
  );
}
