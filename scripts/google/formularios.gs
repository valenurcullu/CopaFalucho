/**
 * Copa Falucho: formularios de la planilla.
 *  1. Ficha de jugador (crearFormulario): cada jugador carga sus datos y su foto.
 *  2. Carga de resultados, goles y tarjetas (crearFormulariosDeCarga, al final
 *     de este archivo): para cargar desde el celular sin tocar la planilla.
 *
 * Cómo usarlo (una sola vez):
 * 1. Abrí la planilla del torneo → Extensiones → Apps Script.
 * 2. Borrá lo que haya, pegá este archivo entero y guardá.
 * 3. Elegí la función "crearFormulario" y tocá Ejecutar. Google va a pedir
 *    permisos: "Revisar permisos" → tu cuenta → "Configuración avanzada" →
 *    "Ir a … (no seguro)" → Permitir. (Es tu propio script, no una app externa.)
 * 4. En el formulario que se creó, agregá a mano la pregunta "Foto" (ver el
 *    final del registro de ejecución: Google no deja crearla por código).
 *
 * Después aparece un menú "Copa Falucho" en la planilla para actualizar las
 * categorías si cambian los equipos y para crear los formularios de carga.
 */

var HOJA_EQUIPOS = "Equipos";
var HOJA_RESPUESTAS = "Formulario";
var POSICIONES = ["Arquero", "Defensor", "Mediocampista", "Delantero"];
var TEXTO_AUTORIZACION = "Acepto que mi foto y mis datos se publiquen en la app de la Copa Falucho";
var PREGUNTA_CATEGORIA = "Categoría";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Copa Falucho")
    .addItem("Crear formulario de jugadores", "crearFormulario")
    .addItem("Actualizar categorías del formulario", "actualizarCategorias")
    .addItem("Hacer públicas las fotos ya subidas", "compartirFotosSubidas")
    .addSeparator()
    .addItem("Crear formularios de carga (resultados y eventos)", "crearFormulariosDeCarga")
    .addItem("Actualizar listas de los formularios de carga", "actualizarFormulariosDeCarga")
    .addToUi();
}

/** Nombres de los equipos de la hoja Equipos, como se muestran en la app. */
function leerCategorias_() {
  var hoja = SpreadsheetApp.getActive().getSheetByName(HOJA_EQUIPOS);
  if (!hoja) throw new Error('No existe la hoja "' + HOJA_EQUIPOS + '"');
  var valores = hoja.getDataRange().getDisplayValues();
  var encabezado = valores[0].map(function (c) {
    return c.toString().trim().toLowerCase();
  });
  var colId = encabezado.indexOf("id");
  var colAnio = encabezado.indexOf("año");
  var colNombre = encabezado.indexOf("nombre");
  var categorias = [];
  for (var i = 1; i < valores.length; i++) {
    var fila = valores[i];
    var nombre = colNombre >= 0 ? fila[colNombre].trim() : "";
    var anio = colAnio >= 0 ? fila[colAnio].trim() : "";
    var id = colId >= 0 ? fila[colId].trim() : "";
    var categoria = nombre || (anio ? "Clase " + anio : id);
    if (categoria && categorias.indexOf(categoria) === -1) categorias.push(categoria);
  }
  if (categorias.length === 0) throw new Error("La hoja Equipos no tiene equipos cargados");
  return categorias.sort();
}

function crearFormulario() {
  var planilla = SpreadsheetApp.getActive();
  var propiedades = PropertiesService.getDocumentProperties();
  if (propiedades.getProperty("formularioId")) {
    var existente = FormApp.openById(propiedades.getProperty("formularioId"));
    Logger.log("Ya hay un formulario creado: " + existente.getEditUrl());
    return;
  }

  var form = FormApp.create("Copa Falucho · Ficha de jugador")
    .setDescription(
      "Completá tus datos para tu figurita en la app de la Copa Falucho. " +
        "Si te equivocaste, mandalo de nuevo: vale la última respuesta.",
    )
    .setCollectEmail(false)
    .setAllowResponseEdits(true)
    .setProgressBar(false);

  form.addTextItem().setTitle("Nombre").setRequired(true);
  form.addTextItem().setTitle("Apellido").setRequired(true);
  form.addTextItem().setTitle("Apodo (opcional)").setHelpText("Como te conocen en el club.");
  form.addListItem().setTitle(PREGUNTA_CATEGORIA).setHelpText("Tu equipo en la copa.").setChoiceValues(leerCategorias_()).setRequired(true);
  form.addMultipleChoiceItem().setTitle("Posición").setChoiceValues(POSICIONES).setRequired(true);
  form
    .addTextItem()
    .setTitle("Peso (kg)")
    .setHelpText("Solo el número, por ejemplo 82")
    .setValidation(FormApp.createTextValidation().requireNumberBetween(40, 160).setHelpText("Un número entre 40 y 160").build());
  form
    .addTextItem()
    .setTitle("Altura (cm)")
    .setHelpText("En centímetros, por ejemplo 181")
    .setValidation(FormApp.createTextValidation().requireNumberBetween(140, 215).setHelpText("Un número entre 140 y 215").build());
  form.addCheckboxItem().setTitle("Autorización").setChoiceValues([TEXTO_AUTORIZACION]).setRequired(true);

  // Respuestas a una pestaña de esta misma planilla, llamada "Formulario".
  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilla.getId());
  SpreadsheetApp.flush();
  var hojaRespuestas = buscarHojaRespuestas_(form);
  if (hojaRespuestas) {
    if (!planilla.getSheetByName(HOJA_RESPUESTAS)) hojaRespuestas.setName(HOJA_RESPUESTAS);
    var ultima = hojaRespuestas.getLastColumn();
    hojaRespuestas.getRange(1, ultima + 1).setValue("Ocultar").setNote("Poné una X para que ese jugador no aparezca en la app.");
  }

  // Cada foto que llega se hace pública (solo lectura) para que la app la pueda mostrar.
  ScriptApp.newTrigger("alEnviarFormulario").forForm(form).onFormSubmit().create();
  propiedades.setProperty("formularioId", form.getId());

  Logger.log("✓ Formulario creado.");
  Logger.log("Para editarlo: " + form.getEditUrl());
  Logger.log("Link para mandar a los jugadores: " + form.getPublishedUrl());
  Logger.log("");
  Logger.log("FALTA UN PASO (Google no deja hacerlo por código): en el formulario, después de 'Altura (cm)',");
  Logger.log("agregá una pregunta 'Foto' de tipo 'Subir archivo': permitir solo imágenes, 1 archivo, tamaño máximo 10 MB, obligatoria.");
  Logger.log("Ayuda para el texto: 'Una foto tuya, de frente y de la cintura para arriba. Si es con la camiseta del club, mejor.'");
}

function buscarHojaRespuestas_(form) {
  var hojas = SpreadsheetApp.getActive().getSheets();
  for (var i = 0; i < hojas.length; i++) {
    var url = hojas[i].getFormUrl();
    if (url && url.indexOf(form.getId()) !== -1) return hojas[i];
  }
  return null;
}

/** Vuelve a cargar la lista de categorías desde la hoja Equipos. */
function actualizarCategorias() {
  var id = PropertiesService.getDocumentProperties().getProperty("formularioId");
  if (!id) throw new Error("Primero creá el formulario (Copa Falucho → Crear formulario de jugadores)");
  var form = FormApp.openById(id);
  var items = form.getItems(FormApp.ItemType.LIST);
  for (var i = 0; i < items.length; i++) {
    if (items[i].getTitle() === PREGUNTA_CATEGORIA) {
      items[i].asListItem().setChoiceValues(leerCategorias_());
      Logger.log("✓ Categorías actualizadas");
      return;
    }
  }
  throw new Error('No encontré la pregunta "' + PREGUNTA_CATEGORIA + '" en el formulario');
}

/** Se ejecuta solo con cada respuesta: hace pública la foto subida. */
function alEnviarFormulario(e) {
  var respuestas = e.response.getItemResponses();
  for (var i = 0; i < respuestas.length; i++) {
    if (respuestas[i].getItem().getType() !== FormApp.ItemType.FILE_UPLOAD) continue;
    var ids = respuestas[i].getResponse();
    for (var j = 0; j < ids.length; j++) compartir_(ids[j]);
  }
}

/** Por si alguna foto quedó privada: recorre la columna Foto y las hace públicas. */
function compartirFotosSubidas() {
  var hoja = SpreadsheetApp.getActive().getSheetByName(HOJA_RESPUESTAS);
  if (!hoja) throw new Error('No existe la hoja "' + HOJA_RESPUESTAS + '"');
  var valores = hoja.getDataRange().getDisplayValues();
  var col = -1;
  valores[0].forEach(function (c, i) {
    if (col === -1 && c.toString().toLowerCase().indexOf("foto") !== -1) col = i;
  });
  if (col === -1) throw new Error("No hay ninguna columna con la palabra foto: agregá la pregunta de subir archivo al formulario");
  var cantidad = 0;
  for (var i = 1; i < valores.length; i++) {
    var m = /[?&]id=([\w-]+)/.exec(valores[i][col]);
    if (m) {
      compartir_(m[1]);
      cantidad++;
    }
  }
  Logger.log("✓ " + cantidad + " fotos públicas");
}

function compartir_(idArchivo) {
  try {
    DriveApp.getFileById(idArchivo).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    Logger.log("No se pudo compartir " + idArchivo + ": " + error);
  }
}

// ===========================================================================
// Formularios para cargar resultados, goles y tarjetas desde el celular
//
// Hay dos formularios:
//  - "Cargar resultado": elegís el partido y ponés los goles de cada equipo.
//    Completa goles_local, goles_visitante y estado = finalizado en Partidos.
//  - "Cargar gol o tarjeta": una respuesta por cada gol o tarjeta. Agrega una
//    fila en Eventos con el id del jugador, así la app lo reconoce sin errores.
//
// Cada respuesta queda anotada en las pestañas CargaResultados y CargaEventos,
// con una columna "Estado de la carga" que dice OK o qué salió mal.
// ===========================================================================

var HOJA_PARTIDOS = "Partidos";
var HOJA_EVENTOS = "Eventos";
var HOJA_JUGADORES = "Jugadores";
var HOJA_CARGA_RESULTADOS = "CargaResultados";
var HOJA_CARGA_EVENTOS = "CargaEventos";
var COLUMNA_ESTADO = "Estado de la carga";

/** Clave que piden los formularios de carga, para que no cargue cualquiera. Cambiala ANTES de crearlos. */
var CLAVE_CARGA = "falucho2026";

var Q = {
  clave: "Clave de carga",
  partido: "Partido",
  golesPrimero: "Goles del primer equipo (el que figura primero)",
  golesSegundo: "Goles del segundo equipo",
  penalesPrimero: "Penales del primer equipo (solo si se definió por penales)",
  penalesSegundo: "Penales del segundo equipo (solo si se definió por penales)",
  arbitro: "Árbitro (solo si cambió)",
  tipo: "¿Qué pasó?",
  jugador: "Jugador",
  otroJugador: "Si el jugador no está en la lista: equipo y nombre (ej: 1995 - Juan Perez)",
  minuto: "Minuto (opcional)",
  fechas: "Fechas de suspensión (solo en roja directa, si ya las definió la comisión)",
};

var TIPOS_EVENTO = {
  "Gol": "gol",
  "Gol en contra (de quien lo hizo)": "gol en contra",
  "Tarjeta amarilla": "amarilla",
  "Tarjeta roja": "roja",
};

var NOMBRE_FASE = {
  octavos: "Octavos",
  cuartos: "Cuartos",
  semis: "Semifinal",
  semi: "Semifinal",
  semifinal: "Semifinal",
  final: "Final",
  "tercer puesto": "Tercer puesto",
};

// ---- Lectura de la planilla (funciones puras: reciben los valores de la hoja) ----

function sinAcentos_(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Igual que normalizarCodigo de la app: "Clase 1990" → "CLASE1990", "8 y pico" → "8YPICO". */
function codigo_(s) {
  return sinAcentos_(s).toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function clave_(s) {
  return sinAcentos_(s).toLowerCase().trim();
}

function nombreNorm_(s) {
  return sinAcentos_(s).toLowerCase().replace(/["'“”]/g, "").replace(/\s+/g, " ").trim();
}

function capitalizar_(s) {
  return String(s).trim().replace(/\s+/g, " ").replace(/(^|[\s-])\S/g, function (l) {
    return l.toUpperCase();
  });
}

function celda_(fila, i) {
  return i === undefined || i < 0 || fila[i] === undefined || fila[i] === null ? "" : String(fila[i]).trim();
}

/** Índice de cada columna según su título: {"id": 0, "ano": 1, ...}. */
function columnas_(encabezado) {
  var mapa = {};
  encabezado.forEach(function (c, i) {
    var k = clave_(c);
    if (k && mapa[k] === undefined) mapa[k] = i;
  });
  return mapa;
}

function columnaQueEmpieza_(encabezado, prefijos) {
  for (var i = 0; i < encabezado.length; i++) {
    var c = clave_(encabezado[i]);
    for (var j = 0; j < prefijos.length; j++) if (c.indexOf(prefijos[j]) === 0) return i;
  }
  return -1;
}

/** Equipos de la hoja Equipos, con la misma forma de reconocer "90", "1990" o "8 y pico" que la app. */
function leerEquipos_(valores) {
  var lista = [];
  var nombreDe = {};
  var aliasDe = {};
  if (valores.length < 2) return { lista: lista, nombreDe: nombreDe, resolver: function () { return null; } };
  var c = columnas_(valores[0]);
  function registrar(alias, id) {
    var k = codigo_(alias);
    if (!k) return;
    var ids = (aliasDe[k] = aliasDe[k] || []);
    if (ids.indexOf(id) === -1) ids.push(id);
  }
  for (var i = 1; i < valores.length; i++) {
    var f = valores[i];
    var id = codigo_(celda_(f, c["id"]));
    if (!id) continue;
    var anio = celda_(f, c["ano"]);
    var nombre = celda_(f, c["nombre"]) || (anio ? "Clase " + anio : id);
    lista.push({ id: id, nombre: nombre });
    nombreDe[id] = nombre;
    registrar(id, id);
    registrar(nombre, id);
    if (/^\d+$/.test(anio)) {
      registrar(anio, id);
      registrar(anio.slice(-2), id);
    }
    celda_(f, c["alias"]).split(",").forEach(function (a) {
      registrar(a, id);
    });
  }
  return {
    lista: lista,
    nombreDe: nombreDe,
    resolver: function (texto) {
      var ids = texto ? aliasDe[codigo_(texto)] : null;
      return ids && ids.length === 1 ? ids[0] : null;
    },
  };
}

/**
 * Jugadores como los arma la app: los de la hoja Jugadores y los de las
 * respuestas de la ficha (la última respuesta de cada persona; sin los
 * ocultos ni los que no autorizaron). Cada uno con el mismo id que usa la app.
 */
function leerJugadores_(valoresJugadores, valoresFicha, equipos) {
  var lista = [];
  var porNombre = {};

  if (valoresJugadores.length > 1) {
    var c = columnas_(valoresJugadores[0]);
    for (var i = 1; i < valoresJugadores.length; i++) {
      var f = valoresJugadores[i];
      var id = codigo_(celda_(f, c["id"]));
      var equipoId = equipos.resolver(celda_(f, c["equipo"]));
      var nombre = celda_(f, c["nombre"]);
      if (!id || !equipoId || !nombre) continue;
      var j = { id: id, equipoId: equipoId, nombre: nombre, apodo: celda_(f, c["apodo"]) };
      lista.push(j);
      porNombre[equipoId + "|" + nombreNorm_(nombre)] = j;
    }
  }

  if (valoresFicha.length > 1) {
    var enc = valoresFicha[0];
    var iNombre = columnaQueEmpieza_(enc, ["nombre"]);
    var iApellido = columnaQueEmpieza_(enc, ["apellido"]);
    var iApodo = columnaQueEmpieza_(enc, ["apodo"]);
    var iCategoria = columnaQueEmpieza_(enc, ["categoria", "equipo", "clase"]);
    var iOculta = columnaQueEmpieza_(enc, ["ocultar", "oculto"]);
    var iAutoriza = columnaQueEmpieza_(enc, ["autoriz", "acepto", "consentimiento"]);
    if (iNombre >= 0 && iApellido >= 0 && iCategoria >= 0) {
      var ultimas = {};
      for (var k = 1; k < valoresFicha.length; k++) {
        var fila = valoresFicha[k];
        var n = celda_(fila, iNombre);
        var a = celda_(fila, iApellido);
        var cat = celda_(fila, iCategoria);
        if (!n || !a || !cat) continue;
        var r = {
          nombre: capitalizar_(n),
          apellido: capitalizar_(a),
          apodo: celda_(fila, iApodo),
          categoria: cat,
          oculta: celda_(fila, iOculta) !== "",
          autoriza: iAutoriza < 0 ? true : celda_(fila, iAutoriza) !== "",
        };
        ultimas[clave_(r.nombre + " " + r.apellido + "|" + cat)] = r;
      }
      Object.keys(ultimas).forEach(function (clave) {
        var r = ultimas[clave];
        if (r.oculta || !r.autoriza) return;
        var equipoId = equipos.resolver(r.categoria);
        if (!equipoId) return;
        var completo = r.nombre + " " + r.apellido;
        var existente = porNombre[equipoId + "|" + nombreNorm_(completo)];
        if (existente) {
          existente.nombre = completo;
          existente.apodo = r.apodo || existente.apodo;
          return;
        }
        var nuevo = { id: equipoId + "-" + codigo_(r.nombre + r.apellido), equipoId: equipoId, nombre: completo, apodo: r.apodo };
        lista.push(nuevo);
        porNombre[equipoId + "|" + nombreNorm_(completo)] = nuevo;
      });
    }
  }

  lista.forEach(function (j) {
    j.etiqueta = equipos.nombreDe[j.equipoId] + " · " + j.nombre + (j.apodo ? ' "' + j.apodo + '"' : "");
  });
  lista.sort(function (x, y) {
    return x.etiqueta.localeCompare(y.etiqueta, "es");
  });
  return lista;
}

function cuando_(fecha, hora) {
  var f = /^(\d{1,2})[\/.-](\d{1,2})/.exec(fecha);
  var h = /^(\d{1,2}):(\d{2})/.exec(hora);
  return ((f ? f[1] + "/" + f[2] : fecha) + " " + (h ? h[1] + ":" + h[2] : hora)).trim();
}

/** Partidos de la hoja Partidos, con el texto que se muestra en la lista del formulario. */
function leerPartidos_(valores, equipos) {
  var lista = [];
  if (valores.length < 2) return lista;
  var c = columnas_(valores[0]);
  for (var i = 1; i < valores.length; i++) {
    var f = valores[i];
    var id = codigo_(celda_(f, c["id"]));
    if (!id) continue;
    var fase = clave_(celda_(f, c["fase"])) || "zona";
    var esZona = fase === "zona" || fase === "grupo" || fase === "grupos";
    var localId = equipos.resolver(celda_(f, c["local"]));
    var visitanteId = equipos.resolver(celda_(f, c["visitante"]));
    var conResultado = celda_(f, c["goles_local"]) !== "" && celda_(f, c["goles_visitante"]) !== "";
    var partes = [id];
    if (esZona) {
      if (celda_(f, c["zona"])) partes.push("Zona " + celda_(f, c["zona"]));
      if (celda_(f, c["fecha_nro"])) partes.push("Fecha " + celda_(f, c["fecha_nro"]));
    } else {
      partes.push((NOMBRE_FASE[fase] || capitalizar_(fase)) + (celda_(f, c["llave"]) ? " " + celda_(f, c["llave"]) : ""));
    }
    partes.push(localId && visitanteId ? equipos.nombreDe[localId] + " vs " + equipos.nombreDe[visitanteId] : "equipos a definir");
    var cuando = cuando_(celda_(f, c["fecha"]), celda_(f, c["hora"]));
    if (cuando) partes.push(cuando);
    lista.push({
      id: id,
      fila: i + 1,
      localId: localId,
      visitanteId: visitanteId,
      conResultado: conResultado,
      etiqueta: partes.join(" · ") + (conResultado ? "  ✔" : ""),
    });
  }
  return lista;
}

function idDePartido_(etiqueta) {
  return codigo_(String(etiqueta).split(" · ")[0]);
}

function entero_(texto) {
  var t = String(texto === undefined || texto === null ? "" : texto).trim();
  if (!/^\d+$/.test(t)) return null;
  return parseInt(t, 10);
}

/** "1995 - Juan Perez" → equipo y nombre. */
function separarEquipoYNombre_(texto) {
  var m = /^\s*(.+?)\s*[-–:]\s*(.+?)\s*$/.exec(texto);
  return m ? { equipo: m[1], nombre: m[2] } : null;
}

function valoresDe_(nombre) {
  var hoja = SpreadsheetApp.getActive().getSheetByName(nombre);
  return hoja ? hoja.getDataRange().getDisplayValues() : [];
}

function leerContextoCarga_() {
  var equipos = leerEquipos_(valoresDe_(HOJA_EQUIPOS));
  return {
    equipos: equipos,
    partidos: leerPartidos_(valoresDe_(HOJA_PARTIDOS), equipos),
    jugadores: leerJugadores_(valoresDe_(HOJA_JUGADORES), valoresDe_(HOJA_RESPUESTAS), equipos),
  };
}

// ---- Crear y mantener los formularios ----

function crearFormulariosDeCarga() {
  var planilla = SpreadsheetApp.getActive();
  var propiedades = PropertiesService.getDocumentProperties();
  if (propiedades.getProperty("formResultadoId")) {
    Logger.log("Ya están creados los formularios de carga:");
    mostrarLinksDeCarga_();
    return;
  }
  var contexto = leerContextoCarga_();
  var partidos = contexto.partidos.map(function (p) {
    return p.etiqueta;
  });
  if (partidos.length === 0) throw new Error("La hoja Partidos no tiene partidos cargados");
  var jugadores = contexto.jugadores.map(function (j) {
    return j.etiqueta;
  });
  var numero = FormApp.createTextValidation().requireNumberBetween(0, 30).setHelpText("Un número entre 0 y 30").build();

  // 1) Resultado
  var resultado = FormApp.create("Copa Falucho · Cargar resultado")
    .setDescription("Para cargar el resultado de un partido. Si te equivocaste, mandalo de nuevo y se pisa el anterior.")
    .setCollectEmail(false)
    .setProgressBar(false)
    .setConfirmationMessage("¡Listo! Si algo no se pudo cargar, figura en la pestaña " + HOJA_CARGA_RESULTADOS + " de la planilla.");
  agregarClave_(resultado);
  resultado.addListItem().setTitle(Q.partido).setHelpText("Los que ya tienen resultado figuran con ✔.").setChoiceValues(partidos).setRequired(true);
  resultado.addTextItem().setTitle(Q.golesPrimero).setRequired(true).setValidation(numero);
  resultado.addTextItem().setTitle(Q.golesSegundo).setRequired(true).setValidation(numero);
  resultado.addTextItem().setTitle(Q.penalesPrimero).setValidation(numero);
  resultado.addTextItem().setTitle(Q.penalesSegundo).setValidation(numero);
  resultado.addTextItem().setTitle(Q.arbitro).setHelpText("Dejalo vacío si dirigió el que estaba en el fixture.");
  vincularHoja_(resultado, HOJA_CARGA_RESULTADOS);

  // 2) Gol o tarjeta
  var evento = FormApp.create("Copa Falucho · Cargar gol o tarjeta")
    .setDescription("Una respuesta por cada gol o tarjeta. Primero cargá el resultado del partido.")
    .setCollectEmail(false)
    .setProgressBar(false)
    .setConfirmationMessage("¡Listo! Si algo no se pudo cargar, figura en la pestaña " + HOJA_CARGA_EVENTOS + " de la planilla.");
  agregarClave_(evento);
  evento.addListItem().setTitle(Q.partido).setChoiceValues(partidos).setRequired(true);
  evento.addMultipleChoiceItem().setTitle(Q.tipo).setChoiceValues(Object.keys(TIPOS_EVENTO)).setRequired(true);
  evento
    .addListItem()
    .setTitle(Q.jugador)
    .setHelpText("Empieza con el equipo. Podés escribir para buscar.")
    .setChoiceValues(jugadores.length ? jugadores : ["(todavía no hay jugadores)"]);
  evento.addTextItem().setTitle(Q.otroJugador).setHelpText("Solo si no lo encontrás arriba.");
  evento.addTextItem().setTitle(Q.minuto).setValidation(FormApp.createTextValidation().requireNumberBetween(0, 120).setHelpText("Un número entre 0 y 120").build());
  evento.addTextItem().setTitle(Q.fechas).setValidation(FormApp.createTextValidation().requireNumberBetween(0, 50).setHelpText("Un número entre 0 y 50").build());
  vincularHoja_(evento, HOJA_CARGA_EVENTOS);

  propiedades.setProperty("formResultadoId", resultado.getId());
  propiedades.setProperty("formEventoId", evento.getId());
  instalarTriggersDeCarga_();

  Logger.log("✓ Formularios de carga creados. La clave que piden es: " + CLAVE_CARGA);
  mostrarLinksDeCarga_();
}

function agregarClave_(form) {
  var patron = "(?i)^" + CLAVE_CARGA.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$";
  form
    .addTextItem()
    .setTitle(Q.clave)
    .setHelpText("Te la pasa el organizador.")
    .setRequired(true)
    .setValidation(FormApp.createTextValidation().requireTextMatchesPattern(patron).setHelpText("La clave no es correcta").build());
}

function vincularHoja_(form, nombre) {
  var planilla = SpreadsheetApp.getActive();
  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilla.getId());
  SpreadsheetApp.flush();
  var hoja = buscarHojaRespuestas_(form);
  if (!hoja) return;
  if (!planilla.getSheetByName(nombre)) hoja.setName(nombre);
  hoja.getRange(1, hoja.getLastColumn() + 1).setValue(COLUMNA_ESTADO);
}

function instalarTriggersDeCarga_() {
  var existentes = ScriptApp.getProjectTriggers().map(function (t) {
    return t.getHandlerFunction();
  });
  // Cada respuesta a un formulario de carga se procesa sola.
  if (existentes.indexOf("alEnviarCarga") === -1) {
    ScriptApp.newTrigger("alEnviarCarga").forSpreadsheet(SpreadsheetApp.getActive()).onFormSubmit().create();
  }
  // Las listas (partidos, jugadores nuevos) se refrescan cada hora.
  if (existentes.indexOf("actualizarFormulariosDeCarga") === -1) {
    ScriptApp.newTrigger("actualizarFormulariosDeCarga").timeBased().everyHours(1).create();
  }
}

function mostrarLinksDeCarga_() {
  var propiedades = PropertiesService.getDocumentProperties();
  var resultado = FormApp.openById(propiedades.getProperty("formResultadoId"));
  var evento = FormApp.openById(propiedades.getProperty("formEventoId"));
  Logger.log("Cargar resultado:      " + resultado.getPublishedUrl());
  Logger.log("Cargar gol o tarjeta:  " + evento.getPublishedUrl());
}

/** Vuelve a cargar en los formularios la lista de partidos y de jugadores. */
function actualizarFormulariosDeCarga() {
  var propiedades = PropertiesService.getDocumentProperties();
  var idResultado = propiedades.getProperty("formResultadoId");
  var idEvento = propiedades.getProperty("formEventoId");
  if (!idResultado || !idEvento) throw new Error("Primero creá los formularios (Copa Falucho → Crear formularios de carga)");
  var contexto = leerContextoCarga_();
  var partidos = contexto.partidos.map(function (p) {
    return p.etiqueta;
  });
  var jugadores = contexto.jugadores.map(function (j) {
    return j.etiqueta;
  });
  cambiarOpciones_(FormApp.openById(idResultado), Q.partido, partidos);
  var evento = FormApp.openById(idEvento);
  cambiarOpciones_(evento, Q.partido, partidos);
  cambiarOpciones_(evento, Q.jugador, jugadores);
  Logger.log("✓ Listas actualizadas: " + partidos.length + " partidos, " + jugadores.length + " jugadores");
}

function cambiarOpciones_(form, titulo, valores) {
  var items = form.getItems(FormApp.ItemType.LIST);
  for (var i = 0; i < items.length; i++) {
    if (items[i].getTitle() === titulo) {
      items[i].asListItem().setChoiceValues(valores.length ? valores : ["(todavía no hay datos)"]);
      return;
    }
  }
  throw new Error('No encontré la pregunta "' + titulo + '" en el formulario');
}

// ---- Procesar cada respuesta ----

/** Se ejecuta sola con cada respuesta a un formulario de carga. */
function alEnviarCarga(e) {
  var hoja = e.range.getSheet();
  var nombre = hoja.getName();
  if (nombre !== HOJA_CARGA_RESULTADOS && nombre !== HOJA_CARGA_EVENTOS) return;

  var estado;
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    estado = nombre === HOJA_CARGA_RESULTADOS ? procesarResultado_(e.namedValues) : procesarEvento_(e.namedValues);
  } catch (error) {
    estado = "ERROR: " + error.message;
  } finally {
    lock.releaseLock();
  }
  escribirEstado_(hoja, e.range.getRow(), estado);

  // Así el ✔ de la lista de partidos queda al día enseguida.
  if (nombre === HOJA_CARGA_RESULTADOS && estado.indexOf("OK") === 0) {
    try {
      actualizarFormulariosDeCarga();
    } catch (error) {
      Logger.log("No se pudieron actualizar las listas: " + error);
    }
  }
}

function valor_(namedValues, titulo) {
  var v = namedValues[titulo];
  return v && v.length ? String(v[0]).trim() : "";
}

function escribirEstado_(hoja, fila, estado) {
  var ultima = hoja.getLastColumn();
  var encabezado = hoja.getRange(1, 1, 1, ultima).getDisplayValues()[0];
  var col = encabezado.indexOf(COLUMNA_ESTADO) + 1;
  if (col === 0) {
    col = ultima + 1;
    hoja.getRange(1, col).setValue(COLUMNA_ESTADO);
  }
  hoja.getRange(fila, col).setValue(estado);
}

function exigirColumnas_(columnas, nombres, hoja) {
  nombres.forEach(function (n) {
    if (columnas[n] === undefined) throw new Error('A la hoja "' + hoja + '" le falta la columna ' + n);
  });
}

function procesarResultado_(nv) {
  var id = idDePartido_(valor_(nv, Q.partido));
  var golesA = entero_(valor_(nv, Q.golesPrimero));
  var golesB = entero_(valor_(nv, Q.golesSegundo));
  if (golesA === null || golesB === null) throw new Error("Faltan los goles de algún equipo");

  var hoja = SpreadsheetApp.getActive().getSheetByName(HOJA_PARTIDOS);
  var valores = hoja.getDataRange().getDisplayValues();
  var c = columnas_(valores[0]);
  exigirColumnas_(c, ["id", "goles_local", "goles_visitante", "estado"], HOJA_PARTIDOS);
  var fila = -1;
  for (var i = 1; i < valores.length; i++) {
    if (codigo_(celda_(valores[i], c["id"])) === id) {
      fila = i + 1;
      break;
    }
  }
  if (fila === -1) throw new Error("No encontré el partido " + id + " en la hoja Partidos");

  hoja.getRange(fila, c["goles_local"] + 1).setValue(golesA);
  hoja.getRange(fila, c["goles_visitante"] + 1).setValue(golesB);
  hoja.getRange(fila, c["estado"] + 1).setValue("finalizado");

  var avisos = [];
  var penalesA = entero_(valor_(nv, Q.penalesPrimero));
  var penalesB = entero_(valor_(nv, Q.penalesSegundo));
  if (penalesA !== null && penalesB !== null && c["penales_local"] !== undefined && c["penales_visitante"] !== undefined) {
    hoja.getRange(fila, c["penales_local"] + 1).setValue(penalesA);
    hoja.getRange(fila, c["penales_visitante"] + 1).setValue(penalesB);
  } else if (penalesA !== null || penalesB !== null) {
    avisos.push("faltó uno de los dos penales: no se cargaron");
  }
  var arbitro = valor_(nv, Q.arbitro);
  if (arbitro && c["arbitro"] !== undefined) hoja.getRange(fila, c["arbitro"] + 1).setValue(arbitro);

  return "OK · " + id + ": " + golesA + " - " + golesB + (avisos.length ? " (" + avisos.join("; ") + ")" : "");
}

function procesarEvento_(nv) {
  var contexto = leerContextoCarga_();
  var id = idDePartido_(valor_(nv, Q.partido));
  var partido = contexto.partidos.filter(function (p) {
    return p.id === id;
  })[0];
  if (!partido) throw new Error("No encontré el partido " + id + " en la hoja Partidos");
  var tipo = TIPOS_EVENTO[valor_(nv, Q.tipo)];
  if (!tipo) throw new Error("No reconocí qué pasó (" + valor_(nv, Q.tipo) + ")");

  var etiqueta = valor_(nv, Q.jugador);
  var otro = valor_(nv, Q.otroJugador);
  var equipoId = null;
  var jugador = "";
  if (etiqueta) {
    var encontrado = contexto.jugadores.filter(function (j) {
      return j.etiqueta === etiqueta;
    })[0];
    if (!encontrado) throw new Error('No encontré al jugador "' + etiqueta + '": la lista cambió, probá de nuevo');
    equipoId = encontrado.equipoId;
    jugador = encontrado.id;
  } else if (otro) {
    var partes = separarEquipoYNombre_(otro);
    if (!partes) throw new Error('Escribilo como "equipo - nombre", por ejemplo "1995 - Juan Perez"');
    equipoId = contexto.equipos.resolver(partes.equipo);
    if (!equipoId) throw new Error('No reconocí el equipo "' + partes.equipo + '"');
    jugador = partes.nombre;
  } else {
    throw new Error("Elegí al jugador de la lista o escribilo abajo");
  }

  if (partido.localId && partido.visitanteId && equipoId !== partido.localId && equipoId !== partido.visitanteId) {
    throw new Error(contexto.equipos.nombreDe[equipoId] + " no juega el partido " + id + ": no se cargó");
  }

  var minuto = entero_(valor_(nv, Q.minuto));
  var fechas = tipo === "roja" ? entero_(valor_(nv, Q.fechas)) : null;
  agregarEvento_({ partido_id: id, tipo: tipo, equipo: equipoId, jugador: jugador, minuto: minuto, fechas_sancion: fechas });
  return "OK · " + id + " · " + tipo + " · " + contexto.equipos.nombreDe[equipoId] + " · " + jugador;
}

/** Agrega una fila al final de la hoja Eventos, en las columnas que correspondan según sus títulos. */
function agregarEvento_(datos) {
  var hoja = SpreadsheetApp.getActive().getSheetByName(HOJA_EVENTOS);
  if (!hoja) throw new Error('No existe la hoja "' + HOJA_EVENTOS + '"');
  var c = columnas_(hoja.getRange(1, 1, 1, hoja.getLastColumn()).getDisplayValues()[0]);
  exigirColumnas_(c, ["partido_id", "tipo", "equipo", "jugador"], HOJA_EVENTOS);
  var ids = hoja.getRange(1, c["partido_id"] + 1, hoja.getMaxRows(), 1).getValues();
  var ultima = 1;
  for (var i = ids.length - 1; i >= 1; i--) {
    if (String(ids[i][0]).trim() !== "") {
      ultima = i + 1;
      break;
    }
  }
  var fila = ultima + 1;
  if (fila > hoja.getMaxRows()) hoja.insertRowsAfter(hoja.getMaxRows(), 100);
  Object.keys(datos).forEach(function (nombre) {
    var valor = datos[nombre];
    if (valor === null || valor === "" || c[nombre] === undefined) return;
    var celda = hoja.getRange(fila, c[nombre] + 1);
    // Como texto, para que "2001-07" o "1995" no se conviertan en fecha o número.
    if (typeof valor === "string") celda.setNumberFormat("@");
    celda.setValue(valor);
  });
}
