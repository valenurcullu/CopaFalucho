import type { Metadata } from "next";
import { Suspense } from "react";
import { Esqueleto, Tarjeta, TituloPagina, TituloSeccion } from "@/components/ui/basicos";
import { obtenerTorneo } from "@/lib/torneo";

export const metadata: Metadata = { title: "Chequeo de la planilla", robots: { index: false, follow: false } };

async function Chequeo() {
  const torneo = await obtenerTorneo();
  const errores = torneo.avisos.filter((a) => a.nivel === "error");
  const advertencias = torneo.avisos.filter((a) => a.nivel === "advertencia");
  return (
    <>
      <Tarjeta className="p-4 text-sm">
        <p>
          Origen de los datos: <strong>{torneo.origen === "planilla" ? "planilla de Google" : "datos de ejemplo"}</strong>
        </p>
        <p>
          Leídos: {torneo.equipos.length} equipos, {torneo.partidos.length} partidos, {torneo.jugadores.length} jugadores.
        </p>
        <p className="mt-2 text-texto-suave">Los cambios en la planilla aparecen en la app en 5 a 10 minutos.</p>
      </Tarjeta>

      {torneo.erroresFormato.length > 0 && (
        <>
          <TituloSeccion>Formato</TituloSeccion>
          {torneo.erroresFormato.map((e) => (
            <p key={e} className="rounded-xl bg-derrota/10 p-3 text-sm">
              {e}
            </p>
          ))}
        </>
      )}

      {[
        ["Errores (filas ignoradas)", errores],
        ["Advertencias (filas usadas, pero revisalas)", advertencias],
      ].map(([titulo, lista]) => (
        <section key={titulo as string}>
          <TituloSeccion>{titulo as string}</TituloSeccion>
          {(lista as typeof errores).length === 0 ? (
            <p className="text-sm text-victoria">Nada para corregir. 👌</p>
          ) : (
            <Tarjeta>
              <ul>
                {(lista as typeof errores).map((a, i) => (
                  <li key={i} className="border-b border-borde p-3 text-sm last:border-0">
                    <span className="font-semibold">
                      {a.hoja}, fila {a.fila}:
                    </span>{" "}
                    {a.mensaje}
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
        </section>
      ))}
    </>
  );
}

export default function PaginaChequeo() {
  return (
    <>
      <TituloPagina bajada="Problemas encontrados al leer la planilla.">Chequeo</TituloPagina>
      <Suspense fallback={<Esqueleto className="h-40" />}>
        <Chequeo />
      </Suspense>
    </>
  );
}
