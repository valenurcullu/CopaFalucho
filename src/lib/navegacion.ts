/**
 * Cuenta las pantallas visitadas en esta sesión de la app (lado cliente), para
 * saber si "Volver" puede usar el historial o tiene que ir a una ruta fija.
 */
let pantallasVisitadas = 0;

export function registrarPantalla() {
  pantallasVisitadas++;
}

export function hayPantallaAnterior() {
  return pantallasVisitadas > 1;
}
