import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "@public-transit-detector/detector",
      fileName: "index",
      formats: ["es", "umd"]
    }
  },
  plugins: [
    dts({
      rollupTypes: true
    })
  ]
});
