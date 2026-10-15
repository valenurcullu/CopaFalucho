# Copa Falucho · Club Pucará

App web del torneo de fútbol de fin de año del Club Pucará: fixture, tablas, llaves, goleadores, tarjetas, equipos y figuritas de los jugadores. Se instala en el celular desde el navegador (sin App Store ni Play Store) y funciona sin señal con lo último que se vio.

Los datos salen de una planilla de Google: el admin carga resultados ahí y la app se actualiza sola.

---

## Índice

1. [Cómo cargar resultados en la planilla](#1-cómo-cargar-resultados-en-la-planilla)
2. [Cómo armar el torneo del año que viene](#2-cómo-armar-el-torneo-del-año-que-viene)
3. [Cómo desplegar en Vercel](#3-cómo-desplegar-en-vercel)
4. [Cómo generar el QR](#4-cómo-generar-el-qr)
5. [Fotos y fichas de jugadores](#5-fotos-y-fichas-de-jugadores)
6. [Cambiar colores, logo o nombre](#6-cambiar-colores-logo-o-nombre)
7. [Para desarrollar](#7-para-desarrollar)

---

## 1. Cómo cargar resultados en la planilla

Desde el celular, con la app **Hojas de cálculo de Google**. La app pública toma los cambios en **5 a 10 minutos**.

### Un partido, paso a paso

1. En la hoja **Partidos**, en la fila del partido, escribí el resultado en `goles_local` y `goles_visitante` y cambiá `estado` a **finalizado** (o **en juego** si lo querés mostrar en vivo). Con eso ya se actualizan las tablas y las llaves.
2. **Opcional, pero recomendado:** en la hoja **Eventos**, una fila por cada gol y cada tarjeta, para goleadores, tarjetas y el detalle del partido:

   | partido_id | tipo | equipo | jugador | minuto |
   |---|---|---|---|---|
   | Z07 | gol | 2001 | mapache | 12 |
   | Z07 | amarilla | 90 | Perrone | 30 |
   | Z07 | gol en contra | 2003 | 2003-02 | |

   - `tipo`: `gol`, `gol en contra`, `amarilla` o `roja`.
   - `equipo`: el equipo **del jugador**, escrito como quieras (`1990`, `90`, `8ypico`…). En un gol en contra, el del que lo hizo; la app se lo suma al rival.
   - `jugador`: el apodo, el apellido, el nombre o el id de la hoja Jugadores. Si el jugador no está cargado, la app lo agrega sola con ese nombre, así que goleadores y tarjetas funcionan aunque la hoja Jugadores esté vacía.
   - `minuto` es opcional.
3. Si el resultado no está escrito, la app lo calcula con los goles de Eventos. Si está escrito y en Eventos hay **más** goles que en el resultado, lo avisa en `/admin/chequeo`. Que haya menos es normal: no siempre se sabe quién hizo todos los goles.
4. `árbitro`: un nombre o la clase que arbitra (`2000`); si es una clase, la app muestra "Clase 2000".

### Fase final (cuartos, semis, final)

- Las filas de fase final ya tienen la columna `llave` (C1, C2…, S1, S2, F) y `local`/`visitante` **vacíos**: la app completa los equipos sola cuando termina cada zona y cada llave.
- Si una llave termina empatada, cargá `penales_local` y `penales_visitante` en la fila del partido.
- Si por algún motivo querés forzar un cruce (por ejemplo, un empate en la tabla que se definió por sorteo), escribí el equipo en `local` o `visitante`: lo cargado a mano tiene prioridad.

### Si algo no aparece

Entrá a **`/admin/chequeo`** (por ejemplo `https://copa-falucho.vercel.app/admin/chequeo`). Muestra las filas con errores (que la app ignoró) y las advertencias, con la hoja y el número de fila. La app nunca se rompe por una fila mal cargada: la saltea.

Reglas que conviene respetar:

- Los nombres de las **pestañas** y de las **columnas** tienen que quedar exactamente como en la planilla de ejemplo.
- Fechas `dd/mm/aaaa`, horas `hh:mm`.
- No mezcles números y texto en una misma columna de ids (la planilla de ejemplo ya tiene esas columnas en formato texto).

---

## 2. Cómo armar el torneo del año que viene

1. **Copiá la planilla** (Archivo → Hacer una copia) y en la copia:
   - **Equipos**: una fila por equipo, con `id` y `zona`.
     - Para una clase: `id` = `2002` y `año` = `2002`. Se muestra "Clase 2002" y en la planilla se puede escribir `2002` o `02`.
     - Para un equipo de varias generaciones o con otro nombre: `id` = `8YPICO`, `nombre` = `80 y pico`, `sigla` = `80+` (lo que va adentro del círculo) y `alias` = `8 y pico, 80` (otras formas en que lo escriben, separadas por coma).
   - **Jugadores**: `id` con el formato `año-número de orden` (ej. `2002-07`). Las fotos se cargan con el importador (sección 5).
   - **Partidos**: borrá las filas viejas y cargá el fixture nuevo. Para la fase de zonas: `id` (Z01, Z02…), `fase` = zona, `zona`, `fecha_nro`, `fecha`, `hora`, `cancha`, `local`, `visitante`, `árbitro`, `estado` = programado. Para la fase final: una fila por llave con `fase` y `llave`, sin equipos.
   - **Eventos**: vaciala (dejá solo el encabezado).
2. **Formato**: en [src/config/torneo.ts](src/config/torneo.ts):
   - `edicion`: el año del torneo.
   - `formato.clasificadosPorZona`: cuántos pasan de cada zona.
   - `formato.cruces`: `"general"` (como en 2024: los clasificados se ordenan en una tabla general y se cruza 1º-8º, 2º-7º, 3º-6º, 4º-5º) o `"zonas"` (1A-2B, 1B-2A…).
   - `formato.tercerPuesto`: `true` si se juega el partido por el tercer puesto (agregá la fila con llave `T`).
   - `desempate`: el orden de criterios. Opciones: `diferencia_gol`, `goles_a_favor`, `fair_play`, `enfrentamiento_directo`.
   - `puntos` y `fairPlay` (puntos por amarilla y por roja).
3. **Los cruces se arman solos** según las zonas que haya en la hoja Equipos y los clasificados por zona. Con `cruces: "general"` se usa la tabla general (en la pantalla Tablas aparece abajo de todo). Con `cruces: "zonas"`, el cuadro queda así; en los dos casos la cantidad total de clasificados tiene que ser 2, 4, 8 o 16:

   | Zonas | Pasan por zona | Fase final | Llaves para cargar en Partidos |
   |---|---|---|---|
   | 4 | 2 | cuartos (1A-2B, 1C-2D, 1B-2A, 1D-2C) | C1–C4, S1, S2, F |
   | 2 | 2 | semis (1A-2B, 1B-2A) | S1, S2, F |
   | 4 | 1 | semis (1A-1B, 1C-1D) | S1, S2, F |
   | 8 | 2 | octavos | O1–O8, C1–C4, S1, S2, F |
   | 2 | 4 | cuartos (1A-4B, 2B-3A, 1B-4A, 2A-3B) | C1–C4, S1, S2, F |

   Con el formato de 2 por zona, los dos equipos de una misma zona solo se pueden volver a cruzar en la final.

   Si querés un cuadro distinto (por ejemplo, con mejores terceros), en `formato.llaves` se puede pasar la lista de llaves a mano en vez de `"auto"`; el tipo `LlaveConfig` en [src/domain/config.ts](src/domain/config.ts) explica cada campo. Si el formato no cierra, la app lo avisa arriba del fixture.
4. Si cambiaste de planilla, actualizá `GOOGLE_SHEET_ID` en Vercel (sección 3) y volvé a desplegar.

---

## 3. Cómo desplegar en Vercel

Todo es gratis con el plan Hobby de Vercel.

### Primera vez

1. **Planilla**
   1. Subí [data/planilla-ejemplo.xlsx](data/planilla-ejemplo.xlsx) a Google Drive y abrila con Hojas de cálculo de Google.
   2. **Archivo → Guardar como Hojas de cálculo de Google** (importante: la app lee planillas de Google, no archivos .xlsx).
   3. **Compartir → Acceso general → Cualquier persona con el vínculo → Lector**.
   4. Copiá el ID de la URL: es lo que está entre `/d/` y `/edit`.
      `https://docs.google.com/spreadsheets/d/`**`1AbC…xyz`**`/edit`
2. **GitHub**: creá un repositorio vacío (por ejemplo `copa-falucho`) en github.com y subí el código:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/copa-falucho.git
   git push -u origin main
   ```
3. **Vercel**
   1. Entrá a [vercel.com/new](https://vercel.com/new) con tu cuenta de GitHub e importá el repositorio. Vercel detecta Next.js solo.
   2. En **Environment Variables** agregá `GOOGLE_SHEET_ID` con el ID de la planilla.
   3. **Deploy**. En un par de minutos queda en `https://copa-falucho.vercel.app` (o el nombre que elijas en Settings → Domains).

Sin `GOOGLE_SHEET_ID` la app muestra los datos de ejemplo: sirve para probar.

### Después

Cada `git push` a `main` vuelve a desplegar solo. Los **resultados no necesitan deploy**: se leen de la planilla. Solo hace falta desplegar si cambiás código, configuración, logo o fotos.

---

## 4. Cómo generar el QR

```bash
npm run qr -- https://copa-falucho.vercel.app
```

Deja en la carpeta `qr/`:

- `cartel.png`: cartel A4 con el escudo y el QR, listo para imprimir y pegar en la cancha.
- `qr.svg`: el QR solo, para imprimir en cualquier tamaño sin perder calidad.
- `qr.png`: para mandar por WhatsApp o redes.

El QR tiene corrección de errores alta: se sigue leyendo aunque el cartel se moje o se arrugue un poco.

---

## 5. Fotos y fichas de jugadores

### Importar el álbum

Necesitás un CSV con las columnas de la hoja Jugadores (`id, equipo, nombre, apodo, número, posición, peso_kg, altura_cm`; apodo, peso y altura son opcionales) y una carpeta con las fotos, cada una con el **id del jugador como nombre de archivo** (`2001-07.jpg`). Se aceptan jpg, png, webp, avif y tiff; mayúsculas o minúsculas da igual.

```bash
# Solo revisar, sin escribir nada:
npm run jugadores:importar -- --csv album.csv --fotos ./fotos --validar

# Importar:
npm run jugadores:importar -- --csv album.csv --fotos ./fotos
```

El importador:

- valida el CSV (columnas, ids repetidos, nombres vacíos, pesos y alturas imposibles, números repetidos en una clase) y avisa fila por fila;
- endereza cada foto, la recorta a 4:5 centrándose en lo importante (la cara) y la guarda en WebP (600×750, unas decenas de KB) en `public/jugadores/`;
- escribe `data/jugadores-importados.csv`, listo para pegar en la hoja Jugadores;
- registra las fotos en `src/generated/fotos-jugadores.json`, así la app las usa aunque la planilla no tenga `foto_url`.

Después: `git add public/jugadores src/generated && git commit -m "Fotos de jugadores" && git push`.

Si un jugador no tiene foto, la figurita muestra una silueta.

### Mostrar u ocultar fichas

En [src/config/torneo.ts](src/config/torneo.ts):

- `jugadores.mostrarFichas: false` oculta las figuritas (los planteles se siguen viendo, sin link).
- `jugadores.mostrarPesoAltura: false` saca peso y altura de la figurita.

---

## 6. Cambiar colores, logo o nombre

Todo está centralizado:

- **[src/config/marca.ts](src/config/marca.ts)**: nombre del torneo, club, descripción, logo y la paleta completa para modo claro y oscuro. Los colores actuales salen de clubpucara.org (azul `#303083`, rojo `#EE1C23`) y del escudo de la copa (dorado).
- **[src/theme/fuentes.ts](src/theme/fuentes.ts)**: tipografías (Montserrat, la de la web del club, y Barlow Condensed para títulos y marcadores).
- **Logo**: reemplazá `assets/marca/logo-copa-falucho.png` (PNG con fondo transparente) y `public/marca/logo-copa-falucho.png`, actualizá `ancho` y `alto` en `marca.ts` y corré `npm run iconos:generar` para regenerar los íconos de la app.

---

## 7. Para desarrollar

Requisitos: Node 22 o más.

```bash
npm install
cp .env.example .env.local   # opcional: GOOGLE_SHEET_ID para usar la planilla real
npm run dev                  # http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (el service worker está desactivado en desarrollo) |
| `npm run build && npm start` | Versión de producción local, con offline |
| `npm test` | Tests (Vitest): tablas, desempates, llaves, lectura de la planilla, importador |
| `npm run typecheck` / `npm run lint` | Chequeos de tipos y estilo |
| `npm run ejemplo:generar` | Regenera los datos de ejemplo de `data/ejemplo/` |
| `npm run planilla:generar` | Regenera `data/planilla-ejemplo.xlsx` desde los datos de ejemplo |
| `npm run iconos:generar` | Regenera los íconos de la app desde el logo |
| `npm run jugadores:importar` | Importador de jugadores y fotos (sección 5) |
| `npm run qr -- <url>` | QR y cartel (sección 4) |

### Estructura

```
src/
  app/                 Pantallas (App Router), manifest y service worker (sw.ts)
  components/          UI: layout, partidos, tablas, llaves, estadísticas, jugadores, pwa
  config/              torneo.ts (reglas y formato) y marca.ts (identidad visual)
  domain/              Tipos del dominio y de la configuración
  lib/datos/           Lectura de la planilla o del ejemplo, validación por fila
  lib/torneo/          Lógica pura: marcadores, tablas, desempates, llaves, estadísticas, rachas
  theme/               Fuentes y variables CSS generadas desde marca.ts
data/
  ejemplo/             Datos de ejemplo en CSV, con el formato exacto de la planilla
  planilla-ejemplo.xlsx
scripts/               Generadores (ejemplo, planilla, íconos, QR) e importador de jugadores
```

### Problemas comunes

- **El deploy falla con "La hoja X no tiene las columnas…"**: la pestaña no se llama exactamente `Equipos`, `Partidos`, `Eventos` o `Jugadores`, o le cambiaron el encabezado.
- **"Google devolvió una página en vez de la hoja"**: la planilla no está compartida como "Cualquier persona con el vínculo".
- **Un cambio no aparece**: esperá 10 minutos y tocá el botón de actualizar arriba a la derecha. Si sigue igual, mirá `/admin/chequeo`.
- Si Google no responde en un momento dado, la app sigue mostrando la última versión buena.

### Decisiones técnicas

- **Datos**: Google Sheets compartida con link, leída del lado del servidor por el endpoint `gviz` (devuelve el estado actual, sin la demora de "Publicar en la Web"). Las páginas son estáticas y se regeneran cada 5 minutos (ISR): los resultados se cargan a la noche o al día siguiente, no hace falta tiempo real, y así Google casi no recibe consultas.
- **Offline**: service worker con [Serwist](https://serwist.pages.dev). Precachea los archivos de la app; las páginas van primero por red y, si no hay señal o tarda más de 3 segundos, muestran la última versión guardada. Al instalarse guarda las cinco pestañas y la página de cada equipo.
- **Cache Components** de Next 16 está desactivado porque Serwist todavía no lo soporta en su versión estable. Cuando lo soporte, se puede activar sin cambiar la lógica.
