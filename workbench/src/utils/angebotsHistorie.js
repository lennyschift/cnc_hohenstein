// Angebotshistorie — gespeichert entweder lokal im Browser (localStorage +
// IndexedDB für Dateien) ODER, falls ein NAS-Ordner verbunden ist, direkt
// als Dateien in diesem gemeinsamen Ordner (siehe nasStorage.js) — dann
// sehen alle PCs, die denselben Ordner verbinden, dieselben Angebote.
// KEINE Datenbank, KEIN SQL → SQL-Injection ist hier technisch nicht möglich.
// Später (ERPNext-Anbindung): echte DocTypes über frappe.call() statt beidem.

import { speichereDatei, ladeDatei, loescheDateien } from './fileStorage.js';
import {
  holeVerbundenenOrdner, holeOderErstelleAngebotOrdner, schreibeAngebotJson,
  schreibeDateiInOrdner, leseDateiAusOrdner,
  ladeAlleAngeboteVonNas, ladeAngebotVonNas, loescheAngebotVonNas,
} from './nasStorage.js';

const LS_KEY = 'angebotsHistorie';

export const STATUS = {
  NEU: 'Neu',
  IN_BEARBEITUNG: 'In Bearbeitung',
  FERTIG: 'Angebot erstellt',
};

function readAll() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
function writeAll(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
}

// Verhindert überlappende Speichervorgänge für DASSELBE Angebot (z.B. durch
// Doppelklick oder mehrere schnell hintereinander ausgelöste Speichern-
// Aufrufe) — sonst kann ein zweiter, noch mit älteren Daten gestarteter
// Schreibvorgang den ersten mitten im Schreiben ungültig machen ("state
// changed since read from disk") und im schlimmsten Fall die neuesten
// Änderungen wieder überschreiben. Pro id wird strikt nacheinander geschrieben.
const schreibWarteschlangen = new Map();
function serialisiertProId(id, aufgabe) {
  const bisher = schreibWarteschlangen.get(id) || Promise.resolve();
  const ausgefuehrt = bisher.then(aufgabe, aufgabe);
  // Kette am Leben halten, auch wenn diese Aufgabe fehlschlägt — der Fehler
  // selbst wird trotzdem an den ursprünglichen Aufrufer weitergereicht.
  schreibWarteschlangen.set(id, ausgefuehrt.catch(() => {}));
  return ausgefuehrt;
}

/** Bestehenden Eintrag (falls vorhanden) suchen — für "erstellt"-Datum + Status beim Update. */
async function ladeBestehend(ordner, id) {
  if (ordner) return await ladeAngebotVonNas(ordner, id);
  return readAll().find((e) => e.id === id) || null;
}

export async function getHistorie() {
  const ordner = await holeVerbundenenOrdner();
  const list = ordner ? await ladeAlleAngeboteVonNas(ordner) : readAll();
  return list.sort((a, b) => (b.aktualisiert || '').localeCompare(a.aktualisiert || ''));
}

/**
 * Aktuellen Stand (rfq + parts + Notizen) als Angebot speichern/aktualisieren.
 * id = rfq.rfq_number, falls vorhanden, sonst neue zufällige id.
 * Ist ein NAS-Ordner verbunden, landet alles dort in einem Ordner "<Id> -
 * <Kunde>" (gemeinsam mit anderen PCs sichtbar); sonst lokal in localStorage
 * + IndexedDB (nur dieser PC). PDF/STEP-Dateien der Teile werden dabei aus
 * dem JSON-Snapshot herausgenommen (würden dort ohnehin nicht überleben)
 * und getrennt gesichert — mit erhaltener Dateiendung (wichtig, damit der
 * 3D-Viewer die Datei beim Neuladen wieder korrekt erkennt).
 */
export async function speichereAngebot({ rfq, parts, angebot_notiz, angebot_info, globalDefaults, status, gesamtNetto }) {
  const id = rfq.rfq_number || `tmp_${Date.now()}`;
  return serialisiertProId(id, () => speichereAngebotIntern(id, { rfq, parts, angebot_notiz, angebot_info, globalDefaults, status, gesamtNetto }));
}

async function speichereAngebotIntern(id, { rfq, parts, angebot_notiz, angebot_info, globalDefaults, status, gesamtNetto }) {
  const ordner = await holeVerbundenenOrdner();
  const jetzt = new Date().toISOString();
  const kunde = (rfq.customer_name || '').split('\n')[0] || 'Unbenannt';

  // Ordner EINMAL auflösen und für alle Schreibvorgänge dieses Speicherns
  // wiederverwenden (siehe Kommentar in nasStorage.js — mehrfaches Auflösen
  // kurz hintereinander kann den gerade erst angelegten Ordner noch nicht
  // zuverlässig finden).
  const angebotOrdner = ordner ? await holeOderErstelleAngebotOrdner(ordner, id, kunde) : null;
  const bestehend = angebotOrdner
    ? await (async () => { try { return JSON.parse(await (await (await angebotOrdner.getFileHandle('angebot.json')).getFile()).text()); } catch (e) { return null; } })()
    : readAll().find((e) => e.id === id) || null;

  const snapshotParts = [];
  for (const p of (parts || [])) {
    const { pdfFile, stepFile, ...rest } = p;
    // PDF/STEP nur schreiben, wenn sie sich seit dem letzten Speichern
    // wirklich geändert haben (_pdfUnveraendert/_stepUnveraendert werden in
    // App.vue gesetzt: true nach erfolgreichem Speichern oder beim Laden aus
    // der Historie, false sobald der Nutzer eine NEUE Datei auswählt) — sonst
    // würden bei jedem Speichern ALLE Dateien aller Bauteile erneut auf die
    // NAS geschrieben, auch wenn sich nur ein Preis geändert hat. War die
    // Ursache für sehr lange Speicherzeiten (mehrere große STEP-Dateien).
    if (angebotOrdner) {
      if (pdfFile && !p._pdfUnveraendert) { await schreibeDateiInOrdner(angebotOrdner, p.id, 'pdf', pdfFile); p._pdfUnveraendert = true; }
      if (stepFile && !p._stepUnveraendert) { await schreibeDateiInOrdner(angebotOrdner, p.id, 'step', stepFile); p._stepUnveraendert = true; }
    } else {
      if (pdfFile && !p._pdfUnveraendert) { await speichereDatei(`${id}_${p.id}_pdf`, pdfFile); p._pdfUnveraendert = true; }
      if (stepFile && !p._stepUnveraendert) { await speichereDatei(`${id}_${p.id}_step`, stepFile); p._stepUnveraendert = true; }
    }
    rest._pdfUnveraendert = p._pdfUnveraendert;
    rest._stepUnveraendert = p._stepUnveraendert;
    snapshotParts.push(rest);
  }

  const eintrag = {
    id,
    rfq_number: rfq.rfq_number || '',
    kunde,
    datum: rfq.date || jetzt.slice(0, 10),
    status: status || bestehend?.status || STATUS.NEU,
    gesamtNetto: gesamtNetto || 0,
    teileAnzahl: (parts || []).length,
    erstellt: bestehend?.erstellt || jetzt,
    aktualisiert: jetzt,
    snapshot: { rfq, parts: snapshotParts, angebot_notiz, angebot_info, globalDefaults },
  };

  if (angebotOrdner) {
    await schreibeAngebotJson(angebotOrdner, eintrag);
  } else {
    const list = readAll();
    const idx = list.findIndex((e) => e.id === id);
    if (idx >= 0) list[idx] = eintrag; else list.push(eintrag);
    writeAll(list);
  }
  return eintrag;
}

/**
 * Lädt die zu einem gespeicherten Angebot gehörenden PDF/STEP-Dateien zurück
 * (aus dem NAS-Ordner, falls verbunden, sonst aus IndexedDB).
 * Rückgabe: { [partId]: { pdfFile, stepFile } }.
 */
export async function ladeGespeicherteDateien(eintrag) {
  const ordner = await holeVerbundenenOrdner();
  const angebotOrdner = ordner ? await holeOderErstelleAngebotOrdner(ordner, eintrag.id, eintrag.kunde) : null;
  const map = {};
  for (const p of (eintrag?.snapshot?.parts || [])) {
    const [pdfFile, stepFile] = angebotOrdner
      ? await Promise.all([
          leseDateiAusOrdner(angebotOrdner, p.id, 'pdf'),
          leseDateiAusOrdner(angebotOrdner, p.id, 'step'),
        ])
      : await Promise.all([
          ladeDatei(`${eintrag.id}_${p.id}_pdf`),
          ladeDatei(`${eintrag.id}_${p.id}_step`),
        ]);
    if (pdfFile || stepFile) map[p.id] = { pdfFile, stepFile };
  }
  return map;
}

export async function setzeStatus(id, status) {
  return serialisiertProId(id, () => setzeStatusIntern(id, status));
}

async function setzeStatusIntern(id, status) {
  const ordner = await holeVerbundenenOrdner();
  if (ordner) {
    const eintrag = await ladeAngebotVonNas(ordner, id);
    if (eintrag) {
      eintrag.status = status;
      eintrag.aktualisiert = new Date().toISOString();
      const angebotOrdner = await holeOderErstelleAngebotOrdner(ordner, id, eintrag.kunde);
      await schreibeAngebotJson(angebotOrdner, eintrag);
    }
    return;
  }
  const list = readAll();
  const eintrag = list.find((e) => e.id === id);
  if (eintrag) { eintrag.status = status; eintrag.aktualisiert = new Date().toISOString(); writeAll(list); }
}

export async function loescheAngebot(id) {
  return serialisiertProId(id, () => loescheAngebotIntern(id));
}

async function loescheAngebotIntern(id) {
  const ordner = await holeVerbundenenOrdner();
  if (ordner) {
    await loescheAngebotVonNas(ordner, id);
    return;
  }
  const list = readAll();
  const eintrag = list.find((e) => e.id === id);
  if (eintrag) {
    const keys = [];
    (eintrag.snapshot?.parts || []).forEach((p) => keys.push(`${id}_${p.id}_pdf`, `${id}_${p.id}_step`));
    await loescheDateien(keys);
  }
  writeAll(list.filter((e) => e.id !== id));
}

/**
 * Einmalige Übertragung: alle bisher lokal (localStorage/IndexedDB)
 * gespeicherten Angebote in den gerade verbundenen NAS-Ordner kopieren.
 * Bestehende lokale Daten bleiben zusätzlich erhalten (kein Löschen).
 */
export async function uebertrageLokaleAngeboteAufNas(ordner) {
  const lokal = readAll();
  let anzahl = 0;
  for (const eintrag of lokal) {
    const angebotOrdner = await holeOderErstelleAngebotOrdner(ordner, eintrag.id, eintrag.kunde);
    for (const p of (eintrag.snapshot?.parts || [])) {
      const [pdfFile, stepFile] = await Promise.all([
        ladeDatei(`${eintrag.id}_${p.id}_pdf`),
        ladeDatei(`${eintrag.id}_${p.id}_step`),
      ]);
      if (pdfFile) await schreibeDateiInOrdner(angebotOrdner, p.id, 'pdf', pdfFile);
      if (stepFile) await schreibeDateiInOrdner(angebotOrdner, p.id, 'step', stepFile);
    }
    await schreibeAngebotJson(angebotOrdner, eintrag);
    anzahl += 1;
  }
  return anzahl;
}
