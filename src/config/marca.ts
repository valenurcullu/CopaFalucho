/**
 * Identidad visual centralizada. Cambiando este archivo cambia toda la app:
 * nombre, logo y paleta (modo claro y oscuro). Las tipografías están en
 * src/theme/fuentes.ts porque next/font necesita llamarse a nivel de módulo.
 *
 * Colores tomados de clubpucara.org (azul marino y rojo) y del escudo de la
 * Copa Falucho (dorado y azul).
 */

export const marca = {
  nombreTorneo: "Copa Falucho",
  nombreCorto: "Falucho",
  club: "Club Pucará",
  descripcion: "Fixture, tablas, llaves y estadísticas del torneo de fútbol de fin de año del Club Pucará.",
  logo: {
    src: "/marca/logo-copa-falucho.png",
    ancho: 931,
    alto: 1412,
    alt: "Escudo de la Copa Falucho",
  },
  colores: {
    claro: {
      fondo: "#F4F3EE",
      superficie: "#FFFFFF",
      superficieAlt: "#ECEBF4",
      borde: "#D6D5E2",
      texto: "#12122A",
      textoSuave: "#4A4B63",
      marca: "#303083",
      marcaTexto: "#FFFFFF",
      acento: "#F5C518",
      acentoTexto: "#12122A",
      vivo: "#D7090F",
      vivoTexto: "#FFFFFF",
      victoria: "#1B7A44",
      empate: "#6E6F82",
      derrota: "#C0262D",
      amarilla: "#F2C200",
      roja: "#D7090F",
      foco: "#0046B6",
    },
    oscuro: {
      fondo: "#0B0C1A",
      superficie: "#15162B",
      superficieAlt: "#1E2040",
      borde: "#2E3057",
      texto: "#F3F3F8",
      textoSuave: "#A9AAC4",
      marca: "#3B3DA6",
      marcaTexto: "#FFFFFF",
      acento: "#F5C518",
      acentoTexto: "#12122A",
      vivo: "#FF4040",
      vivoTexto: "#12122A",
      victoria: "#3BB273",
      empate: "#8C8DA3",
      derrota: "#FF6369",
      amarilla: "#F5C518",
      roja: "#FF4040",
      foco: "#8FA8FF",
    },
  },
} as const;

export type ColoresTema = { [K in keyof typeof marca.colores.claro]: string };
