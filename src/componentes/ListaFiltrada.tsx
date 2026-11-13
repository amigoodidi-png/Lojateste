import { GradeProdutos } from "./CartaoProduto";
import { EstadoVazio } from "./Secao";
import { PainelFiltros, Paginacao } from "./Filtros";
import { listarCategorias, listarPlataformas, listarProdutos, type Filtros } from "@/lib/catalogo";
import { lerFiltros, montarQuery, type ParametrosBusca } from "@/lib/filtros";

const POR_PAGINA = 24;

/** Lista de produtos com filtros e paginação. `fixos` são filtros da própria página (ex.: só ofertas). */
export async function ListaFiltrada({ acao, searchParams, fixos = {}, ocultar, vazio }: {
  acao: string;
  searchParams: Promise<ParametrosBusca>;
  fixos?: Partial<Filtros>;
  ocultar?: ("categoria" | "plataforma")[];
  vazio: { titulo: string; texto: string };
}) {
  const sp = await searchParams;
  const f = { ...lerFiltros(sp), ...fixos, porPagina: POR_PAGINA };
  const [{ itens, total }, categorias, plataformas] = await Promise.all([listarProdutos(f), listarCategorias(), listarPlataformas()]);
  const filtrando = Boolean(f.busca || (f.categoria && !fixos.categoria) || (f.plataforma && !fixos.plataforma) || f.precoMin != null || f.precoMax != null);
  return (
    <div className="flex flex-col gap-5">
      <PainelFiltros acao={acao} f={f} categorias={categorias.filter((c) => !c.paiId)} plataformas={plataformas} ocultar={ocultar} />
      <p className="text-sm text-tinta-suave" aria-live="polite">
        {total === 1 ? "1 produto encontrado" : `${total.toLocaleString("pt-BR")} produtos encontrados`}
        {f.busca ? <> para “{f.busca}”</> : null}
      </p>
      {itens.length ? <GradeProdutos itens={itens} /> : (
        <EstadoVazio titulo={filtrando ? "Nenhum produto com esses filtros" : vazio.titulo}>
          {filtrando ? "Tente outra palavra ou remova algum filtro." : vazio.texto}
        </EstadoVazio>
      )}
      <Paginacao pagina={f.pagina ?? 1} total={total} porPagina={POR_PAGINA} hrefPagina={(n) => acao + montarQuery(sp, { pagina: n > 1 ? String(n) : undefined })} />
    </div>
  );
}

export function CarregandoLista() {
  return <div className="h-64 animate-pulse rounded-cartao bg-superficie" aria-label="Carregando produtos" />;
}
