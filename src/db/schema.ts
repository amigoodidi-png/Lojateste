// Esquema do banco de dados do Olha o Achado (PostgreSQL).
// Para alterar: edite este arquivo e rode `npm run db:gerar` para criar uma nova migração.
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const criadoEm = () => timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();
const atualizadoEm = () => timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow();

export const statusIntegracao = pgEnum("status_integracao", [
  "nao_configurada",
  "ativa",
  "com_erro",
  "indisponivel",
]);
export const statusProduto = pgEnum("status_produto", ["rascunho", "ativo", "inativo", "indisponivel", "revisar_preco"]);
export const statusImportacao = pgEnum("status_importacao", ["em_andamento", "concluida", "com_erros", "falhou"]);
export const papelUsuario = pgEnum("papel_usuario", ["administrador", "editor", "colaborador"]);

/** Programas de afiliados (Shopee, Mercado Livre, Temu e futuros). */
export const plataformas = pgTable("plataformas", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nome: text("nome").notNull(),
  logoUrl: text("logo_url"),
  corDestaque: text("cor_destaque"),
  statusIntegracao: statusIntegracao("status_integracao").notNull().default("nao_configurada"),
  /** Explica ao administrador por que a importação automática não está disponível, quando for o caso. */
  observacaoIntegracao: text("observacao_integracao"),
  /** Parâmetros fixos acrescentados aos links (ex.: utm_source). Credenciais NUNCA ficam aqui. */
  parametrosRastreamento: jsonb("parametros_rastreamento").$type<Record<string, string>>().notNull().default({}),
  ultimaSincronizacao: timestamp("ultima_sincronizacao", { withTimezone: true }),
  ativa: boolean("ativa").notNull().default(true),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
});

/** Identificador de afiliado em cada plataforma. A chave secreta fica em variável de ambiente, referenciada pelo nome. */
export const contasAfiliado = pgTable("contas_afiliado", {
  id: serial("id").primaryKey(),
  plataformaId: integer("plataforma_id").notNull().references(() => plataformas.id, { onDelete: "cascade" }),
  identificadorAfiliado: text("identificador_afiliado"),
  /** Nome da variável de ambiente que guarda a credencial, por exemplo SHOPEE_APP_SECRET. */
  variavelCredencial: text("variavel_credencial"),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
});

export const categorias = pgTable(
  "categorias",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    nome: text("nome").notNull(),
    descricao: text("descricao"),
    paiId: integer("pai_id").references((): AnyPgColumn => categorias.id, { onDelete: "set null" }),
    ordem: integer("ordem").notNull().default(0),
    ativa: boolean("ativa").notNull().default(true),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [index("categorias_pai_idx").on(t.paiId)],
);

export const produtos = pgTable(
  "produtos",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    nome: text("nome").notNull(),
    descricao: text("descricao"),
    precoAtual: numeric("preco_atual", { precision: 12, scale: 2 }),
    precoAnterior: numeric("preco_anterior", { precision: 12, scale: 2 }),
    /** Quando o preço foi conferido pela última vez. Desconto só aparece se for recente. */
    precoVerificadoEm: timestamp("preco_verificado_em", { withTimezone: true }),
    categoriaId: integer("categoria_id").references(() => categorias.id, { onDelete: "set null" }),
    subcategoriaId: integer("subcategoria_id").references(() => categorias.id, { onDelete: "set null" }),
    plataformaId: integer("plataforma_id").notNull().references(() => plataformas.id),
    linkOriginal: text("link_original"),
    linkAfiliado: text("link_afiliado"),
    /** Código do produto na plataforma de origem. Junto com a plataforma, evita duplicidade. */
    idNaPlataforma: text("id_na_plataforma"),
    status: statusProduto("status").notNull().default("rascunho"),
    destaque: boolean("destaque").notNull().default(false),
    ofertaValidaAte: timestamp("oferta_valida_ate", { withTimezone: true }),
    origemCadastro: text("origem_cadastro").notNull().default("manual"),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    uniqueIndex("produtos_plataforma_codigo_uq")
      .on(t.plataformaId, t.idNaPlataforma)
      .where(sql`${t.idNaPlataforma} is not null`),
    index("produtos_status_idx").on(t.status),
    index("produtos_categoria_idx").on(t.categoriaId),
  ],
);

export const produtoImagens = pgTable(
  "produto_imagens",
  {
    id: serial("id").primaryKey(),
    produtoId: integer("produto_id").notNull().references(() => produtos.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    textoAlternativo: text("texto_alternativo"),
    ordem: integer("ordem").notNull().default(0),
    principal: boolean("principal").notNull().default(false),
    /** "upload" (enviada pelo painel) ou "plataforma" (recebida por integração autorizada). */
    origem: text("origem").notNull().default("upload"),
    criadoEm: criadoEm(),
  },
  (t) => [index("produto_imagens_produto_idx").on(t.produtoId)],
);

export const historicoPrecos = pgTable(
  "historico_precos",
  {
    id: serial("id").primaryKey(),
    produtoId: integer("produto_id").notNull().references(() => produtos.id, { onDelete: "cascade" }),
    preco: numeric("preco", { precision: 12, scale: 2 }).notNull(),
    origem: text("origem").notNull().default("manual"),
    registradoEm: timestamp("registrado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("historico_precos_produto_idx").on(t.produtoId, t.registradoEm)],
);

export const importacoes = pgTable("importacoes", {
  id: serial("id").primaryKey(),
  plataformaId: integer("plataforma_id").notNull().references(() => plataformas.id),
  status: statusImportacao("status").notNull().default("em_andamento"),
  /** "api" ou "planilha" */
  tipo: text("tipo").notNull(),
  iniciadaEm: timestamp("iniciada_em", { withTimezone: true }).notNull().defaultNow(),
  concluidaEm: timestamp("concluida_em", { withTimezone: true }),
  totalNovos: integer("total_novos").notNull().default(0),
  totalAtualizados: integer("total_atualizados").notNull().default(0),
  totalIndisponiveis: integer("total_indisponiveis").notNull().default(0),
  totalErros: integer("total_erros").notNull().default(0),
  usuarioId: uuid("usuario_id"),
});

export const importacaoItens = pgTable("importacao_itens", {
  id: serial("id").primaryKey(),
  importacaoId: integer("importacao_id").notNull().references(() => importacoes.id, { onDelete: "cascade" }),
  produtoId: integer("produto_id").references(() => produtos.id, { onDelete: "set null" }),
  idNaPlataforma: text("id_na_plataforma"),
  resultado: text("resultado").notNull(),
  mensagem: text("mensagem"),
});

/** Cada clique em COMPRAR AGORA. Clique não é venda. Não guardamos IP: só um hash anônimo diário. */
export const cliques = pgTable(
  "cliques",
  {
    id: serial("id").primaryKey(),
    produtoId: integer("produto_id").references(() => produtos.id, { onDelete: "set null" }),
    plataformaId: integer("plataforma_id").references(() => plataformas.id, { onDelete: "set null" }),
    categoriaId: integer("categoria_id").references(() => categorias.id, { onDelete: "set null" }),
    ocorridoEm: timestamp("ocorrido_em", { withTimezone: true }).notNull().defaultNow(),
    /** Só preenchidos quando o visitante aceitou cookies de medição. */
    origem: text("origem"),
    utm: jsonb("utm").$type<Record<string, string>>(),
    visitanteHash: text("visitante_hash"),
  },
  (t) => [
    index("cliques_ocorrido_idx").on(t.ocorridoEm),
    index("cliques_produto_idx").on(t.produtoId, t.ocorridoEm),
    index("cliques_plataforma_idx").on(t.plataformaId, t.ocorridoEm),
  ],
);

export const vitrines = pgTable("vitrines", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  iniciaEm: timestamp("inicia_em", { withTimezone: true }),
  terminaEm: timestamp("termina_em", { withTimezone: true }),
  ordem: integer("ordem").notNull().default(0),
  ativa: boolean("ativa").notNull().default(true),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
});

export const vitrineProdutos = pgTable(
  "vitrine_produtos",
  {
    vitrineId: integer("vitrine_id").notNull().references(() => vitrines.id, { onDelete: "cascade" }),
    produtoId: integer("produto_id").notNull().references(() => produtos.id, { onDelete: "cascade" }),
    ordem: integer("ordem").notNull().default(0),
  },
  (t) => [uniqueIndex("vitrine_produtos_pk").on(t.vitrineId, t.produtoId)],
);

export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  subtitulo: text("subtitulo"),
  imagemDesktop: text("imagem_desktop"),
  imagemCelular: text("imagem_celular"),
  link: text("link"),
  iniciaEm: timestamp("inicia_em", { withTimezone: true }),
  terminaEm: timestamp("termina_em", { withTimezone: true }),
  ordem: integer("ordem").notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: criadoEm(),
});

/** Usuários do painel administrativo. */
export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  papel: papelUsuario("papel").notNull().default("colaborador"),
  /** Senha com scrypt (salt:hash). Nunca guardamos a senha em texto. */
  senhaHash: text("senha_hash"),
  ultimoAcesso: timestamp("ultimo_acesso", { withTimezone: true }),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: criadoEm(),
});

/** Sessões do painel. Guardamos só o hash do token; o token fica no cookie httpOnly do navegador. */
export const sessoes = pgTable(
  "sessoes",
  {
    tokenHash: text("token_hash").primaryKey(),
    usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
    expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [index("sessoes_usuario_idx").on(t.usuarioId)],
);

/** Tentativas de login, para bloquear força bruta. */
export const tentativasLogin = pgTable(
  "tentativas_login",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    sucesso: boolean("sucesso").notNull(),
    ocorridoEm: timestamp("ocorrido_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tentativas_login_email_idx").on(t.email, t.ocorridoEm)],
);

export const logAtividades = pgTable(
  "log_atividades",
  {
    id: serial("id").primaryKey(),
    usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
    acao: text("acao").notNull(),
    entidade: text("entidade").notNull(),
    entidadeId: text("entidade_id"),
    detalhes: jsonb("detalhes"),
    ocorridoEm: timestamp("ocorrido_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("log_atividades_ocorrido_idx").on(t.ocorridoEm)],
);

export const configuracoes = pgTable("configuracoes", {
  chave: text("chave").primaryKey(),
  valor: jsonb("valor").notNull(),
  atualizadoEm: atualizadoEm(),
});
