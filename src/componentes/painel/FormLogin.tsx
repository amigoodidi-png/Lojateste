"use client";
import { useActionState } from "react";
import { acaoEntrar } from "@/app/(painel)/admin/acoes";

export function FormLogin() {
  const [estado, acao, enviando] = useActionState(acaoEntrar, undefined);
  const campo = "w-full rounded-md border border-linha px-3 py-2.5 text-sm focus:border-azul focus:outline-none";
  return (
    <form action={acao} className="grid gap-4">
      <label className="grid gap-1 text-sm font-semibold">E-mail
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={estado?.campos?.email} className={campo} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">Senha
        <input id="senha" name="senha" type="password" autoComplete="current-password" required className={campo} />
      </label>
      {estado?.erro ? <p role="alert" className="rounded-md bg-rosa/10 px-3 py-2 text-sm text-rosa-escuro">{estado.erro}</p> : null}
      <button disabled={enviando} className="rounded-md bg-azul px-4 py-2.5 text-sm font-bold text-white hover:bg-azul-escuro disabled:opacity-60">
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
