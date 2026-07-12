import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { defineConfig } from "vite";

// Multi-pages : une page statique par langue (/, /en/, /fr/). Chaque HTML porte
// son propre <head> localisé + hreflang ; le même bundle React lit la langue via
// le chemin (voir src/i18n.js). Base absolue « / » pour les sous-dossiers.
export default defineConfig({
    base: "/",
    plugins: [react(), tailwindcss()],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                en: resolve(__dirname, "en/index.html"),
                fr: resolve(__dirname, "fr/index.html"),
            },
        },
    },
});
