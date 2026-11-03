/**
 * Reglamento que se muestra en /reglamento. Basado en el reglamento 2024:
 * revisalo cada año (montos, alias, ranking de referencia).
 * Las reglas que la app aplica sola están en config/torneo.ts.
 */
export interface SeccionReglamento {
  titulo: string;
  parrafos: string[];
}

export const reglamento: SeccionReglamento[] = [
  {
    titulo: "Introducción",
    parrafos: [
      "La Copa Falucho es el torneo de fútbol que se juega en el Club Pucará para divertirnos de otra manera después de la temporada de rugby. La idea es seguir fortaleciendo el grupo y unir al club, incluyendo a los jugadores que dejaron la actividad y acercándolos de nuevo.",
    ],
  },
  {
    titulo: "Formato",
    parrafos: [
      "16 equipos divididos en 4 zonas de 4. Pasan de ronda los dos primeros de cada zona. No hay descenso.",
      "Los partidos duran 40 minutos, en 2 tiempos de 20, con 5 minutos de descanso.",
      "Se juega con 8 jugadores en cancha, arquero incluido. Para empezar o seguir un partido hacen falta al menos 5; con 4 en cancha se pierden los puntos. Los cambios son ilimitados y un jugador que salió puede volver a entrar.",
    ],
  },
  {
    titulo: "Jugadores",
    parrafos: [
      "Los combinados entregan una lista de buena fe de hasta 20 jugadores para todo el torneo.",
      "Nadie puede jugar en dos equipos en una misma edición, y solo pueden jugar quienes hayan formado parte de algún equipo de rugby del club.",
    ],
  },
  {
    titulo: "Fixture y árbitros",
    parrafos: [
      "La organización publica el fixture con fecha, hora y cancha de cada partido. Si una fecha no se juega por clima u otros motivos, se avisa a los capitanes.",
      "Cada equipo tiene que mandar un árbitro al partido que le asigne la organización. Si no lo manda, se le descuentan 3 puntos.",
    ],
  },
  {
    titulo: "Puntos y desempates",
    parrafos: [
      "Partido ganado: 3 puntos. Empatado: 1. Perdido: 0.",
      "Si hay igualdad de puntos en la zona: 1) resultado entre los equipos empatados, 2) diferencia de gol, 3) goles a favor, 4) menos goles en contra, 5) mejor ranking del año anterior, 6) partido definitorio.",
    ],
  },
  {
    titulo: "Puntualidad",
    parrafos: [
      "Los equipos tienen que estar 15 minutos antes para empezar a horario. El equipo que llega pasados los 15 minutos del inicio pierde 3-0, sin excepción.",
      "Si un equipo incluye a un jugador no habilitado (no inscripto, suspendido o de otro equipo), el jugador queda suspendido del torneo y el partido se le da ganado al rival 3-0.",
    ],
  },
  {
    titulo: "Tarjetas y sanciones",
    parrafos: [
      "3 amarillas: 1 fecha de suspensión. Las amarillas se limpian en semifinales.",
      "Expulsión por doble amarilla: 1 fecha.",
      "Roja directa: la comisión y el árbitro definen las fechas.",
      "La comisión puede sancionar de oficio si el árbitro informa irregularidades de jugadores o del público.",
    ],
  },
  {
    titulo: "Etapas finales",
    parrafos: [
      "En cuartos, semis y final, si hay empate en el tiempo reglamentario se define por penales.",
      "Los 8 clasificados se ordenan en una tabla general (puntos, goles a favor, en contra y tarjetas) y se cruzan así: C1 1º vs 8º, C2 4º vs 5º, C3 2º vs 7º, C4 3º vs 6º. Semis: ganador C1 vs ganador C2 y ganador C3 vs ganador C4. Final: los ganadores de las semis.",
    ],
  },
  {
    titulo: "Casos no previstos",
    parrafos: [
      "Todo lo que no esté en este reglamento lo resuelve la organización de la Copa Falucho, que puede modificarlo avisando a los capitanes.",
    ],
  },
];
