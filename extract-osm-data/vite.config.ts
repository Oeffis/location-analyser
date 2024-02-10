/* eslint-disable @typescript-eslint/naming-convention */
import dts from "vite-plugin-dts";
import { defineConfig } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        lib: {
            entry: "src/index.ts",
            name: "@public-transit-detector/extract-osm-data",
            fileName: "index",
            formats: ["es", "umd"]
        },
        rollupOptions: {
            external: ["fs", "fs/promises", "path", "util", "url", "assert", "node:zlib", "node:stream", "node:fs"],
            output: {
                globals: {
                    fs: "fs",
                    "fs/promises": "fs.promises",
                    path: "path",
                    util: "util",
                    url: "url",
                    assert: "assert",
                    "node:zlib": "zlib",
                    "node:stream": "stream",
                    "node:fs": "fs"
                }
            }
        }
    },
    plugins: [
        dts({
            rollupTypes: true
        })
    ],
    esbuild: {
        platform: "node"
    },
    test: {
        include: ["src/**/*.spec.ts"]
    }
});
