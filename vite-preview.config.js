import { defineConfig } from "vite";

// Builds the demo as a plain IIFE bundle with every asset inlined, so
// `scripts/build-preview.mjs` can fold it into one HTML file that opens
// straight from disk (no server, no module/CORS restrictions).
export default defineConfig({
  base: "./",
  build: {
    outDir: "./build-preview",
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100 * 1024 * 1024,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "app.js",
        assetFileNames: "app.[ext]",
      },
    },
  },
});
