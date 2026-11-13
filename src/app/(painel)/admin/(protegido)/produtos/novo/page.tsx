import Link from "next/link";
import { FormProduto } from "@/componentes/painel/FormProduto";
import { Titulo } from "@/componentes/painel/Avisos";
import { opcoesFormulario } from "@/lib/admin-dados";
import { exigirUsuario } from "@/lib/auth";

export const metadata = { title: "Novo produto" };

export default async function NovoProduto() {
  await exigirUsuario("produtos.editar");
  const opcoes = await opcoesFormulario();
  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/produtos" className="text-sm text-tinta-suave hover:underline">← Produtos</Link>
      <Titulo>Novo produto</Titulo>
      <FormProduto opcoes={opcoes} />
    </div>
  );
}
