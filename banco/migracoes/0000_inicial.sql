CREATE TYPE "public"."papel_usuario" AS ENUM('administrador', 'editor', 'colaborador');--> statement-breakpoint
CREATE TYPE "public"."status_importacao" AS ENUM('em_andamento', 'concluida', 'com_erros', 'falhou');--> statement-breakpoint
CREATE TYPE "public"."status_integracao" AS ENUM('nao_configurada', 'ativa', 'com_erro', 'indisponivel');--> statement-breakpoint
CREATE TYPE "public"."status_produto" AS ENUM('rascunho', 'ativo', 'inativo', 'indisponivel', 'revisar_preco');--> statement-breakpoint
CREATE TABLE "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"subtitulo" text,
	"imagem_desktop" text,
	"imagem_celular" text,
	"link" text,
	"inicia_em" timestamp with time zone,
	"termina_em" timestamp with time zone,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"pai_id" integer,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categorias_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cliques" (
	"id" serial PRIMARY KEY NOT NULL,
	"produto_id" integer,
	"plataforma_id" integer,
	"categoria_id" integer,
	"ocorrido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"origem" text,
	"utm" jsonb,
	"visitante_hash" text
);
--> statement-breakpoint
CREATE TABLE "configuracoes" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" jsonb NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contas_afiliado" (
	"id" serial PRIMARY KEY NOT NULL,
	"plataforma_id" integer NOT NULL,
	"identificador_afiliado" text,
	"variavel_credencial" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historico_precos" (
	"id" serial PRIMARY KEY NOT NULL,
	"produto_id" integer NOT NULL,
	"preco" numeric(12, 2) NOT NULL,
	"origem" text DEFAULT 'manual' NOT NULL,
	"registrado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "importacao_itens" (
	"id" serial PRIMARY KEY NOT NULL,
	"importacao_id" integer NOT NULL,
	"produto_id" integer,
	"id_na_plataforma" text,
	"resultado" text NOT NULL,
	"mensagem" text
);
--> statement-breakpoint
CREATE TABLE "importacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"plataforma_id" integer NOT NULL,
	"status" "status_importacao" DEFAULT 'em_andamento' NOT NULL,
	"tipo" text NOT NULL,
	"iniciada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"concluida_em" timestamp with time zone,
	"total_novos" integer DEFAULT 0 NOT NULL,
	"total_atualizados" integer DEFAULT 0 NOT NULL,
	"total_indisponiveis" integer DEFAULT 0 NOT NULL,
	"total_erros" integer DEFAULT 0 NOT NULL,
	"usuario_id" uuid
);
--> statement-breakpoint
CREATE TABLE "log_atividades" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" uuid,
	"acao" text NOT NULL,
	"entidade" text NOT NULL,
	"entidade_id" text,
	"detalhes" jsonb,
	"ocorrido_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plataformas" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"logo_url" text,
	"cor_destaque" text,
	"status_integracao" "status_integracao" DEFAULT 'nao_configurada' NOT NULL,
	"observacao_integracao" text,
	"parametros_rastreamento" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ultima_sincronizacao" timestamp with time zone,
	"ativa" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plataformas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "produto_imagens" (
	"id" serial PRIMARY KEY NOT NULL,
	"produto_id" integer NOT NULL,
	"url" text NOT NULL,
	"texto_alternativo" text,
	"ordem" integer DEFAULT 0 NOT NULL,
	"principal" boolean DEFAULT false NOT NULL,
	"origem" text DEFAULT 'upload' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produtos" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"preco_atual" numeric(12, 2),
	"preco_anterior" numeric(12, 2),
	"preco_verificado_em" timestamp with time zone,
	"categoria_id" integer,
	"subcategoria_id" integer,
	"plataforma_id" integer NOT NULL,
	"link_original" text,
	"link_afiliado" text,
	"id_na_plataforma" text,
	"status" "status_produto" DEFAULT 'rascunho' NOT NULL,
	"destaque" boolean DEFAULT false NOT NULL,
	"oferta_valida_ate" timestamp with time zone,
	"origem_cadastro" text DEFAULT 'manual' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "produtos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"papel" "papel_usuario" DEFAULT 'colaborador' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vitrine_produtos" (
	"vitrine_id" integer NOT NULL,
	"produto_id" integer NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vitrines" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"inicia_em" timestamp with time zone,
	"termina_em" timestamp with time zone,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vitrines_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_pai_id_categorias_id_fk" FOREIGN KEY ("pai_id") REFERENCES "public"."categorias"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliques" ADD CONSTRAINT "cliques_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliques" ADD CONSTRAINT "cliques_plataforma_id_plataformas_id_fk" FOREIGN KEY ("plataforma_id") REFERENCES "public"."plataformas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliques" ADD CONSTRAINT "cliques_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas_afiliado" ADD CONSTRAINT "contas_afiliado_plataforma_id_plataformas_id_fk" FOREIGN KEY ("plataforma_id") REFERENCES "public"."plataformas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_precos" ADD CONSTRAINT "historico_precos_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importacao_itens" ADD CONSTRAINT "importacao_itens_importacao_id_importacoes_id_fk" FOREIGN KEY ("importacao_id") REFERENCES "public"."importacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importacao_itens" ADD CONSTRAINT "importacao_itens_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importacoes" ADD CONSTRAINT "importacoes_plataforma_id_plataformas_id_fk" FOREIGN KEY ("plataforma_id") REFERENCES "public"."plataformas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_atividades" ADD CONSTRAINT "log_atividades_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produto_imagens" ADD CONSTRAINT "produto_imagens_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_subcategoria_id_categorias_id_fk" FOREIGN KEY ("subcategoria_id") REFERENCES "public"."categorias"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_plataforma_id_plataformas_id_fk" FOREIGN KEY ("plataforma_id") REFERENCES "public"."plataformas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitrine_produtos" ADD CONSTRAINT "vitrine_produtos_vitrine_id_vitrines_id_fk" FOREIGN KEY ("vitrine_id") REFERENCES "public"."vitrines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitrine_produtos" ADD CONSTRAINT "vitrine_produtos_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categorias_pai_idx" ON "categorias" USING btree ("pai_id");--> statement-breakpoint
CREATE INDEX "cliques_ocorrido_idx" ON "cliques" USING btree ("ocorrido_em");--> statement-breakpoint
CREATE INDEX "cliques_produto_idx" ON "cliques" USING btree ("produto_id","ocorrido_em");--> statement-breakpoint
CREATE INDEX "cliques_plataforma_idx" ON "cliques" USING btree ("plataforma_id","ocorrido_em");--> statement-breakpoint
CREATE INDEX "historico_precos_produto_idx" ON "historico_precos" USING btree ("produto_id","registrado_em");--> statement-breakpoint
CREATE INDEX "log_atividades_ocorrido_idx" ON "log_atividades" USING btree ("ocorrido_em");--> statement-breakpoint
CREATE INDEX "produto_imagens_produto_idx" ON "produto_imagens" USING btree ("produto_id");--> statement-breakpoint
CREATE UNIQUE INDEX "produtos_plataforma_codigo_uq" ON "produtos" USING btree ("plataforma_id","id_na_plataforma") WHERE "produtos"."id_na_plataforma" is not null;--> statement-breakpoint
CREATE INDEX "produtos_status_idx" ON "produtos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "produtos_categoria_idx" ON "produtos" USING btree ("categoria_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vitrine_produtos_pk" ON "vitrine_produtos" USING btree ("vitrine_id","produto_id");