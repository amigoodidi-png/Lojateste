import { exigirUsuario } from "@/lib/auth";
import { modeloCsv } from "@/lib/importacao/planilha";

/** Planilha-modelo para a importação, com a linha de títulos e um exemplo. */
export async function GET() {
  await exigirUsuario("produtos.importar");
  return new Response(modeloCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-importacao-olha-o-achado.csv"',
      "Cache-Control": "no-store",
    },
  });
}
