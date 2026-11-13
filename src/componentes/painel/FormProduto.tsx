"use client";
import { startTransition, useActionState, useState } from "react";
import { salvarProduto } from "@/app/(painel)/admin/acoes";

type Opcoes = {
  plataformas: { id: number; nome: string }[];
  categorias: { id: number; nome: string; paiId: number | null }[];
};
type Produto = {
  id: number; nome: string; descricao: string | null; plataformaId: number; categoriaId: number | null; subcategoriaId: number | null;
  linkOriginal: string | null; linkAfiliado: string | null; idNaPlataforma: string | null; status: string; destaque: boolean;
  precoAtual: string | null; precoAnterior: string | null; precoVerificadoEm: Date | null; ofertaValidaAte: Date | null;
  imagens: { url: string }[];
};

const paraTexto = (v: string | null) => (v ? v.replace(".", ",") : "");
const numero = (v: string) => {
  const s = v.trim().replace(/[R$\s]/g, "");
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return s && Number.isFinite(n) ? n : null;
};
/** Data no fuso de São Paulo no formato do campo datetime-local. */
const paraCampoData = (d: Date | null) => {
  if (!d) return "";
  const sp = new Date(new Date(d).getTime() - 3 * 3600_000);
  return sp.toISOString().slice(0, 16);
};

export function FormProduto({ opcoes, produto }: { opcoes: Opcoes; produto?: Produto }) {
  // onSubmit em vez de action={…}: assim o React não limpa o formulário quando a validação devolve um erro.
  const [estado, acao, enviando] = useActionState(salvarProduto, undefined);
  const c = estado?.campos;
  const v = (campo: string, padrao: string) => c?.[campo] ?? padrao;

  const [categoria, setCategoria] = useState(v("categoriaId", produto?.categoriaId ? String(produto.categoriaId) : ""));
  const [precoAtual, setPrecoAtual] = useState(v("precoAtual", paraTexto(produto?.precoAtual ?? null)));
  const [precoAnterior, setPrecoAnterior] = useState(v("precoAnterior", paraTexto(produto?.precoAnterior ?? null)));
  const [imagens, setImagens] = useState(v("imagens", produto?.imagens.map((i) => i.url).join("\n") ?? ""));

  const principais = opcoes.categorias.filter((x) => !x.paiId);
  const subs = opcoes.categorias.filter((x) => x.paiId && String(x.paiId) === categoria);
  const atual = numero(precoAtual);
  const anterior = numero(precoAnterior);
  const desconto = atual && anterior && anterior > atual ? Math.round((1 - atual / anterior) * 100) : null;
  const urls = imagens.split(/\r?\n/).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s));

  const campo = "w-full min-w-0 rounded-md border border-linha bg-superficie px-3 py-2 text-sm focus:border-azul focus:outline-none";
  const rotulo = "grid gap-1 text-sm font-semibold";
  const ajuda = "text-xs font-normal text-tinta-suave";
  const bloco = "grid gap-4 rounded-cartao border border-linha bg-superficie p-5";

  return (
    <form onSubmit={(e) => { e.preventDefault(); const dados = new FormData(e.currentTarget); startTransition(() => acao(dados)); }} className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
      {produto ? <input type="hidden" name="id" value={produto.id} /> : null}
      <div className="grid gap-5">
        <section className={bloco}>
          <h2 className="font-display text-base font-bold">Informações</h2>
          <label className={rotulo}>Nome do produto
            <input id="nome" name="nome" required maxLength={200} defaultValue={v("nome", produto?.nome ?? "")} className={campo} />
          </label>
          <label className={rotulo}>Descrição
            <textarea id="descricao" name="descricao" rows={6} maxLength={5000} defaultValue={v("descricao", produto?.descricao ?? "")} className={campo} />
            <span className={ajuda}>Escreva com suas palavras. Evite copiar textos longos da loja.</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={rotulo}>Categoria
              <select id="categoriaId" name="categoriaId" value={categoria} onChange={(e) => setCategoria(e.target.value)} className={campo}>
                <option value="">Sem categoria</option>
                {principais.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
              </select>
            </label>
            <label className={rotulo}>Subcategoria
              <select id="subcategoriaId" name="subcategoriaId" key={categoria} defaultValue={v("subcategoriaId", produto?.subcategoriaId ? String(produto.subcategoriaId) : "")} className={campo} disabled={!subs.length}>
                <option value="">{subs.length ? "Nenhuma" : "Sem subcategorias"}</option>
                {subs.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className={bloco}>
          <h2 className="font-display text-base font-bold">Loja e links</h2>
          <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
            <label className={rotulo}>Loja de origem
              <select id="plataformaId" name="plataformaId" required defaultValue={v("plataformaId", produto ? String(produto.plataformaId) : "")} className={campo}>
                <option value="" disabled>Escolha…</option>
                {opcoes.plataformas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
            <label className={rotulo}>Código do produto na loja
              <input id="idNaPlataforma" name="idNaPlataforma" maxLength={120} defaultValue={v("idNaPlataforma", produto?.idNaPlataforma ?? "")} className={campo} />
              <span className={ajuda}>Opcional. Evita cadastrar o mesmo produto duas vezes.</span>
            </label>
          </div>
          <label className={rotulo}>Link de afiliado
            <input id="linkAfiliado" name="linkAfiliado" type="url" inputMode="url" placeholder="https://" defaultValue={v("linkAfiliado", produto?.linkAfiliado ?? "")} className={campo} />
            <span className={ajuda}>O link gerado no painel de afiliados da loja. É para ele que o botão COMPRAR AGORA leva.</span>
          </label>
          <label className={rotulo}>Link original do produto
            <input id="linkOriginal" name="linkOriginal" type="url" inputMode="url" placeholder="https://" defaultValue={v("linkOriginal", produto?.linkOriginal ?? "")} className={campo} />
          </label>
        </section>

        <section className={bloco}>
          <h2 className="font-display text-base font-bold">Imagens</h2>
          <label className={rotulo}>Endereços das imagens, um por linha
            <textarea id="imagens" name="imagens" rows={4} value={imagens} onChange={(e) => setImagens(e.target.value)} placeholder="https://…/foto-1.jpg" className={`${campo} font-mono text-xs`} />
            <span className={ajuda}>A primeira é a imagem principal. Use só imagens autorizadas pelo programa de afiliados ou fotos suas. O envio de arquivos do computador chega numa próxima etapa.</span>
          </label>
          {urls.length ? (
            <div className="flex flex-wrap gap-2">
              {urls.map((u, i) => (
                <figure key={`${u}-${i}`} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="size-20 rounded border border-linha bg-fundo object-contain" />
                  {i === 0 ? <figcaption className="absolute bottom-1 left-1 rounded bg-azul px-1 text-[10px] font-bold text-white">principal</figcaption> : null}
                </figure>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <div className="grid gap-5 lg:sticky lg:top-4">
        <section className={bloco}>
          <h2 className="font-display text-base font-bold">Preço</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className={rotulo}>Preço atual (R$)
              <input id="precoAtual" name="precoAtual" inputMode="decimal" placeholder="89,90" value={precoAtual} onChange={(e) => setPrecoAtual(e.target.value)} className={`${campo} tabular-nums`} />
            </label>
            <label className={rotulo}>Preço anterior (R$)
              <input id="precoAnterior" name="precoAnterior" inputMode="decimal" placeholder="129,90" value={precoAnterior} onChange={(e) => setPrecoAnterior(e.target.value)} className={`${campo} tabular-nums`} />
            </label>
          </div>
          <p className="text-sm">
            {desconto ? <>Desconto: <strong className="text-rosa-escuro">{desconto}%</strong></> : anterior && atual && anterior <= atual ? <span className="text-alerta">O preço anterior precisa ser maior que o atual.</span> : <span className="text-tinta-suave">Sem desconto (preço anterior em branco).</span>}
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="precoConferido" defaultChecked className="mt-1" />
            <span>Conferi este preço na loja agora<span className="block text-xs text-tinta-suave">O desconto só aparece no site por 48 horas depois da conferência.</span></span>
          </label>
          <label className={rotulo}>Oferta válida até
            <input id="ofertaValidaAte" name="ofertaValidaAte" type="datetime-local" defaultValue={v("ofertaValidaAte", paraCampoData(produto?.ofertaValidaAte ?? null))} className={campo} />
            <span className={ajuda}>Opcional, horário de Brasília. Depois disso o produto sai das ofertas.</span>
          </label>
        </section>

        <section className={bloco}>
          <h2 className="font-display text-base font-bold">Publicação</h2>
          <label className={rotulo}>Status
            <select id="status" name="status" defaultValue={v("status", produto?.status ?? "rascunho")} className={campo}>
              <option value="rascunho">Rascunho (não aparece no site)</option>
              <option value="ativo">Ativo (aparece no site)</option>
              <option value="inativo">Inativo (fora do site)</option>
              <option value="indisponivel">Indisponível na loja</option>
              <option value="revisar_preco">Revisar preço</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="destaque" defaultChecked={c ? c.destaque === "on" : produto?.destaque} /> Produto em destaque</label>
          {estado?.erro ? <p role="alert" className="rounded-md bg-rosa/10 px-3 py-2 text-sm text-rosa-escuro">{estado.erro}</p> : null}
          <button disabled={enviando} className="rounded-md bg-azul px-4 py-3 text-sm font-bold text-white hover:bg-azul-escuro disabled:opacity-60">
            {enviando ? "Salvando…" : produto ? "Salvar alterações" : "Cadastrar produto"}
          </button>
        </section>
      </div>
    </form>
  );
}
