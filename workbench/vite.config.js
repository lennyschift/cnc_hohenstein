import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    // Verhindert, dass Vites Dependency-Scanner beim Start opencascade.js über
    // seinen eigenen Paket-Haupteintrag (index.js) crawlt — dieser nutzt ein
    // ESM-Wasm-Importmuster, das Vite nicht unterstützt (siehe occtMeasure.js).
    // Wir laden das Paket ohnehin gezielt über den direkten dist/-Pfad.
    exclude: ['opencascade.js'],
  },
  // Web Worker (STEP-Analyse) nutzt dynamische Imports → ES-Format nötig
  worker: { format: 'es' },
  server: {
    // Fest auf 5173 statt automatisch auf einen anderen Port auszuweichen —
    // die Mail-Bridge (mail_bridge.py) lässt per CORS nur diesen einen
    // bekannten Ursprung zu. Bei belegtem Port lieber ein klarer Fehler
    // als ein stillschweigend anderer Port.
    port: 5173,
    strictPort: true,
  },
});
