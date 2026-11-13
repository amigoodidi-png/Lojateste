import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (senha: string, salt: Buffer, tamanho: number) => Promise<Buffer>;

export async function gerarHashSenha(senha: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(senha.normalize("NFKC"), salt, 64);
  return `scrypt:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export async function conferirSenha(senha: string, guardado: string | null): Promise<boolean> {
  if (!guardado) return false;
  const [tipo, saltB64, hashB64] = guardado.split(":");
  if (tipo !== "scrypt" || !saltB64 || !hashB64) return false;
  const esperado = Buffer.from(hashB64, "base64");
  const calculado = await scrypt(senha.normalize("NFKC"), Buffer.from(saltB64, "base64"), esperado.length);
  return timingSafeEqual(esperado, calculado);
}

