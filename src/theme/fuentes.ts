import { Barlow_Condensed, Montserrat } from "next/font/google";

/** Texto general: la tipografía de clubpucara.org. */
export const fuenteTexto = Montserrat({
  subsets: ["latin"],
  variable: "--fuente-texto",
  display: "swap",
});

/** Títulos y marcadores: condensada, como las letras del escudo. */
export const fuenteTitulos = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--fuente-titulos",
  display: "swap",
});
