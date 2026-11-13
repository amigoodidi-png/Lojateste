import type { Metadata, Viewport } from "next";
import { DM_Sans, Unbounded } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const display = Unbounded({ variable: "--fonte-display", subsets: ["latin"], weight: ["600", "700", "800"] });
const texto = DM_Sans({ variable: "--fonte-texto", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.nome} · achados e ofertas com preço conferido`, template: `%s · ${SITE.nome}` },
  description: SITE.descricao,
  openGraph: { type: "website", locale: "pt_BR", siteName: SITE.nome },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = { themeColor: "#2E3CF0", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${texto.variable}`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
