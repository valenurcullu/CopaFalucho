import Image from "next/image";
import { Suspense } from "react";
import { marca } from "@/config/marca";
import { obtenerDatos } from "@/lib/datos";

async function ResumenDatos() {
  const datos = await obtenerDatos();
  const jugados = datos.partidos.filter((p) => p.estado === "finalizado").length;
  return (
    <ul className="grid grid-cols-2 gap-3 text-center">
      {[
        ["Equipos", datos.equipos.length],
        ["Jugadores", datos.jugadores.length],
        ["Partidos jugados", `${jugados}/${datos.partidos.length}`],
        ["Eventos", datos.eventos.length],
      ].map(([titulo, valor]) => (
        <li key={titulo} className="rounded-xl bg-superficie p-4 ring-1 ring-borde">
          <p className="font-titulos text-3xl font-bold">{valor}</p>
          <p className="text-sm text-texto-suave">{titulo}</p>
        </li>
      ))}
    </ul>
  );
}

export default function Inicio() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 px-safe pt-safe py-10">
      <Image src={marca.logo.src} alt={marca.logo.alt} width={160} height={243} priority />
      <h1 className="font-titulos text-4xl font-extrabold uppercase tracking-wide">{marca.nombreTorneo}</h1>
      <Suspense fallback={<p className="text-texto-suave">Cargando datos…</p>}>
        <ResumenDatos />
      </Suspense>
    </main>
  );
}
