# Olha o Achado

Marketplace de afiliados: reúne achados da Shopee, do Mercado Livre, da Temu e de outras lojas. Não tem estoque, carrinho nem checkout. O botão **COMPRAR AGORA** registra o clique e leva o visitante ao link de afiliado na loja de origem.

Tecnologias: Next.js 16 (React, TypeScript), Tailwind CSS 4, PostgreSQL (Supabase) com Drizzle ORM.

## Rodar no seu computador (Windows)

Você só faz isso uma vez.

1. Instale o **Node.js 22 LTS**: https://nodejs.org (opção "LTS").
2. Instale o **Docker Desktop**: https://www.docker.com/products/docker-desktop e deixe-o aberto. Ele roda o banco de dados no seu PC.
3. Instale o **Git**: https://git-scm.com e baixe o projeto:
   ```
   git clone https://github.com/amigoodidi-png/olha-o-achado.git
   cd olha-o-achado
   npm install
   ```
4. Ligue o banco local do Supabase (a primeira vez demora alguns minutos):
   ```
   npx supabase init
   npx supabase start
   ```
   No fim, ele mostra o "DB URL". O padrão é `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
5. Copie o arquivo de configuração e crie as tabelas:
   ```
   copy .env.example .env.local
   npm run db:migrar
   npm run db:semear
   ```
6. (Opcional) Crie 5 produtos de **exemplo** só para ver o layout:
   ```
   npm run db:exemplos
   ```
   Eles aparecem com "[EXEMPLO]" no nome. Para apagar: `npm run db:limpar-exemplos`.
7. Crie o seu usuário do painel (a senha é pedida no terminal e não aparece na tela):
   ```
   npm run admin:criar -- seu@email.com "Seu Nome"
   ```
8. Abra o site:
   ```
   npm run dev
   ```
   e acesse http://localhost:3000 (site) ou http://localhost:3000/admin (painel).

No dia a dia, basta abrir o Docker Desktop, rodar `npx supabase start` e depois `npm run dev`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Abre o site em modo de desenvolvimento |
| `npm run build` | Gera a versão de produção (também confere erros) |
| `npm run db:migrar` | Aplica as migrações do banco |
| `npm run db:gerar` | Cria uma migração nova depois de mudar `src/db/schema.ts` |
| `npm run db:semear` | Cadastra plataformas e categorias iniciais |
| `npm run db:exemplos` / `db:limpar-exemplos` | Cria / apaga produtos de exemplo |
| `npm run admin:criar -- email "Nome" [papel]` | Cria um usuário do painel ou troca a senha dele. Papéis: administrador, editor, colaborador |

## Painel administrativo (/admin)

- **Login** com e-mail e senha. A senha é guardada com scrypt (nunca em texto), a sessão dura 7 dias e fica num cookie protegido. Depois de 5 senhas erradas em 15 minutos, o e-mail é bloqueado por 15 minutos.
- **Papéis:** administrador (tudo), editor (produtos e categorias, pode excluir) e colaborador (cadastra e edita produtos, não exclui nem mexe em categorias).
- **Produtos:** adicionar, editar, duplicar, excluir, ativar e desativar (um por um ou em lote), destaque, preços, links, imagens, categoria e subcategoria, validade da oferta. O código do produto na loja evita cadastro duplicado. Toda mudança de preço vai para o histórico.
- **Categorias:** criar, editar, ordenar, desativar e criar subcategorias (dois níveis).
- **Dashboard:** totais de produtos, cliques de hoje e do mês e atividade recente.

## Estrutura

```
src/app/(loja)/     páginas do site (início, produtos, categorias, ofertas, produto, páginas legais)
src/app/(painel)/   painel administrativo (/admin) e as ações que gravam no banco
src/app/ir/[id]/    registro do clique + redirecionamento ao link de afiliado
src/componentes/    cabeçalho, rodapé, cartão de produto, filtros, aviso de cookies
src/lib/            consultas do catálogo, regras de preço e desconto
src/db/schema.ts    tabelas do banco
banco/migracoes/    migrações SQL geradas
scripts/semear.ts   dados iniciais
```

## Regras importantes já implementadas

- **Desconto só aparece se for confiável:** preço anterior maior que o atual e preço conferido nas últimas 48 horas (`src/lib/precos.ts`). Fora disso, o produto sai da vitrine de ofertas.
- **Cliques não são vendas.** Os relatórios mostram cliques.
- **LGPD:** origem da visita e UTM só são gravadas com consentimento de cookies. O IP não é guardado; usamos um código anônimo que muda todo dia.
- **Credenciais** ficam no `.env.local` (fora do GitHub), nunca no código.
