/**
 * Cria (ou atualiza a senha de) um usuário do painel.
 * Uso: npm run admin:criar -- seu@email.com "Seu Nome" [administrador|editor|colaborador]
 * A senha é pedida no terminal e não aparece na tela.
 */
import { createInterface } from "node:readline";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { gerarHashSenha } from "../src/lib/senha";

function perguntarSenha(pergunta: string): Promise<string> {
  if (process.env.SENHA_ADMIN) return Promise.resolve(process.env.SENHA_ADMIN);
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const saida = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    saida._writeToOutput = (s: string) => { if (s.includes(pergunta)) saida.output.write(s); };
    rl.question(pergunta, (r) => { rl.close(); process.stdout.write("\n"); resolve(r); });
  });
}

async function main() {
  if (!db) throw new Error("Defina DATABASE_URL no .env.local.");
  const [email, nome, papel = "administrador"] = process.argv.slice(2);
  if (!email || !nome) throw new Error('Uso: npm run admin:criar -- email "Nome" [administrador|editor|colaborador]');
  if (!["administrador", "editor", "colaborador"].includes(papel)) throw new Error("Papel inválido.");
  const senha = await perguntarSenha("Senha (mínimo 10 caracteres): ");
  if (senha.length < 10) throw new Error("A senha precisa ter pelo menos 10 caracteres.");
  const senhaHash = await gerarHashSenha(senha);
  const emailNorm = email.trim().toLowerCase();
  const [existe] = await db.select({ id: schema.usuarios.id }).from(schema.usuarios).where(eq(schema.usuarios.email, emailNorm));
  if (existe) {
    await db.update(schema.usuarios).set({ nome, senhaHash, papel: papel as "administrador", ativo: true }).where(eq(schema.usuarios.id, existe.id));
    console.log(`Usuário ${emailNorm} atualizado.`);
  } else {
    await db.insert(schema.usuarios).values({ email: emailNorm, nome, senhaHash, papel: papel as "administrador" });
    console.log(`Usuário ${emailNorm} criado como ${papel}.`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
