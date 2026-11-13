ALTER TYPE "public"."status_importacao" ADD VALUE 'aguardando_confirmacao' BEFORE 'em_andamento';--> statement-breakpoint
ALTER TYPE "public"."status_importacao" ADD VALUE 'cancelada';--> statement-breakpoint
ALTER TABLE "importacoes" ALTER COLUMN "plataforma_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "importacao_itens" ADD COLUMN "linha" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "importacao_itens" ADD COLUMN "dados" jsonb;--> statement-breakpoint
ALTER TABLE "importacoes" ADD COLUMN "descricao" text;--> statement-breakpoint
CREATE INDEX "importacao_itens_importacao_idx" ON "importacao_itens" USING btree ("importacao_id","linha");