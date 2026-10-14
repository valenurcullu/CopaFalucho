import type { Resultado } from "@/lib/torneo/analizar";

const ESTILO: Record<Resultado, string> = {
  G: "bg-victoria text-white",
  E: "bg-empate text-white",
  P: "bg-derrota text-white",
};
const NOMBRE: Record<Resultado, string> = { G: "ganó", E: "empató", P: "perdió" };

/** Últimos resultados de un equipo, del más viejo al más nuevo. */
export function Racha({ resultados }: { resultados: Resultado[] }) {
  if (resultados.length === 0) return null;
  return (
    <span role="img" className="inline-flex gap-0.5" aria-label={`Últimos partidos: ${resultados.map((r) => NOMBRE[r]).join(", ")}`}>
      {resultados.map((r, i) => (
        <span key={i} aria-hidden="true" className={`grid size-4 place-items-center rounded-[4px] text-[10px] font-bold leading-none ${ESTILO[r]}`}>
          {r}
        </span>
      ))}
    </span>
  );
}
