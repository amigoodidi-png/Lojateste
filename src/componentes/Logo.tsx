import Link from "next/link";

export function Simbolo({ tamanho = 32, invertido = false }: { tamanho?: number; invertido?: boolean }) {
  const olho = invertido ? "#fff" : "#2E3CF0";
  const pupila = invertido ? "#2E3CF0" : "#fff";
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <path d="M3 24c5-9 12.5-14 21-14s16 5 21 14c-5 9-12.5 14-21 14S8 33 3 24Z" fill={olho} />
      <circle cx="24" cy="24" r="8" fill={pupila} />
      <circle cx="26.5" cy="21.5" r="3.4" fill="#FF4F8B" />
    </svg>
  );
}

export function Logo({ invertido = false }: { invertido?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-sm" aria-label="Olha o Achado, página inicial">
      <Simbolo tamanho={34} invertido={invertido} />
      <span className={`font-display text-[15px] leading-none font-extrabold tracking-tight sm:text-lg ${invertido ? "text-white" : "text-tinta"}`}>
        olha o achado!
      </span>
    </Link>
  );
}
