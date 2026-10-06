// =============================================================================
// PORTALMAKER — Script de arranque de desarrollo para entornos de red / Windows
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

process.env.WATCHPACK_POLLING = 'true';
process.env.CHOKIDAR_USEPOLLING = '1';
process.env.FAST_REFRESH = 'true';

const { spawn } = require('child_process');
const nextBin = require.resolve('next/dist/bin/next');

const child = spawn(process.execPath, [nextBin, 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    WATCHPACK_POLLING: 'true',
    CHOKIDAR_USEPOLLING: '1',
    FAST_REFRESH: 'true',
  },
});

child.on('exit', (code, signal) => {
  if (code !== null) process.exit(code);
  if (signal !== null) process.kill(process.pid, signal);
});
