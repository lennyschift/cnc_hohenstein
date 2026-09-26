// ============================================================
//  Material-Erkennung aus PDF-Zeichnungstext — komplett lokal im Browser.
//  Sucht Werkstoff-Bezeichnungen (Alu, Stahl, Edelstahl, Titan, Inconel...)
//  in der Nähe von Labels wie "Werkstoff"/"Material" und mappt Synonyme
//  (Werkstoffnummer, EN-Bezeichnung, Handelsname) auf einen kanonischen Namen.
//  Erkennt zusätzlich getrennt: Zustand (Vergütet/H1025/T6...), Oberfläche
//  (eloxiert, HartCoat, verzinkt...) und mechanische Werte (Rm/Rp0.2/A5/Z).
//  Keine Datenübertragung — reine Textsuche im bereits geladenen PDF.
//
//  Eigene Materialien werden im Browser (localStorage) gespeichert — das ist
//  KEINE Datei auf der Festplatte, sondern browserspezifisch. Export/Import
//  als JSON ermöglicht Sicherung/Weitergabe an andere Rechner.
// ============================================================

// ISO-Werkstoffklassen (Farbe für Badges + Richtdichte + Kurzbeschreibung)
export const MATERIAL_CLASSES = [
  { key: 'P', label: 'Stahl', color: '#5b9bd5', dichte: 7.85, description: 'Unlegierte & legierte Baustähle, Vergütungsstähle' },
  { key: 'M', label: 'Rostfrei', color: '#ffd54a', dichte: 7.9, description: 'Austenitische/martensitische Edelstähle, PH-Stähle' },
  { key: 'K', label: 'Eisenguss', color: '#ef9a9a', dichte: 7.2, description: 'Grauguss, Sphäroguss' },
  { key: 'N', label: 'NE-Metalle', color: '#81c784', dichte: 2.7, description: 'Aluminium, Kupfer, Messing, Bronze' },
  { key: 'S', label: 'Hochwarmfest', color: '#ffb74d', dichte: 8.4, description: 'Titan, Nickelbasis (Inconel), Superlegierungen' },
  { key: 'H', label: 'Stahl gehärtet', color: '#cfd8dc', dichte: 7.85, description: 'Werkzeugstähle, gehärtete Stähle' },
  { key: 'O', label: 'Nichtmetalle', color: '#bcaaa4', dichte: 1.4, description: 'Kunststoffe (POM, PEEK, PA...)' },
];

// Kanonischer Name -> { synonyme (Regex-Fragmente), klasse (ISO-Kürzel), dichte g/cm³ }
// Reihenfolge relevant: spezifischere/längere Muster zuerst, damit sie zuerst greifen.
export const MATERIAL_DB = [
  // --- Aluminium ---
  { name: 'Alu 7075', klasse: 'N', dichte: 2.81, pat: [/7075/, /AlZnMgCu\s?-?1[.,]?5/i, /AlZn\s?5[.,]?5\s?MgCu/i, /3\.4365/] },
  { name: 'Alu 6082', klasse: 'N', dichte: 2.70, pat: [/6082/, /AlSi\s?1\s?MgMn/i, /AlMgSi\s?1/i, /3\.2315/] },
  { name: 'Alu 6061', klasse: 'N', dichte: 2.70, pat: [/6061/, /AlMg\s?1\s?SiCu/i, /3\.3211/] },
  { name: 'Alu 5083', klasse: 'N', dichte: 2.66, pat: [/5083/, /AlMg\s?4[.,]?5\s?Mn\s?0?[.,]?7?/i, /3\.3547/] },
  { name: 'Alu 2024', klasse: 'N', dichte: 2.78, pat: [/2024/, /AlCu\s?4\s?Mg\s?1/i, /3\.1355/] },

  // --- Titan ---
  { name: 'Titan Grade 2', klasse: 'S', dichte: 4.51, pat: [/Ti[- ]?Grade\s?2\b/i, /3\.7035/, /\bTiCP2\b/i] },
  { name: 'Titan Grade 5 (Ti6Al4V)', klasse: 'S', dichte: 4.43, pat: [/Ti[- ]?6Al[- ]?4V/i, /Ti[- ]?Grade\s?5\b/i, /3\.7165/] },

  // --- Nickelbasis / Hochwarmfest ---
  { name: 'Inconel 718', klasse: 'S', dichte: 8.19, pat: [/Inconel\s?718/i, /Alloy\s?718/i, /2\.4668/, /NiCr19Fe19NbMo3/i] },
  { name: 'Inconel 625', klasse: 'S', dichte: 8.44, pat: [/Inconel\s?625/i, /Alloy\s?625/i, /2\.4856/] },

  // --- Ausscheidungshärtender Edelstahl (PH) ---
  { name: '1.4542 (17-4PH)', klasse: 'M', dichte: 7.75, pat: [/1\.4542/, /17[- ]?4\s?PH/i, /X5CrNiCuNb16-4/i, /630\b/] },
  { name: '1.4548 (15-5PH)', klasse: 'M', dichte: 7.80, pat: [/1\.4548/, /15[- ]?5\s?PH/i, /X5CrNiCuNb15-5/i] },
  { name: '1.4534 (PH13-8Mo)', klasse: 'M', dichte: 7.76, pat: [/1\.4534/, /PH\s?13[- ]?8\s?Mo/i] },

  // --- Austenitische / martensitische Edelstähle ---
  { name: '1.4301 (V2A)', klasse: 'M', dichte: 7.90, pat: [/1\.4301/, /X5CrNi18-?10/i, /\bV2A\b/i, /\bA2[- ]?(?:50|70|80)\b/, /\b304\b/] },
  { name: '1.4305', klasse: 'M', dichte: 7.90, pat: [/1\.4305/, /X8CrNiS18-?9/i, /\b303\b/] },
  { name: '1.4404 (V4A)', klasse: 'M', dichte: 8.00, pat: [/1\.4404/, /X2CrNiMo17-?12-?2/i, /\bV4A\b/i, /\bA4[- ]?(?:50|70|80)\b/, /\b316L\b/i] },
  { name: '1.4571', klasse: 'M', dichte: 8.00, pat: [/1\.4571/, /X6CrNiMoTi17-?12-?2/i, /\b316Ti\b/i] },

  // --- Vergütungs-/Werkzeugstähle ---
  { name: '1.2379 (X153CrMoV12)', klasse: 'H', dichte: 7.70, pat: [/1\.2379/, /X153CrMoV12/i, /\bD2\b/] },
  { name: '31CrMoV9', klasse: 'H', dichte: 7.86, pat: [/31CrMoV9/i, /1\.8519/] },
  { name: '42CrMo4', klasse: 'P', dichte: 7.85, pat: [/42CrMo4/i, /1\.7225/, /\b4140\b/] },
  { name: '25CrMo4', klasse: 'P', dichte: 7.85, pat: [/25CrMo4/i, /1\.7218/] },

  // --- Baustähle ---
  { name: 'S355', klasse: 'P', dichte: 7.85, pat: [/S355\w*/i, /St\s?52-?3?/i, /1\.0570/] },
  { name: 'S235JR', klasse: 'P', dichte: 7.85, pat: [/S235\w*/i, /St\s?37-?2?/i, /1\.0038/] },
  { name: 'C45', klasse: 'P', dichte: 7.85, pat: [/\bC45\b/i, /1\.0503/] },

  // --- Gusseisen ---
  { name: 'GJL-250', klasse: 'K', dichte: 7.20, pat: [/GJL-?250/i, /GG25/i, /0\.6025/] },
  { name: 'GJS-400', klasse: 'K', dichte: 7.10, pat: [/GJS-?400/i, /GGG40/i, /0\.7040/] },

  // --- Kunststoffe/Nichtmetalle ---
  { name: 'POM', klasse: 'O', dichte: 1.41, pat: [/\bPOM\b/i, /Delrin/i, /Polyoxymethylen/i] },
  { name: 'PEEK', klasse: 'O', dichte: 1.30, pat: [/\bPEEK\b/i] },
  { name: 'PA6', klasse: 'O', dichte: 1.14, pat: [/\bPA\s?6\b/i, /Polyamid\s?6/i] },
];

// --- Zustand (Wärmebehandlung/Härtezustand) — GETRENNT von Oberflächenbehandlung ---
const CONDITION_PATTERNS = [
  { label: 'H1150', pat: /\bH1150\b/i }, { label: 'H1075', pat: /\bH1075\b/i },
  { label: 'H1025', pat: /\bH1025\b/i }, { label: 'H950', pat: /\bH950\b/i }, { label: 'H900', pat: /\bH900\b/i },
  { label: 'T651', pat: /\bT651\b/i }, { label: 'T6', pat: /\bT6\b/ }, { label: 'T4', pat: /\bT4\b/ },
  { label: 'vergütet (+QT)', pat: /\+?\s?QT\b|vergütet/i },
  { label: 'weichgeglüht', pat: /weichgeglüht|\bannealed\b/i },
  { label: 'normalgeglüht', pat: /normalgeglüht|normalized/i },
  { label: 'gehärtet', pat: /gehärtet(?!\w)/i },
];

// --- Oberflächenbehandlung — GETRENNT vom Zustand ---
const SURFACE_PATTERNS = [
  { label: 'HartCoat (Hartanodisiert)', pat: /hart[- ]?coat|hardcoat|hart[- ]?eloxiert|hartanodisiert|type\s?III/i },
  { label: 'eloxiert', pat: /eloxiert|anodi[sz]ed|eloxal/i },
  { label: 'brüniert', pat: /brüniert|black\s?oxide/i },
  { label: 'phosphatiert', pat: /phosphatiert|phosphat(e|ed)/i },
  { label: 'verzinkt', pat: /verzinkt|galvanized|zinc\s?plated/i },
  { label: 'vernickelt', pat: /vernickelt|nickel\s?plated/i },
  { label: 'verchromt', pat: /verchromt|chrome\s?plated/i },
  { label: 'pulverbeschichtet', pat: /pulverbeschichtet|powder\s?coat/i },
  { label: 'passiviert', pat: /passiviert|passivated/i },
  { label: 'nitriert', pat: /nitriert|nitrided/i },
];

// --- Oberflächen-FARBE (getrennt vom Beschichtungs-Typ, z.B. "Eloxiert (rot)") —
// wird im Fenster direkt HINTER dem gefundenen Oberflächen-Label gesucht.
const SURFACE_COLOR_PATTERNS = [
  { label: 'rot', pat: /\brot\b|\bred\b/i },
  { label: 'schwarz', pat: /\bschwarz\b|\bblack\b/i },
  { label: 'blau', pat: /\bblau\b|\bblue\b/i },
  { label: 'gold', pat: /\bgold(en)?\b/i },
  { label: 'silber', pat: /\bsilber\b|\bsilver\b/i },
  { label: 'natur', pat: /\bnatur(farben|farbig)?\b|\bnatural\b|\bklar\b|\bclear\b/i },
  { label: 'grau', pat: /\bgrau\b|\bgrey\b|\bgray\b/i },
  { label: 'gelb', pat: /\bgelb\b|\byellow\b/i },
  { label: 'grün', pat: /\bgrün\b|\bgreen\b/i },
  { label: 'weiß', pat: /\bweiß\b|\bweiss\b|\bwhite\b/i },
  { label: 'braun', pat: /\bbraun\b|\bbrown\b/i },
  { label: 'orange', pat: /\borange\b/i },
];

function findeOberflaechenFarbe(searchSpace, matchIndex, matchLength) {
  const fenster = searchSpace.slice(Math.max(0, matchIndex - 25), matchIndex + matchLength + 40);
  for (const c of SURFACE_COLOR_PATTERNS) {
    if (c.pat.test(fenster)) return c.label;
  }
  const ral = fenster.match(/RAL\s?\d{4}/i);
  return ral ? ral[0].toUpperCase().replace(/\s+/, ' ') : null;
}

// --- Konstrukteur/Ansprechpartner aus dem Schriftfeld (Konst.-Verantwortg./
// Design resp., E-Mail, Telefon/Phone) — wird später für QS-Rückverfolgung
// am Item gespeichert (Name) und soll perspektivisch mit ERPNext-
// Ansprechpartnern verknüpft werden.
// Bilinguale Kombination ("Konst.-Verantwortg./Design resp.") ZUERST versuchen,
// sonst würde bei getrennter Suche nur der deutsche Teil als Label erkannt und
// "Design resp." fälschlich als Teil des nachfolgenden Namens mit erfasst.
const KONSTRUKTEUR_LABEL_PATTERN = /(konst\.?-?\s?verantwortg\.?\s*\/?\s*design\s?resp\.?|design\s?resp\.?|konst\.?-?\s?verantwortg\.?)\s*\/?\s*([^\n]{0,80})/i;
const EMAIL_PATTERN = /[a-z0-9][a-z0-9._+-]*@[a-z0-9.-]+\.[a-z]{2,}/i;
// Label und Nummer NICHT als ein zusammenhängendes Muster fordern (siehe
// findeTelefon unten) — reine Adjazenz-Regex hat reale Telefonnummern im
// Schriftfeld verpasst, sobald zwischen Label und Zahl auch nur ein
// unerwartetes Zeichen stand (z.B. weiteres Label-Wort, Tab statt Leerzeichen).
const TELEFON_LABEL_PATTERN = /telefon\s*\/?\s*phone|tel\.?-?nr\.?|\btel\.?\b/i;
// Obergrenze bewusst großzügig (manche PDF-Exporte platzieren jede Ziffer als
// eigenes Textobjekt, wodurch beim Extrahieren zwischen JEDER Ziffer ein
// Leerzeichen landet — eine 13-stellige Nummer wird dann leicht 25+ Zeichen
// lang; eine knappe Obergrenze hat die Nummer bisher mitten drin abgeschnitten).
const TELEFON_NUMMER_PATTERN = /\+?\d[\d\s/().-]{4,60}\d/;
// Nächstes Label im Schriftfeld, an dem der erfasste Name-Text abgeschnitten
// werden muss (Textextraktion hat keine Zeilenumbrüche zwischen Tabellenzellen).
const NAME_STOPP_MUSTER = /(abt\.?|dept\.?|e-?mail|telefon|phone|gezeichnet|drawn|zeich\.?-?\s?datum|drw\.?-?\s?date)/i;

// Typografische Bindestrich-Varianten (En-/Em-Dash, non-breaking hyphen — sehen
// wie "-" aus, sind aber andere Unicode-Zeichen: U+2010..U+2015, U+2212) und
// geschützte/schmale Leerzeichen (U+00A0, U+2000..U+200A) auf ASCII normalisieren.
// Ließ TELEFON_NUMMER_PATTERN bisher genau an so einer Stelle abbrechen — nur
// Vorwahl + Bindestrich + ein paar Ziffern wurden erkannt, der Rest der Nummer
// dahinter fehlte, weil das Zeichen nicht im erlaubten Zeichensatz [\d\s/().-] war.
function normalisiereTrennzeichen(s) {
  return s
    .replace(/[‐-―−]/g, '-')
    .replace(/[  - ]/g, ' ');
}

// Telefonnummer im Fenster NACH dem Label suchen statt direkt anschließend zu
// verlangen — toleriert zusätzlichen Text/Whitespace zwischen Label und Zahl.
function findeTelefon(text) {
  const m = TELEFON_LABEL_PATTERN.exec(text);
  if (!m) return null;
  const fenster = normalisiereTrennzeichen(text.slice(m.index + m[0].length, m.index + m[0].length + 80));
  const num = fenster.match(TELEFON_NUMMER_PATTERN);
  return num ? num[0].trim() : null;
}

/** Konstrukteur/Ansprechpartner (Name, E-Mail, Telefon) aus dem PDF-Text, oder alle null. */
export function recognizeKonstrukteur(text) {
  if (!text) return { name: null, email: null, telefon: null };
  let name = null;
  const m = text.match(KONSTRUKTEUR_LABEL_PATTERN);
  if (m && m[2]) {
    const stopp = m[2].match(NAME_STOPP_MUSTER);
    let raw = stopp ? m[2].slice(0, stopp.index) : m[2];
    raw = raw.replace(/^[\s/:.-]+|[\s/:.-]+$/g, '').trim();
    if (raw && raw.length <= 60 && /[a-zäöüß]/i.test(raw)) name = raw;
  }
  const emailMatch = text.match(EMAIL_PATTERN);
  const telefon = findeTelefon(text);
  return {
    name,
    email: emailMatch ? emailMatch[0] : null,
    telefon,
  };
}

// Labels, in deren Nähe der Werkstoff typischerweise steht
const LABEL_PATTERN = /(werkstoff|material)\s*(behandlung|treatment)?[^\n]{0,110}/gi;

// Mechanische Werte direkt unter dem Werkstoff (Rm, Rp0.2, Dehnung A5, Einschnürung Z)
const MECH_VALUES_PATTERN = /Rm\s*[=>:]?\s*[\d.,\-\s]+MPa[^\n]{0,80}/i;

// Zeichnungsdatum: Label ("Zeich.-Datum"/"Drw. date"/...) gefolgt vom Datum im Schriftfeld
const ZEICHNUNGSDATUM_PATTERN = /(zeich\.?\s?-?\s?datum|drw\.?\s?date|zeichnungsdatum)[^\n]{0,40}?(\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})/i;

// Gewicht laut Schriftfeld (Gewicht [g]/Weight [g]/[kg]) — eigener Wert, unabhängig
// von der geometrisch berechneten Schätzung (Rohmaterial/Bounding-Box).
const GEWICHT_PATTERN = /(gewicht|weight)\s*\[?\s*(kg|g)\s*\]?[^\n]{0,20}?([\d.,]+)/i;

function parseKurzDatum(s) {
  const m = String(s).match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
  if (!m) return null;
  const [, d, mo, yRaw] = m;
  const y = yRaw.length === 2 ? (Number(yRaw) > 50 ? `19${yRaw}` : `20${yRaw}`) : yRaw;
  return `${y.padStart(4, '0')}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Zeichnungsdatum (Schriftfeld) aus dem PDF-Text, als 'YYYY-MM-DD' oder null. */
export function recognizeZeichnungsdatum(text) {
  if (!text) return null;
  const m = text.match(ZEICHNUNGSDATUM_PATTERN);
  return m ? parseKurzDatum(m[2]) : null;
}

/** Gewicht laut Schriftfeld (in kg umgerechnet) aus dem PDF-Text, oder null. */
export function recognizeGewicht(text) {
  if (!text) return null;
  const m = text.match(GEWICHT_PATTERN);
  if (!m) return null;
  const einheit = m[2].toLowerCase();
  const wert = parseFloat(m[3].replace(',', '.'));
  if (!Number.isFinite(wert)) return null;
  return einheit === 'g' ? wert / 1000 : wert;
}

// ---------------------------------------------------------------------------
// Eigene Materialien/Oberflächen — gespeichert im Browser (localStorage).
// WICHTIG: Das ist KEINE Datei auf der Festplatte, sondern browserspezifisch
// (dieser PC, dieser Browser-Profil). Export/Import als JSON zur Sicherung/
// Weitergabe an andere Rechner steht zur Verfügung.
// ---------------------------------------------------------------------------
const LS_MATERIALS = 'customMaterials';
const LS_SURFACES = 'customSurfaces';

function readLS(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
function writeLS(key, arr) {
  try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) { /* ignore */ }
}

export function getCustomMaterials() {
  return readLS(LS_MATERIALS);
}

/**
 * Neues Material speichern (im Browser). keywords: Komma-getrennter Text,
 * wird zu Wort-Mustern für die automatische Erkennung.
 */
export function addCustomMaterial({ name, klasse, dichte, keywords }) {
  const list = getCustomMaterials();
  const kws = String(keywords || '').split(',').map((s) => s.trim()).filter(Boolean);
  list.push({ name, klasse, dichte: Number(dichte) || 0, keywords: kws });
  writeLS(LS_MATERIALS, list);
  return list;
}
export function removeCustomMaterial(name) {
  writeLS(LS_MATERIALS, getCustomMaterials().filter((m) => m.name !== name));
}

export function getCustomSurfaces() {
  return readLS(LS_SURFACES);
}
export function addCustomSurface({ label, keywords }) {
  const list = getCustomSurfaces();
  const kws = String(keywords || '').split(',').map((s) => s.trim()).filter(Boolean);
  list.push({ label, keywords: kws });
  writeLS(LS_SURFACES, list);
  return list;
}
export function removeCustomSurface(label) {
  writeLS(LS_SURFACES, getCustomSurfaces().filter((s) => s.label !== label));
}

/** Eigene Materialien + Oberflächen als JSON-Datei herunterladen (Sicherung/Übertragung). */
export function exportMaterialienJson() {
  const data = { customMaterials: getCustomMaterials(), customSurfaces: getCustomSurfaces() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'materialien_eigene.json';
  a.click();
  URL.revokeObjectURL(url);
}

/** JSON-Datei (aus exportMaterialienJson) wieder einspielen. */
export async function importMaterialienJson(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (Array.isArray(data.customMaterials)) writeLS(LS_MATERIALS, data.customMaterials);
  if (Array.isArray(data.customSurfaces)) writeLS(LS_SURFACES, data.customSurfaces);
}

// Alle Materialien (fest + eigene) für Erkennung und Dropdown, nach Klasse gruppierbar
export function getAllMaterials() {
  const custom = getCustomMaterials().map((m) => ({
    name: m.name,
    klasse: m.klasse,
    dichte: m.dichte,
    pat: (m.keywords || []).map((k) => new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')),
    custom: true,
  }));
  return [...custom, ...MATERIAL_DB]; // eigene zuerst = höhere Priorität bei Konflikten
}

export function getAllSurfaces() {
  const custom = getCustomSurfaces().map((s) => ({
    label: s.label,
    pat: new RegExp((s.keywords || []).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') || '(?!)', 'i'),
    custom: true,
  }));
  return [...custom, ...SURFACE_PATTERNS];
}

export function materialsByClass() {
  const all = getAllMaterials();
  return MATERIAL_CLASSES.map((c) => ({
    ...c,
    materials: all.filter((m) => m.klasse === c.key),
  }));
}


// Kurzmuster, die fast nur aus einer kurzen Zahl/Buchstabe+Zahl bestehen, treffen
// im Volltext oft zufällig (Blattformat "A2", Maße, Nummern).
function istSchwachesMuster(re) {
  return /^(\\b)?[A-Za-z]?\d{1,4}(\\b)?$/.test(re.source);
}

// Treffer nur akzeptieren, wenn eine reine Zahl nicht mitten in einer längeren
// Zahl steht (z. B. "6082" in Teilenummer "10246082").
function findeMitGrenzen(re, text) {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  for (const m of text.matchAll(g)) {
    if (/^[\d.,]+$/.test(m[0])) {
      const davor = text[m.index - 1] || '';
      const danach = text[m.index + m[0].length] || '';
      if (/\d/.test(davor) || /\d/.test(danach)) continue;
    }
    return m;
  }
  return null;
}

/**
 * Sucht im PDF-Volltext nach Werkstoff, Zustand, Oberflächenbehandlung und
 * mechanischen Werten. Zustand und Oberfläche werden getrennt zurückgegeben.
 * @param {string} text - kompletter extrahierter PDF-Text
 */
export function recognizeMaterial(text) {
  if (!text) {
    return {
      material: null, matchedText: '', condition: null, surface: null, surfaceColor: null,
      mechValues: null, zeichnungsdatum: null, gewicht: null, konstrukteur: null,
    };
  }

  // 1) Bevorzugt: Text in der Nähe von "Werkstoff"/"Material"-Labels absuchen
  const labelHits = [...text.matchAll(LABEL_PATTERN)].map((m) => m[0]).join('\n');
  const searchSpace = labelHits + '\n' + text;

  let material = null;
  let matchedText = '';
  const alle = getAllMaterials();
  // (Reihenfolge: 1. starke Muster im Volltext, 2. alle Muster nur direkt hinter dem Label.)
  // Ältere Beschreibung: NUR direkt hinter "Werkstoff"/"Material"-Labels (alle Muster erlaubt).
  // 2. Durchgang: im Volltext, aber ohne schwache Kurzmuster (z. B. "A2", "304"),
  // die sonst zufällig in Formatangaben/Nummern treffen.
  for (const [raum, nurStark] of [[text, true], [labelHits, false]]) {
    if (material || !raum) continue;
    for (const entry of alle) {
      for (const re of entry.pat) {
        if (nurStark && istSchwachesMuster(re)) continue;
        const m = findeMitGrenzen(re, raum);
        if (m) { material = entry; matchedText = m[0]; break; }
      }
      if (material) break;
    }
  }

  let condition = null;
  for (const c of CONDITION_PATTERNS) {
    const m = searchSpace.match(c.pat);
    if (m) { condition = c.label; break; }
  }

  if (!condition) {
    const fz = searchSpace.match(/[-\s](F\d{2})\b/);
    if (fz) condition = fz[1];
  }

  let surface = null;
  let surfaceColor = null;
  for (const s of getAllSurfaces()) {
    const sm = s.pat.exec(searchSpace);
    if (sm) {
      surface = s.label;
      surfaceColor = findeOberflaechenFarbe(searchSpace, sm.index, sm[0].length);
      break;
    }
  }

  let mechValues = null;
  const mv = text.match(MECH_VALUES_PATTERN);
  if (mv) mechValues = mv[0].trim();

  const zeichnungsdatum = recognizeZeichnungsdatum(text);
  const gewicht = recognizeGewicht(text);
  const konstrukteurRoh = recognizeKonstrukteur(text);
  const konstrukteur = (konstrukteurRoh.name || konstrukteurRoh.email || konstrukteurRoh.telefon) ? konstrukteurRoh : null;

  return {
    material, matchedText, condition, surface, surfaceColor, mechValues, zeichnungsdatum, gewicht, konstrukteur,
  };
}
