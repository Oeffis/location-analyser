export default [
    `--format-options '{"snippetInterface": "synchronous"}'`,
    `--require-module ts-node/register`,
    `--require features/stepDefinitions/**/*.ts`,
    `--require features/world.ts`,
    `--tags "not @ignore"`
].join(" ");

// eslint-disable-next-line no-undef
process.env.TS_NODE_PROJECT = "features/tsconfig.json";
