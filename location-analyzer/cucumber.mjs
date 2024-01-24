import { register } from "node:module";
import { pathToFileURL } from "node:url";

const defaultArgs = [
    `--format-options '{"snippetInterface": "synchronous"}'`,
    `--import features/stepDefinitions/**/*.ts`,
    `--import features/world.ts`,
    `--tags "not @ignore"`
]

export default [
    ...defaultArgs,
    `--tags "not @slow"`
].join(" ");

export const slow = [
    ...defaultArgs,
    `--tags "@slow"`
].join(" ");

// eslint-disable-next-line no-undef
process.env.TS_NODE_PROJECT = "features/tsconfig.json";
register("ts-node/esm", pathToFileURL("./"));
