/**
 * Copa Falucho: formulario de jugadores.
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
 * categorías si cambian los equipos.
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
