import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    // rollupOptions: {
    //   input: "./src/web/main.ts",
    // },
    outDir: "./build",
    emptyOutDir: true,
  },
});
