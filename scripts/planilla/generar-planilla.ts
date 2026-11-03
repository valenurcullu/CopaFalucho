/**
 * Arma data/planilla-ejemplo.xlsx a partir de data/ejemplo/*.csv.
 * Se sube a Google Drive y se abre con Google Sheets: queda lista para usar.
 * Uso: npm run planilla:generar
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { marca } from "../../src/config/marca";
import { leerCsv } from "../../src/lib/datos/csv";
import { COLUMNAS } from "../../src/lib/datos/esquemas";

const CARPETA = path.join(process.cwd(), "data");
const HOJAS = ["Equipos", "Partidos", "Eventos", "Jugadores"] as const;

/** Columnas que se guardan como número; el resto va como texto plano. */
const NUMERICAS = new Set(["fechas_sancion", "año", "ranking_anterior", "puntos_descontados", "fecha_nro", "goles_local", "goles_visitante", "penales_local", "penales_visitante", "minuto", "número", "peso_kg", "altura_cm"]);

/** Listas desplegables para que no se carguen valores inválidos. */
const OPCIONES: Record<string, string[]> = {
  fase: ["zona", "octavos", "cuartos", "semis", "tercer puesto", "final"],
  estado: ["programado", "finalizado"],
  tipo: ["gol", "gol en contra", "amarilla", "roja"],
};

const INSTRUCCIONES = [
  ["Copa Falucho: planilla de datos"],
  [""],
  ["Los nombres de las pestañas y de las columnas tienen que quedar exactamente así. La app se actualiza sola en 5 a 10 minutos."],
  ["Equipos: id = cómo se lo nombra (2001, 8YPICO, RDM). año, nombre y sigla son opcionales. En alias van otras formas de escribirlo, separadas por coma (\"8 y pico, 80\")."],
  ["Equipos: ranking_anterior = puesto del año pasado (último desempate). puntos_descontados = sanción (no mandar árbitro: 3). foto_url = link a la foto de perfil (opcional)."],
  ["Partidos: al terminar, escribí goles_local y goles_visitante y poné estado = finalizado. Estados: programado / finalizado. Lo que se está jugando lo muestra la app sola según la hora."],
  ["Si un equipo pierde por no presentarse o por jugador no habilitado, cargá 3-0 en goles_local / goles_visitante."],
  ["Partidos de fase final: completá la columna llave (C1, S1, F…) y dejá local y visitante vacíos: la app los completa sola."],
  ["Si una llave termina empatada, cargá penales_local y penales_visitante."],
  ["árbitro: un nombre, o la clase que arbitra (\"2000\")."],
  ["Eventos (opcional pero recomendado): una fila por gol o tarjeta. jugador = id, nombre, apellido o apodo (\"coke\"). Si no está en Jugadores, se agrega solo."],
  ["Eventos: en una roja directa, cargá en fechas_sancion las fechas que defina la comisión. Si queda vacío, figura como 1 fecha a definir."],
  ["Jugadores: id = equipo-número de orden (2001-07). apodo, foto_url, peso y altura son opcionales."],
  ["Fechas en formato dd/mm/aaaa y horas en hh:mm."],
];


async function main() {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Copa Falucho";

  for (const hoja of HOJAS) {
    const columnas = COLUMNAS[hoja];
    const { filas } = leerCsv(await readFile(path.join(CARPETA, "ejemplo", `${hoja.toLowerCase()}.csv`), "utf8"));
    const claves = Object.keys(filas[0] ?? {});
    const ws = libro.addWorksheet(hoja, { views: [{ state: "frozen", ySplit: 1 }] });

    ws.columns = columnas.map((titulo) => ({
      header: titulo,
      width: Math.max(10, titulo.length + 4, titulo === "nombre" ? 26 : 0),
      style: NUMERICAS.has(titulo) ? {} : { numFmt: "@" },
    }));
    for (const fila of filas) {
      ws.addRow(
        columnas.map((titulo, i) => {
          const valor = fila[claves[i]] ?? "";
          if (valor === "") return null;
          return NUMERICAS.has(titulo) ? Number(valor) : valor;
        }),
      );
    }

    const encabezado = ws.getRow(1);
    encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
    encabezado.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${marca.colores.claro.marca.slice(1)}` } };

    columnas.forEach((titulo, i) => {
      const opciones = OPCIONES[titulo];
      if (!opciones) return;
      const letra = ws.getColumn(i + 1).letter;
      for (let r = 2; r <= 1000; r++) {
        ws.getCell(`${letra}${r}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`"${opciones.join(",")}"`],
        };
      }
    });
  }

  const ayuda = libro.addWorksheet("Instrucciones");
  ayuda.getColumn(1).width = 120;
  INSTRUCCIONES.forEach((linea) => ayuda.addRow(linea));
  ayuda.getRow(1).font = { bold: true, size: 14 };

  const destino = path.join(CARPETA, "planilla-ejemplo.xlsx");
  await libro.xlsx.writeFile(destino);
  console.log(`✓ ${path.relative(process.cwd(), destino)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
