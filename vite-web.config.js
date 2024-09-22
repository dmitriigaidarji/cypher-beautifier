import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "cypher-beautifier",
  build: {
    // rollupOptions: {
    //   input: "./src/web/main.ts",
    // },
    outDir: "./build",
    emptyOutDir: true,
  },
});
