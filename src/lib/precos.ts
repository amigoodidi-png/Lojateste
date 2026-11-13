/** Quantas horas um preço conferido continua valendo para mostrar desconto. */
export const VALIDADE_PRECO_HORAS = 48;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarPreco(valor: number | string | null | undefined): string {
  if (valor == null || valor === "") return "";
  return brl.format(Number(valor));
}

export function precoRecente(verificadoEm: Date | null | undefined, agora = new Date()): boolean {
  if (!verificadoEm) return false;
  return agora.getTime() - verificadoEm.getTime() <= VALIDADE_PRECO_HORAS * 3600 * 1000;
}

/**
 * Percentual de desconto que pode ser exibido. Devolve null quando o desconto não é confiável:
 * sem preço anterior, preço anterior menor ou igual ao atual, ou preço não conferido recentemente.
 */
export function descontoConfirmado(p: {
  precoAtual: string | number | null;
  precoAnterior: string | number | null;
  precoVerificadoEm: Date | null;
}, agora = new Date()): number | null {
  const atual = Number(p.precoAtual);
  const anterior = Number(p.precoAnterior);
  if (!p.precoAtual || !p.precoAnterior || !(atual > 0) || !(anterior > atual)) return null;
  if (!precoRecente(p.precoVerificadoEm, agora)) return null;
  const pct = Math.round((1 - atual / anterior) * 100);
  return pct >= 1 ? pct : null;
}

export function formatarDataHora(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}
