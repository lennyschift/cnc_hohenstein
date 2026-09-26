import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL || '/'}pdf.worker.mjs`;

// Gemeinsamer Cache (File -> gerendertes Bild als Data-URL), damit beim Wechsel
// zwischen Bauteilen eine bereits gerenderte Zeichnung nicht erneut geladen wird.
export const pdfRenderCache = new WeakMap();

// Cache für geparste STEP-Geometrie (File -> occt result.meshes), damit beim
// Durchklicken der Teileliste das langsame WASM-Parsen nicht erneut läuft.
export const stepMeshCache = new WeakMap();

// Cache für extrahierten PDF-Volltext (File -> string), für Material-Erkennung.
export const pdfTextCache = new WeakMap();

/**
 * Extrahiert den Volltext aller Seiten einer PDF (lokal, kein Upload).
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractPdfText(file) {
  if (!file || file.type !== 'application/pdf') return '';
  if (pdfTextCache.has(file)) return pdfTextCache.get(file);
  let url;
  try {
    url = URL.createObjectURL(file);
    const pdf = await pdfjsLib.getDocument(url).promise;
    let full = '';
    const maxPages = Math.min(pdf.numPages, 5); // reicht für Schriftfeld/Zeichnungen
    for (let i = 1; i <= maxPages; i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      full += content.items.map((it) => it.str).join(' ') + '\n';
    }
    pdfTextCache.set(file, full);
    return full;
  } catch (e) {
    console.warn('PDF-Textextraktion fehlgeschlagen', e);
    return '';
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

/**
 * Erstellt eine kleine Vorschau (Data-URL) der ersten PDF-Seite für Tab-Thumbnails.
 * @param {File} file - PDF-Datei
 * @param {number} maxWidth - maximale Breite in px
 * @returns {Promise<string>} Data-URL (image/jpeg) oder '' bei Fehler
 */
export async function getPdfThumbnail(file, maxWidth = 80) {
  if (!file || file.type !== 'application/pdf') return '';
  try {
    const url = URL.createObjectURL(file);
    const pdf = await pdfjsLib.getDocument(url).promise;
    const page = await pdf.getPage(1);
    const scale = maxWidth / (page.getViewport({ scale: 1 }).width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    URL.revokeObjectURL(url);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch (e) {
    console.warn('PDF-Thumbnail fehlgeschlagen', e);
    return '';
  }
}
