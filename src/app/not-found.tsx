import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div className="py-16 text-center">
      <p className="font-titulos text-6xl font-extrabold text-marca dark:text-acento">404</p>
      <h1 className="mt-2 font-titulos text-2xl font-bold uppercase">No encontramos esa página</h1>
      <p className="mt-1 text-texto-suave">Puede que el equipo o el jugador ya no esté en la planilla.</p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-marca px-5 font-semibold text-marca-texto">
        Ir al fixture
      </Link>
    </div>
  );
}
