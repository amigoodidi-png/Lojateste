import { AvisoCookies } from "@/componentes/AvisoCookies";
import { Cabecalho } from "@/componentes/Cabecalho";
import { Rodape } from "@/componentes/Rodape";

export default function LayoutLoja({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Pular para o conteúdo</a>
      <Cabecalho />
      <main id="conteudo" className="flex-1">{children}</main>
      <Rodape />
      <AvisoCookies />
    </>
  );
}
