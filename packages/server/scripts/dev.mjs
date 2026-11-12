import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/* Nest CLI requires the TypeScript programmatic API, which TypeScript 7 does
 * not ship yet, so `dev` compiles with plain `tsc --watch` and runs the build
 * output with `node --watch`: save a file, tsc rebuilds dist, node restarts. */

const require = createRequire(import.meta.url);
const tscBin = join(dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');

const compiler = spawn(process.execPath, [tscBin, '-p', 'tsconfig.json', '--watch', '--preserveWatchOutput'], {
  stdio: 'inherit',
});

const entrypoint = resolve('dist/main.js');
const startedAt = Date.now();
while (!existsSync(entrypoint)) {
  if (Date.now() - startedAt > 120_000) {
    console.error('[dev] dist/main.js was not produced within 120s; check compiler errors above.');
    compiler.kill();
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 300));
}

const server = spawn(process.execPath, ['--watch', entrypoint], { stdio: 'inherit' });

function shutdown() {
  server.kill();
  compiler.kill();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.on('exit', (code) => {
  console.error(`[dev] server exited (${code}); compiler keeps watching.`);
});
compiler.on('exit', (code) => {
  console.error(`[dev] compiler exited (${code})`);
  server.kill();
  process.exit(code ?? 1);
});
