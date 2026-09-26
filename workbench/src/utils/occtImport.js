// occt-import-js (WASM) nur EINMAL pro Seite laden/initialisieren und danach für
// alle STEP-Dateien wiederverwenden. Vorher wurde das WASM-Modul bei JEDER Datei
// neu kompiliert und initialisiert — bei vielen Bauteilen ein großer Teil der
// Ladezeit.
let occtPromise = null;

export function getOcctImport() {
  if (!occtPromise) {
    occtPromise = (async () => {
      const mod = await import('occt-import-js');
      let factory = mod.default ?? mod;
      if (typeof factory === 'object' && factory !== null && typeof factory.default === 'function') {
        factory = factory.default;
      }
      if (typeof factory !== 'function') {
        factory = mod.occtimportjs ?? mod;
      }
      if (typeof factory !== 'function') {
        throw new Error('occt-import-js konnte nicht geladen werden. Bitte ANLEITUNG-STEP-WASM.md beachten.');
      }
      const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '';
      const wasmPath = (base.endsWith('/') ? base : base + '/') + 'occt-import-js.wasm';
      return factory({ locateFile: () => wasmPath });
    })().catch((e) => {
      occtPromise = null; // bei Fehler nächstes Mal erneut versuchen
      throw e;
    });
  }
  return occtPromise;
}

// Schnelles Anzeige-Netz (für den 3D-Viewer) — gemeinsam von Viewer (Hauptthread,
// Fallback) und Analyse-Worker (Hintergrund) genutzt, damit beide identisch meshen.
// Feinere Triangulierung als der Standard: absoluter Wert in mm passt für typische
// CNC-Einzelteile besser als ein von der Bauteilgröße abhängiges Verhältnis.
export async function leseStepMeshes(file) {
  const occt = await getOcctImport();
  const buffer = await file.arrayBuffer();
  const result = occt.ReadStepFile(new Uint8Array(buffer), {
    linearDeflectionType: 'absolute_value',
    linearDeflection: 0.03,
    angularDeflection: 0.15,
  });
  return result?.meshes || [];
}
