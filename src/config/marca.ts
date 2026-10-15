/**
 * Identidad visual centralizada. Cambiando este archivo cambia toda la app:
 * nombre, logo y paleta (modo claro y oscuro). Las tipografías están en
 * src/theme/fuentes.ts porque next/font necesita llamarse a nivel de módulo.
 *
 * Colores tomados de la gráfica de la Copa Falucho (redes /copafalucho):
 * fondo blanco, azul, rojo ladrillo, celeste y un dorado suave para detalles.
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
  /**
   * La identidad del torneo es blanca con azul y rojo. En false, la app se ve
   * siempre en modo claro aunque el celular esté en modo oscuro.
   */
  modoOscuro: false,
  colores: {
    claro: {
      fondo: "#FFFFFF",
      superficie: "#FFFFFF",
      superficieAlt: "#EEF2F9",
      borde: "#CFDAEA",
      texto: "#13254F",
      textoSuave: "#52628A",
      marca: "#1A449E",
      marcaTexto: "#FFFFFF",
      marcaClara: "#6F8EC2",
      secundario: "#91322C",
      secundarioTexto: "#FFFFFF",
      enlace: "#1A449E",
      acento: "#E7C873",
      acentoTexto: "#13254F",
      vivo: "#C62828",
      vivoTexto: "#FFFFFF",
      victoria: "#1F7A4D",
      empate: "#6B7894",
      derrota: "#91322C",
      amarilla: "#E9B820",
      roja: "#C62828",
      foco: "#1A449E",
      figuritaFondo: "#1A449E",
      figuritaBrillo: "#6F8EC2",
      figuritaMarco: "#91322C",
    },
    oscuro: {
      fondo: "#0D1630",
      superficie: "#152247",
      superficieAlt: "#1C2C5A",
      borde: "#2A3D72",
      texto: "#F2F5FB",
      textoSuave: "#A9B6D6",
      marca: "#1A449E",
      marcaTexto: "#FFFFFF",
      marcaClara: "#6F8EC2",
      secundario: "#B4443C",
      secundarioTexto: "#FFFFFF",
      enlace: "#9DB5E6",
      acento: "#E7C873",
      acentoTexto: "#13254F",
      vivo: "#FF5A5A",
      vivoTexto: "#13254F",
      victoria: "#3BB273",
      empate: "#8C97B3",
      derrota: "#E07A70",
      amarilla: "#E9B820",
      roja: "#FF5A5A",
      foco: "#9DB5E6",
      figuritaFondo: "#1A449E",
      figuritaBrillo: "#6F8EC2",
      figuritaMarco: "#91322C",
    },
  },
} as const;

export type ColoresTema = { [K in keyof typeof marca.colores.claro]: string };
