import type { Metadata, Viewport } from "next";
import { marca } from "@/config/marca";
import { fuenteTexto, fuenteTitulos } from "@/theme/fuentes";
import { cssVariablesTema } from "@/theme/variables";
import "./globals.css";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${fuenteTexto.variable} ${fuenteTitulos.variable} antialiased`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssVariablesTema() }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
