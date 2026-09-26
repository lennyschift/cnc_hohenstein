// Exakte Volumen-/Oberflächenberechnung + Flächen-Messen aus STEP-Dateien via
// opencascade.js (echter B-Rep-Geometriekern — liest die STEP-Datei in ihre
// mathematisch exakte Form ein, nicht nur das Dreiecksnetz, das der 3D-Viewer
// zur Anzeige nutzt). Wird bewusst NUR bei Bedarf geladen (dynamisches
// import()), damit die ~63 MB große WASM-Datei nicht jeden Seitenaufruf
// verzögert — sie lädt erst, wenn diese Funktionen tatsächlich aufgerufen werden.
//
// API-Signaturen gegen die offizielle Referenzdokumentation geprüft und mit
// einem bekannten 10×10×10mm-Testwürfel verifiziert (Ergebnis: 1000 mm³ /
// 600 mm², exakt). WICHTIG: Diese Paketversion (1.1.1) basiert auf dem
// älteren OCCT 7.4.0 — dort heißt TransferRoots() noch ohne Progress-Range-
// Argument (Message_ProgressRange gibt es in dieser Version noch nicht,
// nur das ältere Message_ProgressIndicator). Bei einem künftigen Update auf
// opencascade.js 2.x (neueres OCCT) ggf. erneut gegen die Doku prüfen.

let ocPromise = null;
export function ladeOcct() {
  if (!ocPromise) {
    // Bewusst NICHT über das Paket-eigene "opencascade.js" (index.js) laden —
    // dessen `import wasmFile from "./dist/opencascade.wasm.wasm"` nutzt ein
    // ESM-Wasm-Importmuster, das Vite nicht unterstützt. Stattdessen die
    // Loader-Datei direkt ansprechen und selbst auf die (nach public/
    // kopierte) .wasm-Datei verweisen — exakt wie bei occt-import-js.
    ocPromise = import('opencascade.js/dist/opencascade.wasm.js').then((mod) => {
      const factory = mod.default;
      const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '';
      const wasmPath = (base.endsWith('/') ? base : base + '/') + 'opencascade.wasm.wasm';
      return factory({ locateFile: () => wasmPath });
    });
  }
  return ocPromise;
}

// Letzte geparste Datei merken: Volumen- und Flächenanalyse lesen dieselbe
// Datei direkt nacheinander — so wird sie nur EINMAL geparst statt zweimal.
let letzterParse = null;

/** Liest eine STEP-Datei ein und gibt { oc, shape } zurück (exakte B-Rep-Form). */
export function leseStepDatei(file) {
  if (letzterParse && letzterParse.file === file) return letzterParse.promise;
  const promise = leseStepDateiUngecacht(file);
  letzterParse = { file, promise };
  promise.catch(() => { if (letzterParse && letzterParse.promise === promise) letzterParse = null; });
  return promise;
}

async function leseStepDateiUngecacht(file) {
  const oc = await ladeOcct();
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // Fester Dateiname (nicht dynamisch!) — aus bislang ungeklärtem Grund
  // schlägt ReadFile() bei bestimmten anderen Dateinamen fehl (WASM-/Emscripten-
  // interne Eigenheit dieser opencascade.js-Version, empirisch verifiziert).
  // Da hier nie zwei STEP-Dateien gleichzeitig gelesen werden, ist der feste
  // Name unkritisch.
  const dateiname = 'input.step';
  oc.FS.writeFile(dateiname, bytes);
  try {
    const reader = new oc.STEPControl_Reader_1();
    const status = reader.ReadFile(dateiname);
    // Embind-Enums sind Wrapper-Objekte, kein primitiver Wert — Vergleich über .value.
    if (status?.value !== oc.IFSelect_ReturnStatus.IFSelect_RetDone.value) {
      throw new Error('STEP-Datei konnte nicht gelesen werden (Status ' + status?.value + ')');
    }
    reader.TransferRoots();
    const shape = reader.OneShape();
    return { oc, shape };
  } finally {
    try { oc.FS.unlink(dateiname); } catch (e) { /* ignore */ }
  }
}

/**
 * Berechnet exaktes Volumen (mm³) und Oberfläche (mm²) über den echten
 * B-Rep-Geometriekern (nicht aus dem Dreiecksnetz geschätzt wie die
 * bisherige Bounding-Box-Methode). Wirft bei ungültigen/nicht lesbaren
 * Dateien einen Error.
 */
export async function berechneVolumenUndOberflaeche(file) {
  const { oc, shape } = await leseStepDatei(file);

  // Embind-Objekte belegen WASM-Speicher, den der JS-Garbage-Collector nicht
  // automatisch freigibt — über eine lange Sitzung (mehrere gemessene Bauteile)
  // ohne Aufräumen kann das die WASM-Heap beschädigen (selbst beim Testen
  // beobachtet). Deshalb .delete() auf beiden GProp-Objekten.
  const volumenProps = new oc.GProp_GProps_1();
  const oberflaechenProps = new oc.GProp_GProps_1();
  try {
    // onlyClosed=false, skipShared=false, useTriangulation=false -> exakte
    // B-Rep-Berechnung (nicht die ggf. ungenauere Dreiecksnetz-Variante).
    oc.BRepGProp.VolumeProperties_1(shape, volumenProps, false, false, false);
    const volumeMm3 = volumenProps.Mass();

    oc.BRepGProp.SurfaceProperties_1(shape, oberflaechenProps, false, false);
    const oberflaecheMm2 = oberflaechenProps.Mass();

    return { volumeMm3, oberflaecheMm2 };
  } finally {
    try { volumenProps.delete?.(); } catch (e) { /* ignore */ }
    try { oberflaechenProps.delete?.(); } catch (e) { /* ignore */ }
  }
}
