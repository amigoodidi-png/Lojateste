import Link from "next/link";
import { notFound } from "next/navigation";
import { FormProduto } from "@/componentes/painel/FormProduto";
import { Avisos, Titulo } from "@/componentes/painel/Avisos";
import { obterProdutoAdmin, opcoesFormulario } from "@/lib/admin-dados";
import { exigirUsuario, pode } from "@/lib/auth";
import { formatarDataHora } from "@/lib/precos";
import { duplicarProduto, excluirProduto } from "../../../acoes";

export const metadata = { title: "Editar produto" };

export default async function EditarProduto({ params, searchParams }: PageProps<"/admin/produtos/[id]">) {
  const u = await exigirUsuario("produtos.editar");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [p, opcoes, sp] = await Promise.all([obterProdutoAdmin(id), opcoesFormulario(), searchParams]);
  if (!p) notFound();
  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/produtos" className="text-sm text-tinta-suave hover:underline">← Produtos</Link>
      <Titulo acoes={
        <div className="flex gap-2">
          {p.status === "ativo" ? <Link href={`/produto/${p.slug}`} target="_blank" className="rounded-md border border-linha bg-superficie px-3 py-2 text-sm font-semibold">Ver no site ↗</Link> : null}
          <form action={duplicarProduto.bind(null, p.id)}><button className="rounded-md border border-linha bg-superficie px-3 py-2 text-sm font-semibold">Duplicar</button></form>
        </div>
      }>Editar produto</Titulo>
      <Avisos sp={sp} />
      <p className="text-xs text-tinta-suave">Nº {p.id} · cadastrado em {formatarDataHora(p.criadoEm)} · última atualização em {formatarDataHora(p.atualizadoEm)} · origem: {p.origemCadastro}</p>
      <FormProduto opcoes={opcoes} produto={p} />
      {pode(u, "produtos.excluir") ? (
        <details className="rounded-cartao border border-rosa/30 bg-superficie p-4">
          <summary className="cursor-pointer text-sm font-semibold text-rosa-escuro">Excluir produto</summary>
          <form action={excluirProduto} className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <input type="hidden" name="id" value={p.id} />
            <label className="flex items-center gap-2"><input type="checkbox" name="confirmar" value="sim" required /> Entendo que a exclusão não pode ser desfeita e que os cliques ficam sem produto.</label>
            <button className="rounded-md bg-rosa px-4 py-2 font-bold text-white">Excluir definitivamente</button>
          </form>
          <p className="mt-2 text-xs text-tinta-suave">Se quiser só tirar do site, use o status Inativo.</p>
        </details>
      ) : null}
    </div>
  );
}
