import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · Painel Olha o Achado" }, robots: { index: false, follow: false } };

export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-[#f6f7fb]">{children}</div>;
}
