import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const packageName = "cypher-beautifier";

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: packageName,
      fileName: "index",
      formats: ["es", "cjs"],
    },
  },
});
