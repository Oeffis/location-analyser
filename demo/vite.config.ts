import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy()
  ],
  optimizeDeps: {
    include: ["@oeffis/location-analyzer"]
  },
  build: {
    commonjsOptions: {
      include: [/location-analyzer/, /node_modules/]
    }
  }
});
