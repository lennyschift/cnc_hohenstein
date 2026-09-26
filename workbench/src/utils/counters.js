// Fortlaufende Angebotsnummer: JJ + 4-stellig hochzählend (z. B. 260001, 260002...).
// Zähler wird pro Jahr getrennt geführt und lokal im Browser gespeichert (localStorage).
// WICHTIG: Das ist NICHT über mehrere PCs synchron — nur auf diesem Rechner/Browser.

const LS_KEY = 'anNummerCounter'; // { "26": 3, "27": 0, ... }

function readCounters() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
function writeCounters(obj) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch (e) { /* ignore */ }
}

/**
 * Vergibt die nächste fortlaufende Angebotsnummer für das aktuelle (oder angegebene) Jahr
 * und erhöht den gespeicherten Zähler. Format: "JJ0001".
 */
export function getNextAngebotsNummer(year = new Date().getFullYear()) {
  const yy = String(year % 100).padStart(2, '0');
  const counters = readCounters();
  const next = (counters[yy] || 0) + 1;
  counters[yy] = next;
  writeCounters(counters);
  return `${yy}${String(next).padStart(4, '0')}`;
}
