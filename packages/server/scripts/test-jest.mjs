import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const jestPackage = require.resolve('jest/package.json');
const jestBin = join(dirname(jestPackage), 'bin', 'jest.js');

const args = process.argv.slice(2);
/* The level configs select the suite; default to the E2E config for back-compat. */
const hasConfig = args.some((arg) => arg === '-c' || arg === '--config');
const configArgs = hasConfig ? [] : ['--config', 'jest.config.mjs'];

const run = spawnSync(
  process.execPath,
  [
    '--experimental-vm-modules',
    jestBin,
    ...configArgs,
    '--forceExit',
    ...args,
  ],
  { stdio: 'inherit' },
);

process.exit(run.status ?? 1);
