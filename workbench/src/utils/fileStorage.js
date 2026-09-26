// Speichert PDF/STEP-Dateien zu gespeicherten Angeboten lokal im Browser via
// IndexedDB (NICHT localStorage — das fasst nur ein paar MB Text und kann
// keine echten Dateien halten, weshalb PDF/STEP bisher beim erneuten Öffnen
// eines gespeicherten Angebots verloren gingen). IndexedDB kann Blobs/Files
// direkt speichern (kein Base64-Umweg nötig) und hat ein deutlich größeres
// Kontingent. Bleibt vollständig lokal im Browser — kein Server, kein Upload.

const DB_NAME = 'angebotsUiDateien';
const STORE_NAME = 'dateien';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function speichereDatei(key, file) {
  if (!file) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(file, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn('Datei konnte nicht lokal gespeichert werden', e);
  }
}

export async function ladeDatei(key) {
  try {
    const db = await openDb();
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch (e) {
    console.warn('Datei konnte nicht geladen werden', e);
    return null;
  }
}

export async function loescheDateien(keys) {
  if (!keys?.length) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      keys.forEach((k) => store.delete(k));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) { /* ignore */ }
}
