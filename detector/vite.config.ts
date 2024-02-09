import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "@public-transit-detector/detector",
      formats: ["es", "umd"]
    }
  },
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: true,
      outDir: "./dist/index.d.ts"
    })
  ]
});
