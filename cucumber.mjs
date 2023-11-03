export default [
    `--format-options '{"snippetInterface": "synchronous"}'`,
    `--require-module ts-node/register`,
    `--require features/stepDefinition/**/*.ts`,
    `--tags "not @ignore"`
].join(" ");
