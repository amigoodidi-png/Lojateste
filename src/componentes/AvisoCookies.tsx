"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const semAssinatura = () => () => {};

const UM_ANO = 60 * 60 * 24 * 365;

export function AvisoCookies() {
  // No servidor, considera que já escolheu (não mostra); no navegador, lê o cookie.
  const jaEscolheu = useSyncExternalStore(semAssinatura, () => /(?:^|;\s*)consentimento=/.test(document.cookie), () => true);
  const [fechado, setFechado] = useState(false);
  if (jaEscolheu || fechado) return null;
  const escolher = (valor: "medicao" | "essenciais") => {
    document.cookie = `consentimento=${valor}; Max-Age=${UM_ANO}; Path=/; SameSite=Lax`;
    setFechado(true);
  };
  return (
    <div role="dialog" aria-label="Aviso de cookies" className="fixed inset-x-0 bottom-0 z-40 border-t border-linha bg-superficie pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-6px_24px_-12px_rgba(18,20,58,.3)]">
      <div className="container-site flex flex-col gap-3 py-4 md:flex-row md:items-center">
        <p className="flex-1 text-sm text-tinta-suave">
          Usamos cookies essenciais para o site funcionar. Com a sua permissão, também medimos de onde vêm as visitas para melhorar as ofertas. <Link href="/cookies" className="font-semibold text-azul underline">Saiba mais</Link>
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => escolher("essenciais")} className="rounded-md border border-linha px-4 py-2 text-sm font-semibold hover:bg-fundo">Só essenciais</button>
          <button type="button" onClick={() => escolher("medicao")} className="rounded-md bg-azul px-4 py-2 text-sm font-semibold text-white hover:bg-azul-escuro">Aceitar medição</button>
        </div>
      </div>
    </div>
  );
}
