import type { MetadataRoute } from "next";
import { listarCategorias, listarSlugsProdutos } from "@/lib/catalogo";
import { SITE } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixas = ["", "/produtos", "/categorias", "/ofertas", "/destaques", "/mais-acessados", "/sobre", "/contato", "/privacidade", "/cookies", "/aviso-de-afiliados"];
  const [produtos, categorias] = await Promise.all([listarSlugsProdutos(), listarCategorias()]);
  return [
    ...fixas.map((p) => ({ url: `${SITE.url}${p}` })),
    ...categorias.map((c) => ({ url: `${SITE.url}/categoria/${c.slug}` })),
    ...produtos.map((p) => ({ url: `${SITE.url}/produto/${p.slug}`, lastModified: p.atualizadoEm })),
  ];
}
