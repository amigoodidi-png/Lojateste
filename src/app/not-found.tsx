import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="container-site py-20 text-center">
      <p className="font-display text-5xl font-extrabold text-azul">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold">Esse achado sumiu</h1>
      <p className="mt-2 text-tinta-suave">A página não existe ou o produto saiu da vitrine.</p>
      <Link href="/ofertas" className="mt-6 inline-block rounded-md bg-rosa px-5 py-3 text-sm font-bold text-white">Ver ofertas do dia</Link>
    </div>
  );
}
