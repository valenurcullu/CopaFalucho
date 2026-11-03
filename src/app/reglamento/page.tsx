import type { Metadata } from "next";
import { Tarjeta, TituloPagina } from "@/components/ui/basicos";
import { reglamento } from "@/config/reglamento";
import { torneoConfig } from "@/config/torneo";

export const metadata: Metadata = { title: "Reglamento" };

export default function PaginaReglamento() {
  return (
    <>
      <TituloPagina bajada={`Copa Falucho ${torneoConfig.edicion}`}>Reglamento</TituloPagina>
      <div className="flex flex-col gap-3">
        {reglamento.map((seccion) => (
          <Tarjeta as="section" key={seccion.titulo} className="p-4">
            <h2 className="font-titulos text-lg font-bold uppercase tracking-wide text-secundario">{seccion.titulo}</h2>
            {seccion.parrafos.map((p) => (
              <p key={p} className="mt-2 text-[15px] leading-relaxed">
                {p}
              </p>
            ))}
          </Tarjeta>
        ))}
      </div>
    </>
  );
}
