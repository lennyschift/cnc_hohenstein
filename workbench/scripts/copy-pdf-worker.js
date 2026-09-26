const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// PDF.js Worker
const workerSrc = path.join(root, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.mjs');
const workerDest = path.join(publicDir, 'pdf.worker.mjs');
if (fs.existsSync(workerSrc)) {
  fs.copyFileSync(workerSrc, workerDest);
  console.log('PDF.js Worker nach public/pdf.worker.mjs kopiert.');
} else {
  console.warn('pdf.worker.mjs nicht gefunden – bitte npm install ausführen.');
}

// OCCT WASM (für STEP 3D-Vorschau) – manueller Download, siehe ANLEITUNG-STEP-WASM.md
const wasmDest = path.join(publicDir, 'occt-import-js.wasm');
if (fs.existsSync(wasmDest)) {
  console.log('OCCT WASM bereits in public/occt-import-js.wasm vorhanden.');
} else {
  const occtSrc = path.join(root, 'node_modules', 'occt-import-js', 'dist', 'occt-import-js.wasm');
  if (fs.existsSync(occtSrc)) {
    fs.copyFileSync(occtSrc, wasmDest);
    console.log('OCCT WASM nach public/occt-import-js.wasm kopiert.');
  } else {
    console.warn('');
    console.warn('STEP-3D-Vorschau: occt-import-js.wasm fehlt.');
    console.warn('Bitte ANLEITUNG-STEP-WASM.md im Projektordner lesen und die WASM-Datei');
    console.warn('einmalig von der offiziellen Quelle herunterladen und in public/ ablegen.');
    console.warn('');
  }
}

// opencascade.js WASM (für exaktes Volumen/Oberfläche-Messen, siehe utils/occtMeasure.js)
// Wird direkt aus dem Paket kopiert statt über dessen eigenen index.js-Import
// genutzt zu werden — Vite unterstützt das dortige ESM-Wasm-Importmuster nicht.
const ocMeasureDest = path.join(publicDir, 'opencascade.wasm.wasm');
if (fs.existsSync(ocMeasureDest)) {
  console.log('opencascade.js WASM bereits in public/opencascade.wasm.wasm vorhanden.');
} else {
  const ocMeasureSrc = path.join(root, 'node_modules', 'opencascade.js', 'dist', 'opencascade.wasm.wasm');
  if (fs.existsSync(ocMeasureSrc)) {
    fs.copyFileSync(ocMeasureSrc, ocMeasureDest);
    console.log('opencascade.js WASM nach public/opencascade.wasm.wasm kopiert.');
  } else {
    console.warn('opencascade.js WASM nicht gefunden – Messen-Funktion nicht verfügbar. npm install ausführen.');
  }
}
