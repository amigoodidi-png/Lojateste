export const SITE = {
  nome: "Olha o Achado",
  descricao: "Achados e ofertas das lojas que você já conhece, como Shopee, Mercado Livre e Temu, com preço conferido.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  emailContato: process.env.NEXT_PUBLIC_EMAIL_CONTATO ?? "",
};
