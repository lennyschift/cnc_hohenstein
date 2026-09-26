// Verbindung zur lokalen Mail-Bridge (siehe MAil ANgebot Automation/mail_bridge.py).
// WICHTIG: Das ist die EINZIGE Stelle im Frontend, die mit einem "externen"
// Dienst spricht — und auch die spricht NUR mit 127.0.0.1 (localhost), NIE
// mit dem Internet. Der Python-Prozess selbst macht die IMAP-Verbindung.
//
// Der Zugriffs-Token wird lokal im Browser gespeichert (localStorage) und bei
// jeder Anfrage im Header mitgeschickt. Ohne laufende Bridge + korrekten Token
// passiert hier gar nichts.

const BRIDGE_URL = 'http://127.0.0.1:5175';
const LS_TOKEN_KEY = 'mailBridgeToken';

export function getToken() {
  return localStorage.getItem(LS_TOKEN_KEY) || '';
}
export function setToken(token) {
  localStorage.setItem(LS_TOKEN_KEY, (token || '').trim());
}

export async function pruefeVerbindung() {
  const res = await fetch(`${BRIDGE_URL}/health`);
  if (!res.ok) throw new Error('Mail-Bridge antwortet nicht wie erwartet');
  return res.json();
}

export async function holeVorschau(tage = 1) {
  const res = await fetch(`${BRIDGE_URL}/check?tage=${encodeURIComponent(tage)}`, {
    headers: { 'X-Bridge-Token': getToken() },
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Fehler (${res.status})`);
  }
  return data.mails || [];
}

export async function importiereAusgewaehlte(nums) {
  const res = await fetch(`${BRIDGE_URL}/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Bridge-Token': getToken() },
    body: JSON.stringify({ nums }),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Fehler (${res.status})`);
  }
  return data.anfragen || [];
}

// Base64 (aus der Bridge-Antwort) in ein echtes File-Objekt umwandeln, damit
// die bestehende Dateiverarbeitung (processDroppedFiles) unverändert genutzt
// werden kann — die Mail-Bridge liefert also einfach "virtuell abgelegte" Dateien.
export function base64ZuDatei(name, base64) {
  const binaer = atob(base64);
  const bytes = new Uint8Array(binaer.length);
  for (let i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
  return new File([bytes], name);
}
