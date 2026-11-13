import type { Filtros, Ordem } from "./catalogo";

export type ParametrosBusca = Record<string, string | string[] | undefined>;

const ORDENS: Ordem[] = ["relevancia", "menor-preco", "maior-preco", "novidades", "populares"];

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const numero = (v: string | undefined) => {
  if (!v) return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function lerFiltros(sp: ParametrosBusca): Filtros {
  const ordem = um(sp.ordem) as Ordem | undefined;
  return {
    busca: um(sp.q)?.slice(0, 80),
    categoria: um(sp.categoria),
    plataforma: um(sp.plataforma),
    precoMin: numero(um(sp.min)),
    precoMax: numero(um(sp.max)),
    ordem: ordem && ORDENS.includes(ordem) ? ordem : undefined,
    pagina: Math.max(1, Math.floor(numero(um(sp.pagina)) ?? 1)),
  };
}

export function montarQuery(base: ParametrosBusca, mudar: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) { const s = um(v); if (s) q.set(k, s); }
  for (const [k, v] of Object.entries(mudar)) { if (v) q.set(k, v); else q.delete(k); }
  const s = q.toString();
  return s ? `?${s}` : "";
}
