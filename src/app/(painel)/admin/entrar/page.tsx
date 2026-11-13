import { Simbolo } from "@/componentes/Logo";
import { FormLogin } from "@/componentes/painel/FormLogin";

export const metadata = { title: "Entrar" };

export default function Entrar() {
  return (
    <div className="grid flex-1 place-items-center px-4 py-12">
      <div className="w-full max-w-sm rounded-cartao border border-linha bg-superficie p-7 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Simbolo tamanho={30} />
          <div>
            <p className="font-display text-base leading-none font-extrabold">olha o achado!</p>
            <p className="text-xs text-tinta-suave">Painel administrativo</p>
          </div>
        </div>
        <FormLogin />
      </div>
    </div>
  );
}
