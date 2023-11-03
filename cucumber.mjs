export default [
    `--format-options '{"snippetInterface": "synchronous"}'`,
    `--require-module ts-node/register`,
    `--require features/stepDefinition/**/*.ts`
].join(" ");
