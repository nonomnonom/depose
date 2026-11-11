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

const run = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-concurrency=2',
    '--test-reporter=spec',
    '.test-dist/test/**/*.spec.js',
  ],
  { stdio: 'inherit' },
);

process.exit(run.status ?? 1);
