/** Como cada situação de importação aparece no painel. */
export const ROTULO_IMPORTACAO: Record<string, { texto: string; cor: string }> = {
  aguardando_confirmacao: { texto: "Aguardando confirmação", cor: "bg-alerta/15 text-alerta" },
  em_andamento: { texto: "Gravando…", cor: "bg-azul/10 text-azul" },
  concluida: { texto: "Concluída", cor: "bg-sucesso/10 text-sucesso" },
  com_erros: { texto: "Concluída com erros", cor: "bg-rosa/10 text-rosa-escuro" },
  falhou: { texto: "Falhou", cor: "bg-rosa/10 text-rosa-escuro" },
  cancelada: { texto: "Cancelada", cor: "bg-fundo text-tinta-suave" },
};

/** Como cada linha aparece na prévia e no resultado. */
export const ROTULO_ITEM: Record<string, { texto: string; cor: string }> = {
  novo: { texto: "Novo", cor: "bg-azul/10 text-azul" },
  atualizar: { texto: "Atualizar", cor: "bg-alerta/15 text-alerta" },
  ignorar: { texto: "Ignorar", cor: "bg-fundo text-tinta-suave" },
  erro: { texto: "Erro", cor: "bg-rosa/10 text-rosa-escuro" },
  criado: { texto: "Criado", cor: "bg-sucesso/10 text-sucesso" },
  atualizado: { texto: "Atualizado", cor: "bg-sucesso/10 text-sucesso" },
  ignorado: { texto: "Ignorado", cor: "bg-fundo text-tinta-suave" },
};
