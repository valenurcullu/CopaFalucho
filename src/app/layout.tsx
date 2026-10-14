import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { BarraPestanas } from "@/components/layout/BarraPestanas";
import { Encabezado } from "@/components/layout/Encabezado";
import { RegistroNavegacion } from "@/components/layout/RegistroNavegacion";
import { InvitacionInstalar } from "@/components/pwa/InvitacionInstalar";
import { ProveedorPwa } from "@/components/pwa/ProveedorPwa";
import { EstadoDatos } from "@/components/layout/EstadoDatos";
import { marca } from "@/config/marca";
import { obtenerTorneo } from "@/lib/torneo";
import { fuenteTexto, fuenteTitulos } from "@/theme/fuentes";
import { cssVariablesTema } from "@/theme/variables";
import "./globals.css";

/**
 * Cada cuántos segundos se regeneran las páginas (5 minutos: los resultados
 * se cargan a la noche o al otro día, no hace falta tiempo real). Tiene que
 * ser un número literal; mantenerlo igual a torneoConfig.revalidarSegundos.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: { default: marca.nombreTorneo, template: `%s · ${marca.nombreTorneo}` },
  description: marca.descripcion,
  applicationName: marca.nombreTorneo,
  appleWebApp: { capable: true, title: marca.nombreCorto, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: marca.colores.claro.marca },
    { media: "(prefers-color-scheme: dark)", color: marca.colores.oscuro.fondo },
  ],
};

async function EstadoConDatos() {
  const { actualizadoEn } = await obtenerTorneo();
  return <EstadoDatos actualizadoEn={actualizadoEn} />;
}

async function BarraConDatos() {
  const { partidos } = await obtenerTorneo();
  return <BarraPestanas hayEnVivo={partidos.some((p) => p.estado === "en_juego")} />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${fuenteTexto.variable} ${fuenteTitulos.variable} antialiased`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssVariablesTema() }} />
      </head>
      <body className="min-h-dvh">
        <ProveedorPwa>
          <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-superficie focus:p-3">
            Saltar al contenido
          </a>
          <Encabezado>
            <Suspense>
              <EstadoConDatos />
            </Suspense>
          </Encabezado>
          <main id="contenido" className="mx-auto max-w-lg px-safe pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4">
            {children}
          </main>
          <RegistroNavegacion />
          <Suspense fallback={<BarraPestanas />}>
            <BarraConDatos />
          </Suspense>
          <InvitacionInstalar />
        </ProveedorPwa>
      </body>
    </html>
  );
}
