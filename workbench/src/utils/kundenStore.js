// Eigene Kunden + Ansprechpartner — lokal im Browser gespeichert (localStorage).
// Ergänzt die mitgelieferte public/kunden.json (die ist nur ein Startbestand,
// der Browser kann sie nicht zurückschreiben). Export/Import als JSON ermöglicht
// Sicherung und spätere Übertragung auf einen gemeinsamen Speicherort (z. B. NAS).

const LS_KUNDEN = 'customKunden';
const LS_KONTAKTE = 'customKontakte'; // { "Kundenname": [{name,email,telefon}, ...] }

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
}

export function getCustomKunden() {
  return readLS(LS_KUNDEN, []);
}

export function addCustomKunde({ name, adresse, email, lieferanten_nr }) {
  const list = getCustomKunden();
  list.push({ name, adresse, email: email || '', lieferanten_nr: lieferanten_nr || '', ansprechpartner: [] });
  writeLS(LS_KUNDEN, list);
  return list;
}

export function getCustomKontakte(kundenName) {
  const all = readLS(LS_KONTAKTE, {});
  return all[kundenName] || [];
}

export function addCustomKontakt(kundenName, kontakt) {
  const all = readLS(LS_KONTAKTE, {});
  if (!all[kundenName]) all[kundenName] = [];
  all[kundenName].push(kontakt);
  writeLS(LS_KONTAKTE, all);
  return all[kundenName];
}

/**
 * Kunden aus public/kunden.json (Startbestand) + eigene Kunden zusammenführen.
 * Ansprechpartner je Kunde ebenfalls zusammenführen (Startbestand + eigene).
 */
export function mergeKunden(seedKunden) {
  const eigene = getCustomKunden();
  const merged = [...(seedKunden || []), ...eigene];
  return merged.map((k) => ({
    ...k,
    ansprechpartner: [...(k.ansprechpartner || []), ...getCustomKontakte(k.name)],
  }));
}

/** Alle eigenen Kunden+Kontakte als JSON-Datei herunterladen (Sicherung/Übertragung). */
export function exportKundenJson() {
  const data = { customKunden: getCustomKunden(), customKontakte: readLS(LS_KONTAKTE, {}) };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kunden_eigene.json';
  a.click();
  URL.revokeObjectURL(url);
}

/** JSON-Datei (aus exportKundenJson) wieder einspielen. */
export async function importKundenJson(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (Array.isArray(data.customKunden)) writeLS(LS_KUNDEN, data.customKunden);
  if (data.customKontakte && typeof data.customKontakte === 'object') writeLS(LS_KONTAKTE, data.customKontakte);
}
