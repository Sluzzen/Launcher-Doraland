// launch.js — Lanzador del proceso Electron con entorno limpio
const { spawn } = require('child_process');
const path = require('path');

const electronExe = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
const isDev = process.argv.includes('--dev');
const args = isDev ? ['.', '--dev', '--no-sandbox'] : ['.', '--no-sandbox'];

// Limpiar cualquier variación de ELECTRON_RUN_AS_NODE para que Electron abra como GUI
const env = {};
for (const key of Object.keys(process.env)) {
  if (key.toUpperCase() !== 'ELECTRON_RUN_AS_NODE') {
    env[key] = process.env[key];
  }
}

const child = spawn(electronExe, args, {
  stdio: 'inherit',
  cwd: __dirname,
  env: env,
  windowsHide: false
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('Error iniciando Electron:', err.message);
  process.exit(1);
});
