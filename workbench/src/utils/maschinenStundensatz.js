// Merkt sich den zuletzt eingegebenen Stundensatz pro Maschine (nur dieser
// Browser/PC, localStorage) — damit man ihn nicht bei jedem Bauteil neu
// eintippen muss. Später ggf. durch echte Maschinen-/Arbeitsplatz-Stammdaten
// (z. B. in ERPNext) ersetzbar, ohne dass sich der Aufrufercode ändern muss.

const LS_KEY = 'maschinenStundensaetze';

export const MASCHINEN = ['Hermle C42', 'Mori NTX2000', 'CTX400', 'Hermle UWF'];

function readAll() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function getStundensatzFuerMaschine(maschine) {
  if (!maschine) return null;
  const alle = readAll();
  return alle[maschine] ?? null;
}

export function merkeStundensatzFuerMaschine(maschine, stundensatz) {
  if (!maschine || !stundensatz) return;
  const alle = readAll();
  alle[maschine] = Number(stundensatz);
  try { localStorage.setItem(LS_KEY, JSON.stringify(alle)); } catch (e) { /* ignore */ }
}
