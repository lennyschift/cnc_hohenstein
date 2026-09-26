// NAS-Ordner-Speicherung für Angebote (Übergangslösung bis zur ERPNext-
// Anbindung) — nutzt die File System Access API (Chrome/Edge), um Angebote
// + zugehörige PDF/STEP-Dateien direkt in einem gemeinsamen NAS-Ordner
// abzulegen, den mehrere PCs verbinden können. Bleibt vollständig lokal/im
// Firmennetz — kein zusätzlicher Server, keine Internet-Übertragung.
//
// Ordnerstruktur im gewählten NAS-Ordner — EIN Ordner pro Angebot, benannt
// nach Angebotsnummer + Kunde, mit allen Daten darin:
//   <NAS-Ordner>/
//     <AngebotId> - <Kunde>/
//       angebot.json              — Metadaten + Snapshot (ohne Dateien)
//       <PartId>_pdf.<ext>        — PDF-Zeichnung des Bauteils (Endung erhalten!)
//       <PartId>_step.<ext>       — STEP/3D-Datei des Bauteils (Endung erhalten!)
//
// WICHTIG: Die Dateiendung (.step/.stp/.stl/.glb...) muss erhalten bleiben —
// der 3D-Viewer erkennt am Dateinamen, welcher Loader benutzt wird. Ohne
// Endung wird die Datei beim Neuladen stillschweigend ignoriert.

const DB_NAME = 'angebotsUiNas';
const STORE_NAME = 'ordner';
const HANDLE_KEY = 'nasOrdnerHandle';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function nasVerfuegbar() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

async function speichereHandle(handle) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function geladenerHandle() {
  const db = await openDb();
  const handle = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return handle;
}

/** Öffnet den Ordner-Picker (braucht eine Nutzer-Geste, z.B. Klick) und merkt sich die Wahl. */
export async function waehleNasOrdner() {
  if (!nasVerfuegbar()) throw new Error('Diese Funktion wird von diesem Browser nicht unterstützt (Chrome/Edge nötig).');
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  await speichereHandle(handle);
  return handle;
}

/**
 * Lädt den zuletzt verbundenen Ordner, falls vorhanden und die Berechtigung
 * noch gültig ist. Gibt null zurück, wenn kein Ordner verbunden ist ODER die
 * Berechtigung fehlt (z.B. nach Browser-Neustart) — dann muss der Nutzer
 * erneut über waehleNasOrdner() bestätigen.
 */
export async function holeVerbundenenOrdner() {
  if (!nasVerfuegbar()) return null;
  let handle;
  try {
    handle = await geladenerHandle();
  } catch (e) {
    return null;
  }
  if (!handle) return null;
  try {
    const berechtigung = await handle.queryPermission({ mode: 'readwrite' });
    return berechtigung === 'granted' ? handle : null;
  } catch (e) {
    return null;
  }
}

/** Erneut nach der Berechtigung fragen (braucht Nutzer-Geste) — für den Fall, dass sie abgelaufen ist. */
export async function bestaetigeBerechtigung() {
  const handle = await geladenerHandle();
  if (!handle) return null;
  const erneut = await handle.requestPermission({ mode: 'readwrite' });
  return erneut === 'granted' ? handle : null;
}

/**
 * Verbindungsstatus, ohne stillschweigend zwischen "kein Ordner gemerkt" und
 * "Ordner gemerkt, aber Berechtigung muss neu bestätigt werden" zu vermischen
 * (Chrome verlangt das nach einiger Zeit/Neustart erneut — braucht dann einen
 * Klick, siehe bestaetigeBerechtigung()). name ist auch ohne aktive
 * Berechtigung verfügbar, damit die UI den zuletzt verbundenen Ordner anzeigen kann.
 */
export async function nasStatus() {
  if (!nasVerfuegbar()) return { verbunden: false, brauchtBestaetigung: false, name: null };
  let handle;
  try {
    handle = await geladenerHandle();
  } catch (e) {
    return { verbunden: false, brauchtBestaetigung: false, name: null };
  }
  if (!handle) return { verbunden: false, brauchtBestaetigung: false, name: null };
  try {
    const berechtigung = await handle.queryPermission({ mode: 'readwrite' });
    return {
      verbunden: berechtigung === 'granted',
      brauchtBestaetigung: berechtigung !== 'granted',
      name: handle.name,
    };
  } catch (e) {
    return { verbunden: false, brauchtBestaetigung: true, name: handle.name };
  }
}

export async function trenneNasOrdner() {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function nasOrdnerName() {
  const handle = await geladenerHandle();
  return handle?.name || null;
}

// --- Angebots-Unterordner (ein Ordner pro Angebot, Name = "<Id> - <Kunde>") ---

// Chrome/Edge werfen bei der File System Access API über Netzwerkfreigaben
// (NAS, gemappte Laufwerke) gelegentlich Fehler wie "InvalidStateError: An
// operation that depends on state cached in an interface object was made but
// the state had changed since it was read from disk", "NotFoundError: A
// requested file or directory could not be found at the time an operation
// was processed" oder "NotReadableError: The requested file could not be
// read, typically due to permission problems that have occurred after a
// reference to a file was acquired" — alles bekanntes Chromium-Verhalten,
// weil der Browser Datei-Metadaten/Handles zwischenspeichert und ein NAS/
// SMB-Share Änderungen oder kurze Aussetzer manchmal mit leichter Verzögerung
// meldet, auch wenn der Vorgang eigentlich korrekt war/die Datei da ist.
// WICHTIG: das betrifft LESEN genauso wie SCHREIBEN — ein nicht wiederholter
// Lesefehler beim Laden einer gespeicherten STEP-Datei sieht sonst so aus,
// als hätte das Bauteil seine Datei "verloren", obwohl sie unverändert auf
// der NAS liegt. Fix: bei genau diesen Fehlern kurz warten und mit einem
// NEUEN Handle erneut versuchen (ein wiederverwendeter Handle bleibt "stale"
// und schlägt wieder fehl).
const WIEDERHOLBARE_FEHLER = new Set(['InvalidStateError', 'NotFoundError', 'NotReadableError']);
async function mitRetryBeiStaleHandle(aufgabe, versuche = 4) {
  let letzterFehler;
  for (let i = 0; i < versuche; i++) {
    try {
      return await aufgabe();
    } catch (e) {
      letzterFehler = e;
      if (!WIEDERHOLBARE_FEHLER.has(e?.name)) throw e;
      await new Promise((r) => setTimeout(r, 200 * (i + 1)));
    }
  }
  throw letzterFehler;
}

function sanitiereOrdnername(s) {
  return String(s || '')
    .replace(/[\\/:*?"<>|]/g, '_') // in Windows-Ordnernamen ungültige Zeichen
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '') // Windows erlaubt keinen Punkt/Leerzeichen am Ende
    .slice(0, 100) || 'Unbenannt';
}

function wunschOrdnername(id, kunde) {
  return `${id} - ${sanitiereOrdnername(kunde)}`;
}

async function findeAngebotOrdner(ordner, id) {
  const prefix = `${id} - `;
  for await (const [name, handle] of ordner.entries()) {
    if (handle.kind === 'directory' && (name === id || name.startsWith(prefix))) {
      return { name, handle };
    }
  }
  return null;
}

async function kopiereOrdnerInhalt(quelle, ziel) {
  for await (const [name, handle] of quelle.entries()) {
    if (handle.kind === 'file') {
      const file = await handle.getFile();
      const neuHandle = await ziel.getFileHandle(name, { create: true });
      const writable = await neuHandle.createWritable();
      await writable.write(file);
      await writable.close();
    }
  }
}

/**
 * Findet den Angebots-Ordner oder legt ihn an. Benennt ihn um (Inhalt kopieren +
 * alten löschen), falls sich der Kundenname seit dem letzten Speichern geändert hat.
 * WICHTIG: Pro Speichervorgang nur EINMAL aufrufen und das Ergebnis für alle
 * Datei-/JSON-Schreibvorgänge dieses Speichervorgangs wiederverwenden — bei
 * mehrfachem Aufruf kurz hintereinander kann `entries()` einen gerade eben
 * neu angelegten Ordner noch nicht zuverlässig sehen (Verzeichnis-Auflistung
 * ist nicht garantiert sofort konsistent), was sonst zu doppelten Ordnern
 * oder zu "state changed since read from disk"-Fehlern führen kann.
 */
export async function holeOderErstelleAngebotOrdner(ordner, id, kunde) {
  return mitRetryBeiStaleHandle(async () => {
    const wunschName = wunschOrdnername(id, kunde);
    const gefunden = await findeAngebotOrdner(ordner, id);
    if (!gefunden) {
      return await ordner.getDirectoryHandle(wunschName, { create: true });
    }
    if (gefunden.name === wunschName) {
      return gefunden.handle;
    }
    // Kundenname hat sich geändert -> neuer Ordnername, Inhalt umziehen
    const neuerOrdner = await ordner.getDirectoryHandle(wunschName, { create: true });
    await kopiereOrdnerInhalt(gefunden.handle, neuerOrdner);
    await ordner.removeEntry(gefunden.name, { recursive: true });
    return neuerOrdner;
  });
}

/** Schreibt die Angebots-JSON in einen bereits aufgelösten Angebots-Ordner (siehe oben). */
export async function schreibeAngebotJson(angebotOrdner, eintrag) {
  await mitRetryBeiStaleHandle(async () => {
    const jsonHandle = await angebotOrdner.getFileHandle('angebot.json', { create: true });
    const writable = await jsonHandle.createWritable();
    await writable.write(JSON.stringify(eintrag));
    await writable.close();
  });
}

/** Schreibt eine Bauteil-Datei in einen bereits aufgelösten Angebots-Ordner (siehe oben). */
export async function schreibeDateiInOrdner(angebotOrdner, partId, art, file) {
  const ext = dateiendung(file, art === 'pdf' ? 'pdf' : 'step');
  await mitRetryBeiStaleHandle(async () => {
    const fileHandle = await angebotOrdner.getFileHandle(`${partId}_${art}.${ext}`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
  });
}

/** Liest eine Bauteil-Datei aus einem bereits aufgelösten Angebots-Ordner (siehe oben). */
export async function leseDateiAusOrdner(angebotOrdner, partId, art) {
  return mitRetryBeiStaleHandle(async () => {
    const prefix = `${partId}_${art}.`;
    for await (const [name, handle] of angebotOrdner.entries()) {
      if (handle.kind === 'file' && name.startsWith(prefix)) {
        return await handle.getFile();
      }
    }
    return null;
  });
}

export async function speichereAngebotAufNas(ordner, eintrag) {
  const angebotOrdner = await holeOderErstelleAngebotOrdner(ordner, eintrag.id, eintrag.kunde);
  await schreibeAngebotJson(angebotOrdner, eintrag);
}

/** Liest ein Angebot anhand der id (ohne es anzulegen) — null, falls nicht vorhanden. */
export async function ladeAngebotVonNas(ordner, id) {
  const gefunden = await findeAngebotOrdner(ordner, id);
  if (!gefunden) return null;
  try {
    return await mitRetryBeiStaleHandle(async () => {
      const jsonHandle = await gefunden.handle.getFileHandle('angebot.json');
      const file = await jsonHandle.getFile();
      return JSON.parse(await file.text());
    });
  } catch (e) {
    return null;
  }
}

// Dateiendung aus dem Original-Dateinamen übernehmen — WICHTIG: der 3D-Viewer
// (ModelViewer.vue) erkennt STEP/STL/GLB am Dateinamen, ohne passende Endung
// wird die Datei beim Neuladen nicht erkannt und stillschweigend ignoriert.
function dateiendung(file, fallback) {
  const teile = String(file?.name || '').split('.');
  return teile.length > 1 ? teile.pop().toLowerCase() : fallback;
}

// Standalone-Varianten (lösen den Ordner selbst auf) — für Aufrufer, die nur
// EINE Datei schreiben/lesen. Werden mehrere Dateien + die JSON im selben
// Speichervorgang geschrieben, stattdessen holeOderErstelleAngebotOrdner()
// einmal aufrufen und schreibeDateiInOrdner()/schreibeAngebotJson() direkt
// mit dem Ergebnis nutzen (siehe Kommentar dort).
export async function speichereDateiAufNas(ordner, angebotId, kunde, partId, art, file) {
  const angebotOrdner = await holeOderErstelleAngebotOrdner(ordner, angebotId, kunde);
  await schreibeDateiInOrdner(angebotOrdner, partId, art, file);
}

export async function ladeDateiVonNas(ordner, angebotId, kunde, partId, art) {
  try {
    const angebotOrdner = await holeOderErstelleAngebotOrdner(ordner, angebotId, kunde);
    return await leseDateiAusOrdner(angebotOrdner, partId, art);
  } catch (e) {
    return null; // Datei existiert nicht (z.B. Teil hatte keine PDF/STEP)
  }
}

export async function ladeAlleAngeboteVonNas(ordner) {
  const liste = [];
  for await (const [name, handle] of ordner.entries()) {
    if (handle.kind === 'directory') {
      try {
        const eintrag = await mitRetryBeiStaleHandle(async () => {
          const jsonHandle = await handle.getFileHandle('angebot.json');
          const file = await jsonHandle.getFile();
          return JSON.parse(await file.text());
        });
        liste.push(eintrag);
      } catch (e) { /* kein Angebots-Ordner oder defekt, überspringen */ }
    }
  }
  return liste;
}

export async function loescheAngebotVonNas(ordner, id) {
  const gefunden = await findeAngebotOrdner(ordner, id);
  if (gefunden) {
    try {
      await mitRetryBeiStaleHandle(() => ordner.removeEntry(gefunden.name, { recursive: true }));
    } catch (e) { /* ignore */ }
  }
}
