import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Vite uses WEB_PORT (not PORT) so it can coexist with the api-server on the
// same .env. PORT belongs to the api-server in production (single-service);
// vite is dev-only here.
const rawPort = process.env.WEB_PORT;
const port = rawPort && !Number.isNaN(Number(rawPort)) && Number(rawPort) > 0
  ? Number(rawPort)
  : 5173;

// In dev, proxy /api/* to the api-server (defaults to localhost:8081).
// In production the api-server serves both the static frontend and /api
// from the same port, so this proxy is dev-only.
const rawApiPort = process.env.PORT;
const apiPort = rawApiPort && !Number.isNaN(Number(rawApiPort)) && Number(rawApiPort) > 0
  ? Number(rawApiPort)
  : 8081;
const apiTarget = process.env.API_DEV_TARGET ?? `http://localhost:${apiPort}`;

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        (await import("tailwindcss")).default,
        (await import("autoprefixer")).default,
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
