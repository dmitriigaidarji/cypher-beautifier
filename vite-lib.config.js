import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const packageName = "cypher-beautifier";

export default defineConfig({
  publicDir: false,
  plugins: [
    dts({
      insertTypesEntry: true,
      tsconfigPath: "tsconfig-lib.json",
    }),
  ],
  build: {
    outDir: "./dist",
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/lib/index.ts"),
      name: packageName,
      fileName: "index",
      formats: ["es", "cjs"],
    },
  },
});
