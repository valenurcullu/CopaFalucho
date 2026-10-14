import Link from "next/link";
import type { Torneo } from "@/lib/torneo";

/**
 * Aviso visible si el formato configurado no cierra o si la planilla tiene
 * filas con errores. Pensado para que el admin lo vea apenas abre la app.
 */
export function AvisoFormato({ torneo }: { torneo: Pick<Torneo, "erroresFormato" | "avisos"> }) {
  const errores = torneo.avisos.filter((a) => a.nivel === "error").length;
  if (torneo.erroresFormato.length === 0 && errores === 0) return null;
  return (
    <div role="alert" className="mb-4 rounded-2xl border border-derrota/40 bg-derrota/10 p-3 text-sm">
      {torneo.erroresFormato.map((e) => (
        <p key={e}>{e}</p>
      ))}
      {errores > 0 && (
        <p>
          La planilla tiene {errores === 1 ? "1 fila con error que se ignoró" : `${errores} filas con errores que se ignoraron`}.{" "}
          <Link href="/admin/chequeo" className="font-semibold underline">
            Ver detalle
          </Link>
        </p>
      )}
    </div>
  );
}
