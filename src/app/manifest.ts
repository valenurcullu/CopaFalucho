import type { MetadataRoute } from "next";
import { marca } from "@/config/marca";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${marca.nombreTorneo} · ${marca.club}`,
    short_name: marca.nombreCorto,
    description: marca.descripcion,
    lang: "es-AR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: marca.colores.claro.fondo,
    theme_color: marca.colores.claro.marca,
    categories: ["sports"],
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/iconos/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Tablas", url: "/tablas" },
      { name: "Llaves", url: "/llaves" },
      { name: "Goleadores", url: "/estadisticas" },
    ],
  };
}
