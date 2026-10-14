/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig, SerwistPlugin } from "serwist";
import { ExpirationPlugin, NetworkFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Rutas principales: se guardan apenas se instala la app para que anden sin señal. */
const RUTAS_PRINCIPALES = ["/", "/tablas", "/llaves", "/estadisticas", "/equipos"];

/** Con señal mala, a los 3 segundos se muestra la última versión guardada. */
const ESPERA_RED_SEGUNDOS = 3;

/**
 * Next agrega un parámetro `_rsc` distinto en cada navegación. Se saca de la
 * clave de caché para que, sin señal, se pueda reusar lo guardado.
 */
const sinParametroRsc: SerwistPlugin = {
  cacheKeyWillBeUsed: async ({ request }) => {
    const url = new URL(request.url);
    if (!url.searchParams.has("_rsc")) return request;
    url.searchParams.delete("_rsc");
    return url.href;
  },
};

const expiracion = () => new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 });

/**
 * Páginas: primero la red (datos al día) y, si no hay señal o tarda, la
 * última versión vista. Van antes que las reglas por defecto de Serwist.
 */
const paginas: RuntimeCaching[] = [
  {
    matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
    handler: new NetworkFirst({ cacheName: "paginas", networkTimeoutSeconds: ESPERA_RED_SEGUNDOS, plugins: [expiracion()] }),
  },
  {
    matcher: ({ request, sameOrigin, url }) =>
      sameOrigin && request.headers.get("RSC") === "1" && !url.pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: "paginas-rsc",
      networkTimeoutSeconds: ESPERA_RED_SEGUNDOS,
      plugins: [sinParametroRsc, expiracion()],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...paginas, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/sin-conexion",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

/**
 * Al instalar, guarda las pantallas principales y la página de cada equipo
 * (sacadas de los links de /equipos), así andan sin señal desde el principio.
 */
async function guardarPantallas() {
  const cache = await caches.open("paginas");
  await Promise.all(RUTAS_PRINCIPALES.map((ruta) => cache.add(ruta).catch(() => undefined)));
  const listado = await cache.match("/equipos");
  if (!listado) return;
  const html = await listado.text();
  const equipos = [...new Set([...html.matchAll(/href="(\/equipos\/[^"/]+)"/g)].map((m) => m[1]))];
  await Promise.all(equipos.map((ruta) => cache.add(ruta).catch(() => undefined)));
}

self.addEventListener("install", (evento) => {
  evento.waitUntil(guardarPantallas());
});

serwist.addEventListeners();
