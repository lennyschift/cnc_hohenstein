// Reiner Daten-Cache für die STEP-Analyse (Volumen/Oberfläche + exakte
// Flächen/Kanten) — die ist teuer (OCCT-WASM), wird aber bei jedem
// Bauteil-Wechsel erneut gebraucht, weil PartCard beim Wechsel ganz normal
// neu gemountet wird (siehe App.vue, :key="currentPart.id").
//
// BEWUSST kein Component-Lifecycle-Trick (z.B. <KeepAlive>) — ein Versuch
// damit hat zu schwer nachvollziehbaren Zustands-Bugs geführt (u.a. beim
// Zusammenspiel mit Vite-HMR während der Entwicklung: mehrfach gecachte,
// noch-lebende Komponenten-Instanzen + Hot-Reload vertragen sich schlecht).
// Ein simples Modul-Singleton-Map ist dagegen unkritisch: überlebt Re-Mounts
// innerhalb derselben Seiten-Sitzung (schnelles Hin-/Herklicken), verschwindet
// beim echten Neuladen der Seite — und im schlimmsten Fall (Cache-Fehltreffer)
// wird einfach neu berechnet, nie falsch zugeordnet.
const cache = new Map();

function schluessel(partId, file) {
  return `${partId}::${file?.name || ''}::${file?.size || 0}::${file?.lastModified || 0}`;
}

export function holeAusAnalyseCache(partId, file) {
  return cache.get(schluessel(partId, file)) || null;
}

export function schreibeInAnalyseCache(partId, file, ergebnis) {
  cache.set(schluessel(partId, file), ergebnis);
}
