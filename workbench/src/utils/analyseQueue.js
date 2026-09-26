// Hintergrund-Warteschlange für die STEP-Verarbeitung: alle hochgeladenen
// Bauteile werden nacheinander in einem Web Worker verarbeitet (Anzeige-Netz +
// Analyse), ohne dass man sie erst anklicken muss. Ergebnisse landen in den
// bestehenden Caches (stepMeshCache / analyseCache), die Viewer und PartCard
// ohnehin zuerst abfragen. Schlägt der Worker fehl, greifen die Aufrufer auf
// die bisherige Verarbeitung im Hauptthread zurück.
import { stepMeshCache } from './pdfThumbnail.js';
import { holeAusAnalyseCache, schreibeInAnalyseCache } from './analyseCache.js';

let worker = null;
let aktuell = null;
const warteschlange = [];
const jobs = new WeakMap(); // File -> Job
let fertigCallback = null;
let meshCallback = null;

export function setzeAnalyseCallback(fn) {
  fertigCallback = fn;
}

export function setzeMeshCallback(fn) {
  meshCallback = fn;
}

function erzeugeWorker() {
  const w = new Worker(new URL('./analyseWorker.js', import.meta.url), { type: 'module' });
  w.onmessage = (e) => {
    const m = e.data;
    if (!aktuell || m.id !== aktuell.id) return;
    const job = aktuell;
    if (m.typ === 'mesh') {
      if (m.fehler) job.meshReject(new Error(m.fehler));
      else {
        try { stepMeshCache.set(job.file, m.meshes); } catch (err) { /* ignore */ }
        job.meshResolve(m.meshes);
        if (meshCallback) meshCallback(job.partId, job.file, m.meshes);
      }
      return;
    }
    if (m.fehler) job.analyseReject(new Error(m.fehler));
    else {
      const ergebnis = {
        volumeMm3: m.volumeMm3, oberflaecheMm2: m.oberflaecheMm2, flaechen: m.flaechen, kanten: m.kanten,
      };
      schreibeInAnalyseCache(job.partId, job.file, ergebnis);
      job.analyseResolve(ergebnis);
      if (fertigCallback) fertigCallback(job.partId, job.file, ergebnis);
    }
    aktuell = null;
    pumpe();
  };
  w.onerror = () => {
    if (aktuell) {
      aktuell.meshReject(new Error('Worker-Fehler'));
      aktuell.analyseReject(new Error('Worker-Fehler'));
      aktuell = null;
    }
    try { w.terminate(); } catch (err) { /* ignore */ }
    worker = null;
    pumpe();
  };
  return w;
}

function pumpe() {
  if (aktuell || !warteschlange.length) return;
  aktuell = warteschlange.shift();
  try {
    if (!worker) worker = erzeugeWorker();
    worker.postMessage({ id: aktuell.id, file: aktuell.file });
  } catch (err) {
    const job = aktuell;
    aktuell = null;
    job.meshReject(err);
    job.analyseReject(err);
    pumpe();
  }
}

let naechsteId = 1;

/**
 * Datei zur Hintergrundverarbeitung einreihen (mehrfaches Einreihen derselben
 * Datei ist unkritisch). vorne=true zieht sie an den Anfang der Warteschlange
 * (z. B. wenn der Nutzer das Bauteil gerade anklickt).
 * Rückgabe: { mesh: Promise, analyse: Promise } — beide können ablehnen.
 */
export function planeAnalyse(partId, file, { vorne = false } = {}) {
  let job = jobs.get(file);
  if (!job) {
    job = { id: naechsteId, partId, file };
    naechsteId += 1;
    job.mesh = new Promise((res, rej) => { job.meshResolve = res; job.meshReject = rej; });
    job.analyse = new Promise((res, rej) => { job.analyseResolve = res; job.analyseReject = rej; });
    job.mesh.catch(() => {});
    job.analyse.catch(() => {});
    jobs.set(file, job);
    const meshCache = stepMeshCache.get(file);
    const analyseCache = holeAusAnalyseCache(partId, file);
    if (meshCache && analyseCache) {
      job.meshResolve(meshCache);
      job.analyseResolve(analyseCache);
    } else {
      warteschlange.push(job);
    }
    pumpe();
  }
  if (vorne) {
    const i = warteschlange.indexOf(job);
    if (i > 0) { warteschlange.splice(i, 1); warteschlange.unshift(job); }
  }
  return job;
}

export function jobFuerDatei(file) {
  return jobs.get(file) || null;
}
