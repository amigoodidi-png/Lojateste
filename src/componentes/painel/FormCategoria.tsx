"use client";
import { startTransition, useActionState } from "react";
import { salvarCategoria } from "@/app/(painel)/admin/acoes";

type Cat = { id: number; nome: string; descricao: string | null; paiId: number | null; ordem: number; ativa: boolean };

export function FormCategoria({ categoria, principais }: { categoria?: Cat; principais: { id: number; nome: string }[] }) {
  // onSubmit em vez de action={…}: assim o React não limpa o formulário quando a validação devolve um erro.
  const [estado, acao, enviando] = useActionState(salvarCategoria, undefined);
  const c = estado?.campos;
  const campo = "w-full min-w-0 rounded-md border border-linha bg-superficie px-3 py-2 text-sm";
  const sufixo = categoria?.id ?? "nova";
  return (
    <form onSubmit={(e) => { e.preventDefault(); const dados = new FormData(e.currentTarget); startTransition(() => acao(dados)); }} className="grid gap-3 sm:grid-cols-[2fr_1.4fr_.6fr] sm:items-end">
      {categoria ? <input type="hidden" name="id" value={categoria.id} /> : null}
      <label className="grid gap-1 text-xs font-semibold text-tinta-suave">Nome
        <input id={`cat-nome-${sufixo}`} name="nome" required maxLength={80} defaultValue={c?.nome ?? categoria?.nome} className={campo} />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-tinta-suave">Fica dentro de
        <select id={`cat-pai-${sufixo}`} name="paiId" defaultValue={c?.paiId ?? (categoria?.paiId ? String(categoria.paiId) : "")} className={campo}>
          <option value="">Nenhuma (categoria principal)</option>
          {principais.filter((p) => p.id !== categoria?.id).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold text-tinta-suave">Ordem
        <input id={`cat-ordem-${sufixo}`} name="ordem" type="number" min={0} max={9999} defaultValue={c?.ordem ?? categoria?.ordem ?? 0} className={campo} />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-tinta-suave sm:col-span-2">Descrição (aparece na página da categoria)
        <input id={`cat-desc-${sufixo}`} name="descricao" maxLength={300} defaultValue={c?.descricao ?? categoria?.descricao ?? ""} className={campo} />
      </label>
      <div className="flex items-center gap-3">
        {categoria ? <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="ativa" defaultChecked={categoria.ativa} /> Ativa</label> : null}
        <button disabled={enviando} className="rounded-md bg-azul px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{categoria ? "Salvar" : "Criar"}</button>
      </div>
      {estado?.erro ? <p role="alert" className="text-sm text-rosa-escuro sm:col-span-3">{estado.erro}</p> : null}
    </form>
  );
}
