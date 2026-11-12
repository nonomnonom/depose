import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const jestPackage = require.resolve('jest/package.json');
const jestBin = join(dirname(jestPackage), 'bin', 'jest.js');

const run = spawnSync(
  process.execPath,
  [
    '--experimental-vm-modules',
    jestBin,
    '--config',
    'jest.config.mjs',
    '--forceExit',
    ...process.argv.slice(2),
  ],
  { stdio: 'inherit' },
);

process.exit(run.status ?? 1);
