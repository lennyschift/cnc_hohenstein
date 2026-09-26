/**
 * Sucht occt-import-js.wasm im Projektordner (z. B. nach dem Entpacken der
 * GitHub-Release-ZIP) und kopiert sie nach public/.
 * Ausführen: node scripts/copy-occt-wasm.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const dest = path.join(publicDir, 'occt-import-js.wasm');

const searchPaths = [
  path.join(root, 'occt-import-js.wasm'),
  path.join(root, 'public', 'occt-import-js.wasm'),
  path.join(root, 'node_modules', 'occt-import-js', 'dist', 'occt-import-js.wasm'),
  path.join(root, 'occt-import-js-0.0.23', 'dist', 'occt-import-js.wasm'),
  path.join(root, 'occt-import-js-0.0.23', 'occt-import-js.wasm'),
  path.join(root, 'dist', 'occt-import-js.wasm'),
];

function findWasm() {
  for (const p of searchPaths) {
    if (fs.existsSync(p)) return p;
  }
  const dirs = fs.readdirSync(root, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory() || d.name.startsWith('.') || d.name === 'node_modules') continue;
    const inDist = path.join(root, d.name, 'dist', 'occt-import-js.wasm');
    if (fs.existsSync(inDist)) return inDist;
    const inRoot = path.join(root, d.name, 'occt-import-js.wasm');
    if (fs.existsSync(inRoot)) return inRoot;
  }
  return null;
}

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const src = findWasm();
if (src) {
  fs.copyFileSync(src, dest);
  const stat = fs.statSync(dest);
  console.log('OK: occt-import-js.wasm nach public/ kopiert (' + Math.round(stat.size / 1024 / 1024) + ' MB).');
} else {
  console.log('occt-import-js.wasm wurde nicht gefunden.');
  console.log('Durchsuchte Orte:');
  searchPaths.forEach((p) => console.log('  -', path.relative(root, p)));
  console.log('  - <beliebiger Unterordner>/dist/occt-import-js.wasm');
  console.log('');
  console.log('Bitte:');
  console.log('1. ZIP von GitHub Releases entpacken.');
  console.log('2. Datei occt-import-js.wasm suchen (oft im Ordner dist/).');
  console.log('3. Diese Datei in den Ordner public/ dieses Projekts legen.');
  console.log('   Oder erneut dieses Skript ausführen, nachdem die WASM im Projektordner liegt.');
  process.exit(1);
}
