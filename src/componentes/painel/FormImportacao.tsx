"use client";
import { startTransition, useActionState, useState } from "react";
import { buscarNaShopee, enviarPlanilha } from "@/app/(painel)/admin/acoes-importacao";

const campo = "w-full min-w-0 rounded-md border border-linha bg-superficie px-3 py-2 text-sm focus:border-azul focus:outline-none";
const rotulo = "grid gap-1 text-sm font-semibold";
const ajuda = "text-xs font-normal text-tinta-suave";
const botao = "rounded-md bg-azul px-4 py-2.5 text-sm font-bold text-white hover:bg-azul-escuro disabled:opacity-60";

function Erro({ texto }: { texto?: string }) {
  return texto ? <p role="alert" className="rounded-md bg-rosa/10 px-3 py-2 text-sm text-rosa-escuro">{texto}</p> : null;
}

export function FormPlanilha({ plataformas }: { plataformas: { id: number; nome: string }[] }) {
  // onSubmit em vez de action={…}: o React não limpa o arquivo escolhido quando volta um erro.
  const [estado, acao, enviando] = useActionState(enviarPlanilha, undefined);
  const [colar, setColar] = useState(false);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); const dados = new FormData(e.currentTarget); startTransition(() => acao(dados)); }}
      className="grid gap-4"
    >
      {colar ? (
        <label className={rotulo}>Conteúdo da planilha
          <textarea id="colado" name="colado" rows={6} className={`${campo} font-mono text-xs`} placeholder={"nome;loja;link_afiliado;preco_atual\n…"} />
          <span className={ajuda}>Selecione as células no Excel ou no Google Planilhas, copie e cole aqui, com a linha de títulos.</span>
        </label>
      ) : (
        <label className={rotulo}>Arquivo CSV
          <input id="arquivo" name="arquivo" type="file" accept=".csv,.txt,.tsv,text/csv" className={`${campo} file:mr-3 file:rounded file:border-0 file:bg-fundo file:px-3 file:py-1 file:text-sm file:font-semibold`} />
          <span className={ajuda}>No Excel ou Google Planilhas: Arquivo › Salvar como (ou Fazer download) › CSV. Até 2 MB e 2.000 produtos.</span>
        </label>
      )}
      <button type="button" onClick={() => setColar(!colar)} className="justify-self-start text-xs font-semibold text-azul hover:underline">
        {colar ? "Prefiro enviar o arquivo" : "Prefiro copiar e colar da planilha"}
      </button>
      <label className={rotulo}>Loja dos produtos
        <select id="plataformaId" name="plataformaId" defaultValue={estado?.campos?.plataformaId ?? ""} className={campo}>
          <option value="">A planilha tem a coluna &quot;loja&quot;</option>
          {plataformas.map((p) => <option key={p.id} value={p.id}>Todos são da {p.nome}</option>)}
        </select>
      </label>
      <Erro texto={estado?.erro} />
      <button disabled={enviando} className={`${botao} justify-self-start`}>{enviando ? "Lendo a planilha…" : "Ver prévia"}</button>
      <p className={ajuda}>Nada é gravado agora. Primeiro você vê a prévia de cada linha e só depois confirma.</p>
    </form>
  );
}

export function FormBuscaShopee() {
  const [estado, acao, enviando] = useActionState(buscarNaShopee, undefined);
  const c = estado?.campos;
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); const dados = new FormData(e.currentTarget); startTransition(() => acao(dados)); }}
      className="grid gap-4"
    >
      <label className={rotulo}>Buscar na Shopee
        <input id="busca" name="busca" required defaultValue={c?.busca ?? ""} placeholder="fone bluetooth, um link de produto ou o código do item" className={campo} />
        <span className={ajuda}>Com um link ou código, traz aquele produto. Com palavras, traz uma lista para você escolher.</span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={rotulo}>Ordenar por
          <select id="ordem" name="ordem" defaultValue={c?.ordem ?? "2"} className={campo}>
            <option value="1">Mais relevantes</option>
            <option value="2">Mais vendidos</option>
            <option value="5">Maior comissão</option>
            <option value="4">Menor preço</option>
            <option value="3">Maior preço</option>
          </select>
        </label>
        <label className={rotulo}>Quantidade
          <select id="quantidade" name="quantidade" defaultValue={c?.quantidade ?? "20"} className={campo}>
            <option value="10">10 produtos</option>
            <option value="20">20 produtos</option>
            <option value="50">50 produtos</option>
          </select>
        </label>
      </div>
      <Erro texto={estado?.erro} />
      <button disabled={enviando} className={`${botao} justify-self-start`}>{enviando ? "Consultando a Shopee…" : "Buscar e ver prévia"}</button>
    </form>
  );
}
