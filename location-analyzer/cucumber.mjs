import { register } from "node:module";
import { pathToFileURL } from "node:url";
export default [
    `--format-options '{"snippetInterface": "synchronous"}'`,
    `--import features/stepDefinitions/**/*.ts`,
    `--import features/world.ts`,
    `--tags "not @ignore"`
].join(" ");

// eslint-disable-next-line no-undef
process.env.TS_NODE_PROJECT = "features/tsconfig.json";
register("ts-node/esm", pathToFileURL("./"));
