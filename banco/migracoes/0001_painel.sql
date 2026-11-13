CREATE TABLE "sessoes" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tentativas_login" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"sucesso" boolean NOT NULL,
	"ocorrido_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuarios" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "senha_hash" text;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "ultimo_acesso" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessoes_usuario_idx" ON "sessoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "tentativas_login_email_idx" ON "tentativas_login" USING btree ("email","ocorrido_em");