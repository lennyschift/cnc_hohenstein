<template>
  <div
    class="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full min-h-[240px]"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <div class="flex items-center justify-between px-3 py-2 bg-slate-900/90 gap-2">
      <p class="text-[11px] text-slate-300 truncate flex-1 min-w-0">
        {{ fileName || 'PDF Zeichnung auswählen oder per Drag & Drop ablegen' }}
      </p>
      <label
        class="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-slate-800/80 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-700/80 transition flex-shrink-0"
      >
        Datei wählen
        <input type="file" accept="application/pdf" class="hidden" @change="onFile" />
      </label>
    </div>
    <!-- Markierungs-Werkzeugleiste — nur in der großen Zoom-Ansicht, wie
         Markieren/Zeichnen im Browser-PDF-Viewer. Rein lokal in dieser
         Sitzung (nicht in der PDF-Datei gespeichert), einmal geschlossen ist
         die Markierung wieder weg — reicht für "beim Prüfen kurz was
         anstreichen", ohne die Original-Zeichnungsdatei zu verändern. -->
    <div
      v-if="zoomable && pdfLoaded"
      class="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border-t border-slate-800 flex-wrap"
    >
      <button
        type="button"
        class="rounded px-2 py-1 text-[11px] font-medium border transition"
        :class="markupModus ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-amber-500'"
        title="Markieren/Zeichnen ein-/ausblenden (nur linke Maustaste — rechte Maustaste verschiebt weiterhin)"
        @click="markupModus = !markupModus"
      >
        ✏ Markieren
      </button>
      <button
        type="button"
        class="rounded px-2 py-1 text-[11px] font-medium border transition"
        :class="textModus ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-sky-500'"
        title="Text markieren und kopieren (Verschieben per Maus ist dabei aus)"
        @click="textModus = !textModus"
      >
        Aa Text markieren
      </button>
      <div class="flex items-center gap-0.5 rounded-lg border border-slate-700 p-0.5 bg-slate-950/60">
        <button
          type="button"
          class="rounded px-1.5 py-1 text-[11px] font-medium transition"
          :class="markupWerkzeug === 'stift' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'"
          title="Stift — deckende Linie"
          @click="markupWerkzeug = 'stift'"
        >
          ✏ Stift
        </button>
        <button
          type="button"
          class="rounded px-1.5 py-1 text-[11px] font-medium transition"
          :class="markupWerkzeug === 'textmarker' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'"
          title="Textmarker — durchscheinend, Text darunter bleibt lesbar"
          @click="markupWerkzeug = 'textmarker'"
        >
          🖍 Textmarker
        </button>
      </div>
      <button
        v-for="farbe in MARKUP_FARBEN"
        :key="farbe"
        type="button"
        class="w-5 h-5 rounded-full border-2 flex-shrink-0"
        :class="markupFarbe === farbe ? 'border-white' : 'border-slate-600'"
        :style="{ background: farbe }"
        :title="farbe"
        @click="markupFarbe = farbe"
      ></button>
      <button
        type="button"
        class="rounded px-2 py-1 text-[11px] font-medium border bg-slate-800 border-slate-600 text-slate-200 hover:border-slate-400 transition disabled:opacity-40"
        title="Letzten Strich rückgängig machen"
        :disabled="!markupStriche.length"
        @click="markupRueckgaengig"
      >
        ↺ Rückgängig
      </button>
      <button
        type="button"
        class="rounded px-2 py-1 text-[11px] font-medium border bg-slate-800 border-slate-600 text-slate-200 hover:border-red-500 transition disabled:opacity-40"
        title="Alle Markierungen löschen"
        :disabled="!markupStriche.length"
        @click="markupLoeschen"
      >
        🗑 Löschen
      </button>
      <span class="text-[10px] text-slate-500 ml-1">nur für diese Ansicht, nicht in der Datei gespeichert</span>
    </div>
    <div
      ref="scrollWrapRef"
      class="flex-1 bg-slate-950/40 min-h-[200px] relative"
      :class="zoomable ? 'overflow-auto' : 'flex items-center justify-center'"
      :style="zoomable ? { cursor: textModus ? 'text' : markupModus ? 'crosshair' : (dragging ? 'grabbing' : (zoomLevel > 1 ? 'grab' : 'zoom-in')) } : {}"
      @wheel="zoomable ? onWheel($event) : null"
      @mousedown="zoomable ? onMouseDown($event) : null"
      @mousemove="zoomable ? onMouseMove($event) : null"
      @mouseup="zoomable ? onMouseUp($event) : null"
      @mouseleave="zoomable ? onMouseUp($event) : null"
    >
      <!-- Beide Canvas (PDF + Markierungs-Overlay) teilen sich denselben
           Zoom-skalierten Rahmen, damit die Markierung exakt deckungsgleich
           mit- und beim Zoomen mitskaliert (kein separates Nachführen der
           Position beim Scrollen innerhalb des Zoom-Containers nötig). -->
      <div
        v-if="zoomable"
        class="relative"
        :style="canvasZoomStyle"
      >
        <canvas
          ref="canvasRef"
          class="block w-full h-full"
          :class="{ hidden: !pdfLoaded }"
        ></canvas>
        <canvas
          ref="markupCanvasRef"
          class="absolute inset-0 w-full h-full"
          :style="{ pointerEvents: markupModus ? 'auto' : 'none' }"
          @pointerdown="onMarkupPointerDown"
          @pointermove="onMarkupPointerMove"
          @pointerup="onMarkupPointerUp"
          @pointerleave="onMarkupPointerUp"
        ></canvas>
        <!-- Unsichtbare Text-Ebene der PDF (echter Text): macht Wörter markier-/kopierbar -->
        <div ref="textLayerRef" class="textLayer" :style="textLayerStyle"></div>
      </div>
      <div
        v-else
        class="relative"
        :class="{ hidden: !pdfLoaded }"
      >
        <canvas
          ref="canvasRef"
          class="block max-w-full max-h-full object-contain"
        ></canvas>
        <!-- Read-only Vorschau derselben Markierungen wie in der Zoom-Ansicht
             (siehe props.markup) — hier nicht zeichenbar, nur sichtbar, damit
             man nicht extra reinzoomen muss um zu sehen, was schon markiert wurde. -->
        <canvas
          ref="markupVorschauRef"
          class="absolute inset-0 w-full h-full pointer-events-none"
        ></canvas>
      </div>
      <div
        v-if="!pdfLoaded"
        class="absolute inset-0 flex flex-col items-center justify-center text-xs text-slate-400 gap-1 px-4"
      >
        <template v-if="pdfLoading">
          <div class="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-slate-400">PDF wird geladen…</span>
        </template>
        <template v-else>
          <span class="text-slate-500 font-medium">PDF hier ablegen</span>
          <span class="text-slate-600">Erste Seite wird mit PDF.js angezeigt.</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import { pdfRenderCache, extractPdfText } from '../utils/pdfThumbnail.js';
import { recognizeMaterial } from '../utils/materialRecognition.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL || '/'}pdf.worker.mjs`;

const props = defineProps({
  initialFile: { type: [File, Object], default: null },
  // Zoom/Pan nur in der großen Modal-Ansicht aktivieren (Inline-Vorschau bleibt bewusst einfach)
  zoomable: { type: Boolean, default: false },
  // Markierungs-Striche — von PartCard gehalten (NICHT lokale Komponenten-
  // Instanz), damit die kleine Inline-Vorschau und die große Zoom-Ansicht
  // (zwei getrennte Komponenten-Instanzen, die Zoom-Ansicht wird per v-if
  // erst beim Öffnen erzeugt und beim Schließen wieder zerstört) dieselben
  // Markierungen zeigen, statt dass sie beim Schließen des Modals verloren
  // wirken, weil sie nur in dessen lokalem State lagen.
  markup: { type: Array, default: () => [] },
});

const emits = defineEmits(['loaded', 'material-detected', 'kein-text-gefunden', 'update:markup']);

// --- Zoom & Pan (zentriert auf den Mauszeiger, wie ein PDF-Viewer im Browser) ---
const zoomLevel = ref(1);
const baseCssWidth = ref(0); // Breite bei Zoom=1 (an Container angepasst)
const baseAspect = ref(1); // Höhe/Breite-Verhältnis des Canvas
const dragging = ref(false);
let dragStart = null; // { x, y, scrollLeft, scrollTop, moved }

const canvasZoomStyle = computed(() => {
  if (!baseCssWidth.value) return {};
  const w = baseCssWidth.value * zoomLevel.value;
  return { width: `${w}px`, height: 'auto', marginLeft: 'auto', marginRight: 'auto' };
});

// Breite bei Zoom=1 so wählen, dass BEIDE Dimensionen in den Container passen
// (wie object-contain) — sonst wird ein "hohes" PDF oben/unten abgeschnitten.
function fitCssWidth(aspectHW) {
  const wrap = scrollWrapRef.value;
  const cw = wrap?.clientWidth || 700;
  const ch = wrap?.clientHeight || 700;
  if (!aspectHW) return cw;
  return Math.min(cw, ch / aspectHW);
}

function zoomAt(newZoom, clientX, clientY) {
  const wrap = scrollWrapRef.value;
  if (!wrap || !baseCssWidth.value) { zoomLevel.value = newZoom; return; }
  const rect = wrap.getBoundingClientRect();
  const vx = clientX - rect.left;
  const vy = clientY - rect.top;
  const oldWidth = baseCssWidth.value * zoomLevel.value;
  const oldHeight = oldWidth * baseAspect.value;
  const relX = (wrap.scrollLeft + vx) / oldWidth;
  const relY = (wrap.scrollTop + vy) / oldHeight;
  zoomLevel.value = newZoom;
  nextTick(() => {
    const newWidth = baseCssWidth.value * newZoom;
    const newHeight = newWidth * baseAspect.value;
    wrap.scrollLeft = relX * newWidth - vx;
    wrap.scrollTop = relY * newHeight - vy;
  });
}

function onWheel(e) {
  if (!pdfLoaded.value) return;
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
  const next = Math.min(6, Math.max(1, zoomLevel.value * factor));
  zoomAt(next, e.clientX, e.clientY);
}

function onMouseDown(e) {
  if (!pdfLoaded.value) return;
  // Bei aktivem Markieren zeichnet die linke Maustaste (siehe
  // onMarkupPointerDown) — hier NUR überspringen, damit daraus kein
  // gleichzeitiges Verschieben/Zoom-Umschalten wird. Rechte/mittlere
  // Maustaste bleibt auch beim Markieren fürs Verschieben nutzbar.
  if (textModus.value) return;
  if (markupModus.value && e.button === 0) return;
  const wrap = scrollWrapRef.value;
  dragStart = { x: e.clientX, y: e.clientY, scrollLeft: wrap.scrollLeft, scrollTop: wrap.scrollTop, moved: false };
}

function onMouseMove(e) {
  if (!dragStart) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragStart.moved = true;
  // Verschieben immer erlauben (auch bei Zoom=1) — bei "hohen" PDFs reicht die
  // Breiten-Anpassung allein nicht, dann muss man senkrecht schon vor dem Reinzoomen scrollen können.
  if (dragStart.moved) {
    dragging.value = true;
    const wrap = scrollWrapRef.value;
    wrap.scrollLeft = dragStart.scrollLeft - dx;
    wrap.scrollTop = dragStart.scrollTop - dy;
  }
}

function onMouseUp(e) {
  if (dragStart && !dragStart.moved) {
    // Reiner Klick (keine Bewegung) → Zoom umschalten, zentriert auf den Mauszeiger
    const next = zoomLevel.value > 1 ? 1 : 2.5;
    zoomAt(next, e.clientX, e.clientY);
  }
  dragStart = null;
  dragging.value = false;
}

// --- Markieren/Zeichnen (wie im Browser-PDF-Viewer) — rein lokal in dieser
// Sitzung, NICHT in der PDF-Datei gespeichert. Striche in NORMIERTEN
// Koordinaten (0..1 relativ zur Canvas-Größe) gespeichert, damit sie beim
// Zoomen/Größenändern korrekt mitskalieren, statt an festen Pixeln zu kleben.
const markupModus = ref(false);
const markupFarbe = ref('#ef4444');
const markupWerkzeug = ref('stift'); // 'stift' = deckend, 'textmarker' = durchscheinend
const MARKUP_FARBEN = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#111827'];
const markupCanvasRef = ref(null); // interaktives Overlay (nur Zoom-Ansicht)
const markupVorschauRef = ref(null); // read-only Overlay (kleine Inline-Vorschau)
const markupStriche = ref([]); // [{ farbe, werkzeug, punkte: [{x,y}] }] — lokale Arbeitskopie von props.markup
let aktuellerStrich = null;
let markupResizeObs = null;
let markupVorschauResizeObs = null;

// props.markup ist die von PartCard gehaltene "Wahrheit" — bei jeder Änderung
// (auch von der jeweils ANDEREN Instanz, z.B. Zoom-Ansicht schließen und
// Inline-Vorschau aktualisiert sich) lokale Arbeitskopie übernehmen und beide
// Overlays neu zeichnen (die jeweils nicht vorhandene Ref ist dann einfach null).
watch(() => props.markup, (neu) => {
  markupStriche.value = (neu || []).map((s) => ({ ...s, punkte: [...s.punkte] }));
  zeichneMarkupNeu();
  zeichneVorschauMarkup();
}, { immediate: true });

function markupPunktAusEvent(e) {
  const overlay = markupCanvasRef.value;
  const rect = overlay.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: 0, y: 0 };
  return {
    x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
  };
}

// Gemeinsame Zeichenroutine für BEIDE Overlays (interaktiv + read-only
// Vorschau) — dieselben normierten Striche, nur auf unterschiedliche Canvas.
function zeichneStricheAufCanvas(canvasEl, striche) {
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const stiftBreite = Math.max(2, canvasEl.width * 0.0035);
  for (const strich of striche) {
    if (strich.punkte.length < 2) continue;
    const istTextmarker = strich.werkzeug === 'textmarker';
    // Textmarker: 'multiply' + breiterer Strich lässt Text darunter lesbar
    // durchscheinen (wie ein echter Leuchtstift), statt ihn deckend zu überdecken.
    ctx.globalCompositeOperation = istTextmarker ? 'multiply' : 'source-over';
    ctx.globalAlpha = istTextmarker ? 0.45 : 1;
    ctx.strokeStyle = strich.farbe;
    ctx.lineWidth = istTextmarker ? stiftBreite * 4 : stiftBreite;
    ctx.beginPath();
    strich.punkte.forEach((p, i) => {
      const x = p.x * canvasEl.width;
      const y = p.y * canvasEl.height;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

function zeichneMarkupNeu() {
  zeichneStricheAufCanvas(markupCanvasRef.value, markupStriche.value);
}
function zeichneVorschauMarkup() {
  zeichneStricheAufCanvas(markupVorschauRef.value, markupStriche.value);
}

// Overlay-Canvas-Auflösung an die aktuelle Anzeigegröße (× Bildschirm-Pixel-
// Dichte) anpassen — bei Zoomen/Fenstergröße ändert sich die CSS-Größe des
// gemeinsamen Rahmens, die eigentliche Zeichenfläche muss mitwachsen, sonst
// wird das Overlay unscharf oder verzerrt gegenüber dem PDF darunter.
function markupCanvasGroesseAktualisieren() {
  const overlay = markupCanvasRef.value;
  if (!overlay) return;
  const rect = overlay.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = window.devicePixelRatio || 1;
  const breitePx = Math.round(rect.width * dpr);
  const hoehePx = Math.round(rect.height * dpr);
  if (overlay.width === breitePx && overlay.height === hoehePx) return;
  overlay.width = breitePx;
  overlay.height = hoehePx;
  zeichneMarkupNeu();
}
function markupVorschauGroesseAktualisieren() {
  const overlay = markupVorschauRef.value;
  if (!overlay) return;
  const rect = overlay.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = window.devicePixelRatio || 1;
  const breitePx = Math.round(rect.width * dpr);
  const hoehePx = Math.round(rect.height * dpr);
  if (overlay.width === breitePx && overlay.height === hoehePx) return;
  overlay.width = breitePx;
  overlay.height = hoehePx;
  zeichneVorschauMarkup();
}

function onMarkupPointerDown(e) {
  // Nur linke Maustaste zeichnet — rechte/mittlere Maustaste soll weiterhin
  // zum Verschieben durchgereicht werden (siehe onMouseDown oben, das bei
  // Nicht-Links-Klick trotz aktivem Markieren normal weiterläuft).
  if (!markupModus.value || e.button !== 0) return;
  e.preventDefault();
  aktuellerStrich = { farbe: markupFarbe.value, werkzeug: markupWerkzeug.value, punkte: [markupPunktAusEvent(e)] };
  markupStriche.value.push(aktuellerStrich);
  try { markupCanvasRef.value.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
}
function onMarkupPointerMove(e) {
  if (!markupModus.value || !aktuellerStrich) return;
  aktuellerStrich.punkte.push(markupPunktAusEvent(e));
  zeichneMarkupNeu();
}
function onMarkupPointerUp() {
  if (!aktuellerStrich) return;
  aktuellerStrich = null;
  // Erst beim Loslassen an PartCard melden (nicht bei jedem Zwischenpunkt) —
  // das hält die Inline-Vorschau synchron, sobald der Strich fertig ist.
  emits('update:markup', markupStriche.value.map((s) => ({ ...s, punkte: [...s.punkte] })));
}
function markupRueckgaengig() {
  markupStriche.value.pop();
  zeichneMarkupNeu();
  emits('update:markup', markupStriche.value.map((s) => ({ ...s, punkte: [...s.punkte] })));
}
function markupLoeschen() {
  markupStriche.value = [];
  zeichneMarkupNeu();
  emits('update:markup', []);
}

watch(markupCanvasRef, (el) => {
  if (markupResizeObs) { markupResizeObs.disconnect(); markupResizeObs = null; }
  if (!el) return;
  markupCanvasGroesseAktualisieren();
  markupResizeObs = new ResizeObserver(() => markupCanvasGroesseAktualisieren());
  markupResizeObs.observe(el);
});
watch(markupVorschauRef, (el) => {
  if (markupVorschauResizeObs) { markupVorschauResizeObs.disconnect(); markupVorschauResizeObs = null; }
  if (!el) return;
  markupVorschauGroesseAktualisieren();
  markupVorschauResizeObs = new ResizeObserver(() => markupVorschauGroesseAktualisieren());
  markupVorschauResizeObs.observe(el);
});

// Text der Zeichnung auslesen (lokal) und nach Werkstoff/Zustand/Oberfläche durchsuchen
async function scanMaterial(file) {
  try {
    const text = await extractPdfText(file);
    // Kein/kaum Text gefunden → PDF ist vermutlich gescannt/rasterisiert statt
    // ein "echtes" Vektor-PDF mit Textebene. Automatische Erkennung kann dann
    // grundsätzlich nichts finden (unabhängig davon, was gesucht wird).
    if (!text || text.trim().length < 20) {
      emits('kein-text-gefunden');
      return;
    }
    const result = recognizeMaterial(text);
    if (result.material || result.surface || result.condition || result.zeichnungsdatum || result.gewicht || result.konstrukteur) {
      emits('material-detected', result);
    }
  } catch (e) {
    console.warn('Material-Erkennung fehlgeschlagen', e);
  }
}

const fileName = ref('');
const pdfLoaded = ref(false);
const pdfLoading = ref(false);
const canvasRef = ref(null);
const scrollWrapRef = ref(null);

function setFromFile(file) {
  if (!file) return;
  const name = file.name || '';
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(name)) return;
  fileName.value = name;
  pdfLoaded.value = false;
  pdfLoading.value = true;
  zoomLevel.value = 1;
  // markupStriche NICHT hier zurücksetzen — das übernimmt PartCard über die
  // props.markup-Synchronisierung (siehe watch(() => props.markup, ...) oben):
  // nur bei WIRKLICH neuer Datei wird pdfMarkup dort geleert, beim bloßen
  // erneuten Öffnen der Zoom-Ansicht für dieselbe Datei bleiben Markierungen
  // erhalten statt beim Neu-Mounten verloren zu gehen.
  markupModus.value = false;
  emits('loaded', file);
  renderPdf(file);
  scanMaterial(file);
}

function onFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  setFromFile(file);
}

function onDrop(event) {
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  setFromFile(file);
}

const textModus = ref(false);
const textLayerRef = ref(null);
const seiteBreitePt = ref(0);
const seiteHoehePt = ref(0);
watch(textModus, (v) => { if (v) markupModus.value = false; });
watch(markupModus, (v) => { if (v) textModus.value = false; });

// Text-Ebene wird einmal in Seiten-Punkten (pt) aufgebaut und per CSS-Skalierung
// an die aktuelle Anzeigegröße/den Zoom angepasst.
const textLayerStyle = computed(() => {
  const k = seiteBreitePt.value ? (baseCssWidth.value * zoomLevel.value) / seiteBreitePt.value : 1;
  return {
    position: 'absolute',
    left: '0px',
    top: '0px',
    width: `${seiteBreitePt.value}px`,
    height: `${seiteHoehePt.value}px`,
    transform: `scale(${k})`,
    transformOrigin: '0 0',
    '--scale-factor': 1,
    pointerEvents: textModus.value ? 'auto' : 'none',
    userSelect: textModus.value ? 'text' : 'none',
    zIndex: 5,
  };
});

async function rendereTextEbene(page) {
  await nextTick();
  const container = textLayerRef.value;
  if (!container) return;
  container.innerHTML = '';
  try {
    const tl = new pdfjsLib.TextLayer({
      textContentSource: page.streamTextContent(),
      container,
      viewport: page.getViewport({ scale: 1 }),
    });
    await tl.render();
  } catch (e) {
    console.warn('Text-Ebene fehlgeschlagen', e);
  }
}

let currentRenderTask = null;
let renderSeq = 0;

// Für die Zoom-Ansicht (großes Modal) bleibt die PDF-Seite nach dem ersten
// Rendern greifbar, damit beim Reinzoomen NEU (schärfer) gerendert werden
// kann — ein reines CSS-Hochskalieren des einmal gerenderten Bildes (wie
// zuvor) wird ab einem gewissen Zoom zwangsläufig unscharf, ein echter
// PDF-Viewer im Browser rendert dagegen bei jedem Zoom neu. Nur für die
// kleine Inline-Vorschau (zoomable=false) bleibt der schnelle Bild-Cache
// aktiv, dort wird nie gezoomt.
let aktuelleSeite = null;
let aktuelleRenderSkala = 1;
let basisSkala = 1; // Skala, die bei Zoom=1 einmal gerendert wurde (Referenz für die Nachschärfung unten)
let seiteBreite1x = 0;
let seiteHoehe1x = 0;
const MAX_RENDER_SKALA = 10; // Deckel gegen ausufernden Speicherverbrauch bei starkem Zoom (reicht deutlich für lesbare Details)
const MAX_PIXEL_FLAECHE = 40_000_000; // zusätzlicher Deckel unabhängig von der Blattgröße (~6300×6300)

// WICHTIG: NIE direkt in den sichtbaren Canvas rendern, bevor das Ergebnis
// fertig ist — canvas.width/height sofort zu setzen löscht den bisherigen
// Inhalt SOFORT (wird leer/weiß), das eigentliche Zeichnen durch PDF.js
// kann bei einer großen, detailreichen Zeichnung in hoher Auflösung spürbar
// dauern. Stattdessen in einen unsichtbaren Offscreen-Canvas rendern und
// NUR bei Erfolg in den sichtbaren Canvas übernehmen — genau das hat den
// gemeldeten "wird beim Reinzoomen kurz/dauerhaft weiß"-Bug verursacht.
async function renderBeiSkala(scale, myToken) {
  if (!aktuelleSeite) return;
  const viewport = aktuelleSeite.getViewport({ scale });
  const off = document.createElement('canvas');
  off.width = viewport.width;
  off.height = viewport.height;
  const offCtx = off.getContext('2d');
  if (currentRenderTask) {
    try { currentRenderTask.cancel(); } catch (e) { /* ignore */ }
  }
  const task = aktuelleSeite.render({ canvasContext: offCtx, viewport });
  currentRenderTask = task;
  try {
    await task.promise;
  } catch (error) {
    if (error?.name === 'RenderingCancelledException') return;
    console.warn('Nachschärfen beim Zoom fehlgeschlagen', error);
    return;
  }
  if (myToken !== renderSeq) return;
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.width = off.width;
  canvas.height = off.height;
  canvas.getContext('2d').drawImage(off, 0, 0);
  aktuelleRenderSkala = scale;
}

// Beim Reinzoomen (debounced, damit nicht bei jedem Mausrad-Tick neu
// gerendert wird) neu rendern, sobald der aktuelle Zoom die Auflösung des
// zuletzt gerenderten Bilds überschreitet. Beim Rauszoomen genügt weiterhin
// das vorhandene (höher aufgelöste) Bild — kein erneutes Rendern nötig.
let zoomRenderTimer = null;
watch(zoomLevel, () => {
  if (!props.zoomable || !aktuelleSeite) return;
  if (zoomLevel.value * basisSkala <= aktuelleRenderSkala * 1.05) return; // noch scharf genug
  clearTimeout(zoomRenderTimer);
  zoomRenderTimer = setTimeout(() => {
    let zielSkala = Math.min(basisSkala * zoomLevel.value, MAX_RENDER_SKALA);
    if (seiteBreite1x && seiteHoehe1x) {
      const maxSkalaFuerFlaeche = Math.sqrt(MAX_PIXEL_FLAECHE / (seiteBreite1x * seiteHoehe1x));
      zielSkala = Math.min(zielSkala, maxSkalaFuerFlaeche);
    }
    if (zielSkala <= aktuelleRenderSkala * 1.05) return;
    renderBeiSkala(zielSkala, renderSeq).catch((e) => console.warn('Nachschärfen beim Zoom fehlgeschlagen', e));
  }, 220);
});

async function renderPdf(file) {
  if (!file) {
    pdfLoaded.value = false;
    pdfLoading.value = false;
    return;
  }
  // Laufendes Rendering abbrechen, damit nie zwei gleichzeitig auf denselben Canvas zeichnen
  const myToken = ++renderSeq;
  if (currentRenderTask) {
    try { currentRenderTask.cancel(); } catch (e) { /* ignore */ }
    currentRenderTask = null;
  }
  aktuelleSeite = null;

  // Bereits gerendert? Sofort aus Cache zeichnen (kein erneutes Laden beim
  // Bauteilwechsel) — NUR für die kleine Inline-Vorschau. Die Zoom-Ansicht
  // braucht die echte PDF-Seite (siehe oben), lädt deshalb immer frisch.
  if (!props.zoomable && pdfRenderCache.has(file)) {
    await nextTick();
    const canvas = canvasRef.value;
    if (!canvas) { pdfLoading.value = false; return; }
    const img = new Image();
    img.onload = () => {
      if (myToken !== renderSeq) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      pdfLoaded.value = true;
      pdfLoading.value = false;
    };
    img.src = pdfRenderCache.get(file);
    return;
  }

  let url;
  try {
    url = URL.createObjectURL(file);
    const pdf = await pdfjsLib.getDocument(url).promise;
    if (myToken !== renderSeq) return; // veraltet → abbrechen
    const page = await pdf.getPage(1);
    if (myToken !== renderSeq) return;

    await nextTick();
    const canvas = canvasRef.value;
    if (!canvas) {
      pdfLoading.value = false;
      return;
    }

    // Rendern bei 2× DPR für scharfe Darstellung; CSS-Breite = Container-Breite (Zoom = 1)
    const base = page.getViewport({ scale: 1 });
    seiteBreite1x = base.width;
    seiteHoehe1x = base.height;
    const container = scrollWrapRef.value || canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const targetCssWidth = container?.clientWidth || 700;
    // Auflösung bewusst moderat: Inline-Vorschau ~1,5× Anzeigegröße, große Ansicht
    // ~2× — beim Hineinzoomen wird ohnehin nachgeschärft (siehe renderBeiSkala).
    // Vorher immer mind. 3,5-fach (A4 ≈ 2000×2900 px) — das war der Hauptteil
    // der Renderzeit, ohne sichtbaren Gewinn.
    let scale = props.zoomable
      ? (targetCssWidth * dpr * 2) / base.width
      : (targetCssWidth * dpr * 1.5) / base.width;
    scale = props.zoomable ? Math.min(Math.max(scale, 2), 5) : Math.min(Math.max(scale, 1.5), 3);
    const viewport = page.getViewport({ scale });

    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const task = page.render({ canvasContext: context, viewport });
    currentRenderTask = task;
    await task.promise;
    if (myToken !== renderSeq) return;
    pdfLoaded.value = true;
    pdfLoading.value = false;
    aktuelleSeite = page;
    basisSkala = scale;
    aktuelleRenderSkala = scale;
    if (props.zoomable) {
      baseAspect.value = viewport.height / viewport.width;
      baseCssWidth.value = fitCssWidth(baseAspect.value);
      seiteBreitePt.value = base.width;
      seiteHoehePt.value = base.height;
      rendereTextEbene(page);
    } else {
      try { pdfRenderCache.set(file, canvas.toDataURL('image/jpeg', 0.92)); } catch (e) { /* ignore */ }
    }
    // Progressiv schärfer: das schnelle Bild steht schon, jetzt im Hintergrund
    // hoch aufgelöst nachrendern (Inline ~3×, große Ansicht ~4× Anzeigegröße,
    // gedeckelt über Pixel-Fläche/Maximalskala) und unmerklich austauschen.
    let ziel = (targetCssWidth * dpr * (props.zoomable ? 4 : 3)) / base.width;
    ziel = Math.min(ziel, MAX_RENDER_SKALA, Math.sqrt(MAX_PIXEL_FLAECHE / (base.width * base.height)));
    if (ziel > scale * 1.2) {
      await renderBeiSkala(ziel, myToken);
      if (myToken === renderSeq && !props.zoomable) {
        try { pdfRenderCache.set(file, canvas.toDataURL('image/jpeg', 0.92)); } catch (e) { /* ignore */ }
      }
    }
  } catch (error) {
    if (error?.name === 'RenderingCancelledException') return; // erwartet bei Abbruch
    console.error('Fehler beim Rendern des PDFs', error);
    pdfLoaded.value = false;
    pdfLoading.value = false;
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

watch(
  () => props.initialFile,
  (file) => {
    if (file) setFromFile(file);
    else {
      fileName.value = '';
      pdfLoaded.value = false;
      pdfLoading.value = false;
    }
  },
);

onMounted(() => {
  if (props.initialFile) setFromFile(props.initialFile);
});

onBeforeUnmount(() => {
  if (markupResizeObs) { markupResizeObs.disconnect(); markupResizeObs = null; }
  if (markupVorschauResizeObs) { markupVorschauResizeObs.disconnect(); markupVorschauResizeObs = null; }
});
</script>
