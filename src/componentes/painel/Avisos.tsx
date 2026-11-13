const MENSAGENS: Record<string, string> = {
  "ok:criado": "Produto criado.",
  "ok:salvo": "Produto salvo.",
  "ok:duplicado": "Cópia criada como rascunho. Revise e publique quando quiser.",
  "ok:ativado": "Produto publicado no site.",
  "ok:desativado": "Produto retirado do site.",
  "ok:excluido": "Produto excluído.",
  "ok:lote": "Alteração aplicada aos produtos selecionados.",
  "ok:criada": "Categoria criada.",
  "ok:salva": "Categoria salva.",
  "ok:excluida": "Categoria excluída.",
  "ok:importado": "Importação concluída. Confira o resultado de cada linha abaixo.",
  "ok:cancelada": "Importação cancelada. Nenhum produto foi alterado.",
  "erro:importacao-processada": "Esta importação já foi confirmada ou cancelada.",
  "erro:importacao-nao-encontrada": "Importação não encontrada.",
  "erro:nao-encontrado": "Produto não encontrado.",
  "erro:incompleto": "Para publicar, o produto precisa ter preço atual e link de afiliado. Edite o produto e preencha.",
  "erro:confirmar-exclusao": "Marque a confirmação antes de excluir.",
  "erro:nada-selecionado": "Selecione ao menos um produto.",
  "erro:acao-invalida": "Escolha uma ação.",
  "erro:em-uso": "Esta categoria tem produtos. Mude os produtos de categoria antes de excluir, ou desative a categoria.",
  "erro:tem-subcategorias": "Exclua ou mova as subcategorias primeiro.",
  "erro:sem-permissao": "Seu usuário não tem permissão para essa ação.",
};

export function Avisos({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const ok = typeof sp.ok === "string" ? MENSAGENS[`ok:${sp.ok}`] : undefined;
  const erro = typeof sp.erro === "string" ? MENSAGENS[`erro:${sp.erro}`] : undefined;
  if (!ok && !erro) return null;
  return (
    <p role="status" className={`rounded-md px-4 py-3 text-sm font-medium ${erro ? "bg-rosa/10 text-rosa-escuro" : "bg-sucesso/10 text-sucesso"}`}>
      {erro ?? ok}
    </p>
  );
}

export function Titulo({ children, acoes }: { children: React.ReactNode; acoes?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-xl font-extrabold sm:text-2xl">{children}</h1>
      {acoes}
    </div>
  );
}
