import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const tsc = join(dirname(require.resolve('typescript/package.json')), 'lib', 'tsc.js');

/*
 * Nest resolves constructor dependencies from decorator metadata, which tsx
 * (esbuild) does not emit. Compiling with tsc first keeps the traces identical
 * to production and lets the Node test runner load plain JavaScript.
 */
const build = spawnSync(process.execPath, [tsc, '-p', 'tsconfig.test.json'], {
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 1);

/*
 * `pnpm test test/inconsistencies.e2e.spec.ts` runs a single file; extra flags
 * such as `--test-name-pattern` are forwarded. Without arguments the whole
 * suite runs.
 */
const args = process.argv.slice(2);
const toCompiled = (file) => `.test-dist/${file.replace(/^\.\//, '').replace(/\.ts$/, '.js')}`;
const files = args.filter((arg) => !arg.startsWith('-'));
const flags = args.filter((arg) => arg.startsWith('-'));
const targets = files.length ? files.map(toCompiled) : ['.test-dist/test/**/*.spec.js'];

const run = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-concurrency=2',
    '--test-reporter=spec',
    '--test-force-exit',
    ...flags,
    ...targets,
  ],
  { stdio: 'inherit' },
);

process.exit(run.status ?? 1);
