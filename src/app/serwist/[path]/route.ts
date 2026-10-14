import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";

/** Versión del despliegue: cambia en cada deploy y renueva lo precacheado. */
const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? randomUUID();

// Sirve /serwist/sw.js: el service worker compilado con la lista de archivos a precachear.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
  additionalPrecacheEntries: [{ url: "/sin-conexion", revision }],
});
