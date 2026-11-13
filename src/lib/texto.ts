export function gerarSlug(texto: string): string {
  return texto
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

/** Converte "1.234,56", "1234,56" ou "1234.56" em "1234.56". Devolve null se vazio ou inválido. */
export function lerPreco(valor: FormDataEntryValue | null): string | null {
  const s = String(valor ?? "").trim().replace(/[R$\s]/g, "");
  if (!s) return null;
  const normalizado = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalizado);
  return Number.isFinite(n) && n >= 0 ? n.toFixed(2) : null;
}
