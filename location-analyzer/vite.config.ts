import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "@oeffis/location-analyzer",
      formats: ["es", "umd"]
    }
  },
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: true,
      declarationDir: "./dist"
    })
  ]
});
