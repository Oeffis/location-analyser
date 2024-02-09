/* eslint-disable @typescript-eslint/naming-convention */
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        lib: {
            entry: "src/index.ts",
            name: "@public-transit-detector/extract-osm-data",
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
        typescript({
            tsconfig: "./tsconfig.json",
            declaration: true,
            declarationDir: "./dist",
            exclude: ["**/*.spec.ts"],
            emitDeclarationOnly: true
        })
    ],
    esbuild: {
        platform: "node"
    }
});
