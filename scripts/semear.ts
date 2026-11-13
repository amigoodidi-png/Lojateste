/**
 * Cadastra as plataformas e as categorias iniciais. Pode rodar mais de uma vez sem duplicar.
 * Uso: npm run db:semear
 * Com --exemplos, cria também produtos de EXEMPLO para testar o layout no seu PC.
 * Eles ficam com "[EXEMPLO]" no nome e nunca devem ir para o site publicado.
 */
import { sql } from "drizzle-orm";
import { db, schema } from "../src/db";

const { plataformas, categorias, produtos, produtoImagens } = schema;

async function main() {
  if (!db) throw new Error("Defina DATABASE_URL no arquivo .env.local antes de rodar.");

  await db.insert(plataformas).values([
    { slug: "shopee", nome: "Shopee", corDestaque: "#EE4D2D", statusIntegracao: "nao_configurada", observacaoIntegracao: "API oficial de afiliados disponível (Shopee Affiliate Open API). Precisa de App ID e chave no portal de afiliados." },
    { slug: "mercado-livre", nome: "Mercado Livre", corDestaque: "#FFE600", statusIntegracao: "indisponivel", observacaoIntegracao: "Sem API oficial de afiliados. Cadastre o link gerado no portal de afiliados ou importe por planilha." },
    { slug: "temu", nome: "Temu", corDestaque: "#FB7701", statusIntegracao: "indisponivel", observacaoIntegracao: "Sem API pública de afiliados confirmada. Cadastro manual ou por planilha." },
  ]).onConflictDoNothing({ target: plataformas.slug });

  const principais = [
    ["casa-e-cozinha", "Casa e cozinha"], ["eletronicos", "Eletrônicos"], ["celulares-e-acessorios", "Celulares e acessórios"],
    ["moda", "Moda"], ["beleza-e-cuidados", "Beleza e cuidados"], ["esporte-e-lazer", "Esporte e lazer"],
    ["bebes-e-criancas", "Bebês e crianças"], ["pets", "Pets"], ["ferramentas", "Ferramentas"], ["games", "Games"],
  ];
  await db.insert(categorias).values(principais.map(([slug, nome], i) => ({ slug, nome, ordem: i })))
    .onConflictDoNothing({ target: categorias.slug });

  if (process.argv.includes("--exemplos")) {
    const ps = await db.select().from(plataformas);
    const cs = await db.select().from(categorias);
    const p = (s: string) => ps.find((x) => x.slug === s)!.id;
    const c = (s: string) => cs.find((x) => x.slug === s)!.id;
    const agora = new Date();
    const exemplos = [
      { nome: "[EXEMPLO] Fone sem fio com estojo", preco: "87.90", antes: "129.90", plat: "shopee", cat: "eletronicos", destaque: true },
      { nome: "[EXEMPLO] Air fryer 4 litros", preco: "327.00", antes: "399.00", plat: "mercado-livre", cat: "casa-e-cozinha", destaque: true },
      { nome: "[EXEMPLO] Tênis de corrida leve", preco: "74.90", antes: null, plat: "temu", cat: "esporte-e-lazer", destaque: false },
      { nome: "[EXEMPLO] Capinha transparente reforçada", preco: "19.90", antes: "34.90", plat: "shopee", cat: "celulares-e-acessorios", destaque: false },
      { nome: "[EXEMPLO] Kit organizador de gaveta", preco: "45.00", antes: null, plat: "mercado-livre", cat: "casa-e-cozinha", destaque: false },
    ];
    for (const [i, e] of exemplos.entries()) {
      const slug = `exemplo-${i + 1}`;
      const [novo] = await db.insert(produtos).values({
        slug, nome: e.nome, descricao: "Produto de exemplo, só para testar o layout no computador. Não é uma oferta real.",
        precoAtual: e.preco, precoAnterior: e.antes, precoVerificadoEm: agora, plataformaId: p(e.plat), categoriaId: c(e.cat),
        linkAfiliado: "https://example.com/", status: "ativo", destaque: e.destaque, origemCadastro: "exemplo",
      }).onConflictDoNothing({ target: produtos.slug }).returning({ id: produtos.id });
      if (novo) {
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><rect width='400' height='400' fill='#E6E8FF'/><text x='200' y='210' font-family='sans-serif' font-size='28' text-anchor='middle' fill='#2E3CF0'>EXEMPLO ${i + 1}</text></svg>`;
        await db.insert(produtoImagens).values({ produtoId: novo.id, url: `data:image/svg+xml,${encodeURIComponent(svg)}`, principal: true, origem: "upload" });
      }
    }
    console.log("Produtos de exemplo criados. Para apagar: npm run db:limpar-exemplos");
  }

  if (process.argv.includes("--limpar-exemplos")) {
    await db.execute(sql`delete from produtos where origem_cadastro = 'exemplo'`);
    console.log("Produtos de exemplo apagados.");
  }

  console.log("Pronto.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
