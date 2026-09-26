// Web Worker: STEP-Verarbeitung (Anzeige-Netz + exakte Volumen-/Flächen-/Kanten-
// Analyse) im Hintergrund, damit die Oberfläche nicht blockiert. Nimmt immer nur
// EINE Datei gleichzeitig (Warteschlange liegt im Hauptthread, siehe analyseQueue.js).
import { berechneVolumenUndOberflaeche } from './occtMeasure.js';
import { analysiereFlaechen } from './occtFaceMeasure.js';
import { leseStepMeshes } from './occtImport.js';

self.onmessage = async (e) => {
  const { id, file } = e.data;
  try {
    const meshes = await leseStepMeshes(file);
    self.postMessage({ id, typ: 'mesh', meshes });
  } catch (err) {
    self.postMessage({ id, typ: 'mesh', fehler: String(err?.message || err) });
  }
  try {
    const { volumeMm3, oberflaecheMm2 } = await berechneVolumenUndOberflaeche(file);
    const geo = await analysiereFlaechen(file).catch(() => ({ flaechen: [], kanten: [] }));
    self.postMessage({
      id, typ: 'analyse', volumeMm3, oberflaecheMm2, flaechen: geo.flaechen, kanten: geo.kanten,
    });
  } catch (err) {
    self.postMessage({ id, typ: 'analyse', fehler: String(err?.message || err) });
  }
};
