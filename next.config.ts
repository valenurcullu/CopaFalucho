import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos que suben los jugadores por el formulario (Google Drive). El servidor
    // las baja una vez, las optimiza y las guarda: Google no recibe una consulta
    // por cada persona que mira la app (si no, corta con "demasiadas solicitudes").
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/d/**", search: "" }],
    // Cada foto nueva tiene otra dirección, así que se puede guardar por mucho tiempo.
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSerwist(nextConfig);
