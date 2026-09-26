<template>
  <div
    class="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full min-h-[240px]"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <div class="flex items-center justify-between px-3 py-2 bg-slate-900/90 flex-wrap gap-2">
      <p class="text-[11px] text-slate-300 truncate min-w-0 flex-1">
        {{ fileName || 'STEP/STL/GLB auswählen oder per Drag & Drop ablegen' }}
      </p>
      <div class="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          class="rounded px-2 py-1 text-[11px] font-medium border transition"
          :class="showQuader ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-blue-500'"
          title="Quader-Maßkasten (L×B×H) ein-/ausblenden"
          @click="toggleQuader"
        >
          ⬚ Quader
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 text-[11px] font-medium border transition"
          :class="showRund ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-green-500'"
          title="Rundmaterial-Maßkasten (⌀×L) ein-/ausblenden"
          @click="toggleRund"
        >
          ○ Rund
        </button>
        <button
          v-if="showRund"
          type="button"
          class="rounded px-2 py-1 text-[11px] font-medium border bg-slate-800 border-slate-600 text-slate-200 hover:border-green-500 transition"
          title="Drehachse des Rundmaterials wechseln (90° drehen)"
          @click="cycleRoundAxis"
        >
          ⟳ Achse: {{ roundAxis.toUpperCase() }}
        </button>
        <button
          v-if="flaechen && flaechen.length"
          type="button"
          class="rounded px-2 py-1 text-[11px] font-medium border bg-slate-800 border-slate-600 text-slate-200 hover:border-teal-500 transition"
          title="Schlägt die erkannte Haupt-Drehachse als Rundmaterial-Achse vor (meiste/größte zusammengehörige Zylinderflächen) — statt des kleinstmöglichen umschließenden Durchmessers"
          @click="wendeDrehfraesRohteilAn"
        >
          ⚙ Drehfräs-Rohteil
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 text-[11px] font-medium border transition"
          :class="pickFaceMode ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-amber-500'"
          title="Ebene oder zylindrische Fläche anklicken → legt die Drehachse fest"
          @click="togglePickFace"
        >
          🎯 Referenzfläche
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 text-[11px] font-medium border transition"
          :class="abstandModus ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-emerald-500'"
          title="Zwei Punkte (Kantenmitte/-ende, Kreismittelpunkt, Flächenpunkt) anklicken → Abstand dazwischen"
          @click="toggleAbstandModus"
        >
          📐 Abstand
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 text-[11px] font-medium border transition"
          :class="schnittModus ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-fuchsia-500'"
          title="Schnittebene ein-/ausblenden — Modell entlang einer Achse aufschneiden, um Innenkonturen (z. B. Bohrungen) zu sehen"
          @click="toggleSchnittModus"
        >
          ✂ Schnitt
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 text-[11px] font-medium border transition"
          :class="innenlebenModus ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-cyan-500'"
          title="Nur Innenleben zeigen — blendet die Außenhülle aus, Bohrungen/Kernflächen bleiben sichtbar (wie ein Röntgenbild)"
          @click="toggleInnenlebenModus"
        >
          🫥 Innenleben
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 text-[11px] font-medium border bg-slate-800 border-slate-600 text-slate-200 hover:border-sky-500 transition"
          title="Aktuelle Ansicht als Vorschaubild übernehmen (Teileliste + PDF)"
          @click="captureThumbnail(true)"
        >
          📷 Ansicht
        </button>
        <span class="text-[10px] text-slate-500">Farbe</span>
        <input
          v-model="modelColorHex"
          type="color"
          class="w-7 h-7 rounded cursor-pointer border border-slate-600"
          title="Modellfarbe ändern"
          @input="applyModelColor"
        />
      </div>
      <label
        class="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-slate-800/80 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-700/80 transition"
      >
        Datei wählen
        <input
          type="file"
          accept=".step,.stp,.stl,.glb,.gltf"
          class="hidden"
          @change="onFile"
        />
      </label>
    </div>
    <div class="flex-1 bg-slate-950/40 flex flex-col min-h-[200px] relative">
      <div ref="containerRef" class="flex-1 w-full min-h-[180px]"></div>
      <div
        v-if="pickFaceMode"
        class="absolute top-2 left-1/2 -translate-x-1/2 z-20 rounded bg-amber-600/90 px-3 py-1 text-[11px] font-medium text-white shadow"
      >
        Ebene oder zylindrische Fläche anklicken (Stirnfläche oder Rundmaterial-Mantel) → legt die Drehachse fest
      </div>
      <div
        v-if="abstandModus"
        class="absolute top-2 left-1/2 -translate-x-1/2 z-20 rounded bg-emerald-600/90 px-3 py-1 text-[11px] font-medium text-white shadow"
      >
        {{ abstandPunkt1 ? 'Zweiten Punkt anklicken (Kantenmitte, Kreismittelpunkt, Fläche)' : 'Ersten Punkt anklicken' }}
      </div>
      <div
        v-if="abstandText"
        class="absolute bottom-2 right-2 z-20 rounded-lg bg-slate-900/95 border border-emerald-500/60 px-3 py-2 text-[12px] font-medium text-white shadow-lg flex items-center gap-2 max-w-[75%]"
      >
        <span class="text-emerald-300">📐</span>
        <span>{{ abstandText }}</span>
        <button type="button" class="text-slate-400 hover:text-white ml-1 flex-shrink-0" @click="clearAbstand">×</button>
      </div>
      <div
        v-if="schnittModus"
        class="absolute top-2 left-1/2 -translate-x-1/2 z-20 rounded-lg bg-slate-900/95 border border-fuchsia-500/60 px-3 py-2 text-[11px] font-medium text-white shadow-lg flex items-center gap-2"
      >
        <span class="text-fuchsia-300">✂ Achse</span>
        <button
          v-for="a in ['X', 'Y', 'Z']"
          :key="a"
          type="button"
          class="w-6 h-6 rounded border text-[11px] font-semibold transition"
          :class="schnittAchse === a ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-fuchsia-500'"
          @click="schnittAchse = a"
        >{{ a }}</button>
        <input
          v-model.number="schnittPosition"
          type="range"
          min="-1"
          max="1"
          step="0.01"
          class="w-36 accent-fuchsia-500"
          title="Position der Schnittebene entlang der Achse"
        />
        <button
          type="button"
          class="w-6 h-6 rounded border text-[11px] transition"
          :class="schnittInvertiert ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-fuchsia-500'"
          title="Geschnittene Seite umkehren"
          @click="schnittInvertiert = !schnittInvertiert"
        >⇄</button>
      </div>
      <div
        v-if="messwert"
        class="absolute bottom-2 right-2 z-20 rounded-lg bg-slate-900/95 border border-purple-500/60 px-3 py-2 text-[12px] font-medium text-white shadow-lg flex items-center gap-2 max-w-[75%]"
      >
        <span class="text-purple-300">📏</span>
        <span>{{ messwert }}</span>
        <button type="button" class="text-slate-400 hover:text-white ml-1 flex-shrink-0" @click="clearMesswert">×</button>
      </div>
      <div
        v-if="materialClass || oberflaeche"
        class="absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded px-1.5 py-1 bg-white/85 shadow"
      >
        <template v-if="materialClass">
          <span
            class="inline-flex items-center justify-center w-6 h-6 rounded text-[13px] font-bold text-slate-900"
            :style="{ background: materialClass.color }"
          >{{ materialClass.key }}</span>
          <span class="text-[11px] font-medium text-slate-800">{{ materialClass.label }}</span>
        </template>
        <!-- Oberflächenbeschichtung fett/rot direkt neben der Materialklasse —
             sehr fertigungsrelevant (z.B. Eloxieren VOR/NACH bestimmten
             Bearbeitungsschritten) und soll hier nicht übersehen werden. -->
        <span
          v-if="oberflaeche"
          class="text-[11px] font-bold text-red-600"
          :class="{ 'border-l border-slate-400 pl-1.5 ml-0.5': materialClass }"
        >{{ oberflaeche }}</span>
      </div>
      <div
        v-if="loadingStep"
        class="absolute inset-0 flex items-center justify-center bg-slate-950/70 z-10"
      >
        <div class="flex flex-col items-center gap-2">
          <div class="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-[11px] text-slate-300">STEP wird geladen…</span>
        </div>
      </div>
      <div
        v-if="!loadingStep && kantenLaden"
        class="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 rounded px-1.5 py-1 bg-slate-950/70 shadow"
      >
        <div class="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-[10px] text-slate-300">Kanten werden berechnet…</span>
      </div>
      <div
        v-if="stepError"
        class="px-3 py-2 bg-amber-950/30 border-t border-amber-500/40 text-[10px] text-amber-200"
      >
        {{ stepError }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { stepMeshCache } from '../utils/pdfThumbnail.js';
import { leseStepMeshes } from '../utils/occtImport.js';
import { jobFuerDatei, planeAnalyse } from '../utils/analyseQueue.js';
import { naechsteFlaeche, abstandZurFlaeche, naechsteKante, abstandZurKante } from '../utils/occtFaceMeasure.js';

const props = defineProps({
  initialFile: { type: [File, Object], default: null },
  materialClass: { type: Object, default: null },
  // Oberflächenbeschichtung (z.B. "eloxiert (rot)") — nur zur Anzeige als
  // Badge neben der Materialklasse, siehe Kommentar im Template.
  oberflaeche: { type: String, default: '' },
  aufmass: { type: Number, default: 0 },
  // Exakte Flächen-Liste aus opencascade.js (siehe utils/occtFaceMeasure.js) —
  // ermöglicht exaktes Messen (Bohrungsdurchmesser/Radien) und eine exakte
  // (statt aus dem Dreiecksnetz geschätzte) Referenzflächen-Normale.
  flaechen: { type: Array, default: () => [] },
  // Kanten-Liste (Linien/Kreise/Freiform) aus derselben opencascade.js-Analyse —
  // ermöglicht Fusion-360-artiges Anklicken einzelner Kanten (z.B. die Kreiskante
  // einer Bohrung oder kleinen Verrundung), nicht nur ganzer Flächen.
  kanten: { type: Array, default: () => [] },
  // true, solange PartCard die exakte Flächen-/Kanten-Analyse noch berechnet
  // (läuft asynchron NACH dem schnellen Erst-Rendern) — nur für den Hinweis
  // unten, dass die Kanten noch kommen, damit es nicht wie ein Fehler wirkt.
  kantenLaden: { type: Boolean, default: false },
});

const emits = defineEmits(['loaded', 'thumbnail', 'dimensions']);

const showQuader = ref(localStorage.getItem('mvQuader') === 'true');
const showRund = ref(localStorage.getItem('mvRund') === 'true');
watch(showQuader, (v) => localStorage.setItem('mvQuader', v ? 'true' : 'false'));
watch(showRund, (v) => localStorage.setItem('mvRund', v ? 'true' : 'false'));
const roundAxis = ref('x'); // Drehachse für Rundmaterial (x/y/z)
let roundCenter = null; // optionaler Achsen-Mittelpunkt (aus Referenzfläche), sonst Bounding-Box-Mitte
let quaderGroup = null;
let rundGroup = null;
let labelRenderer = null;

function longestAxis(size) {
  return [['x', size.x], ['y', size.y], ['z', size.z]].sort((a, b) => b[1] - a[1])[0][0];
}

// Beste Drehachse für Drehteile: die Achse mit dem KLEINSTEN umschließenden ⌀
// (ein Drehteil passt richtig ausgerichtet in den kleinsten Zylinder).
function bestRoundAxis(object, box) {
  const center = box.getCenter(new THREE.Vector3());
  let mx = 0;
  let my = 0;
  let mz = 0;
  const v = new THREE.Vector3();
  object.traverse((child) => {
    const pos = child.isMesh && child.geometry?.attributes?.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i += 1) {
      v.fromBufferAttribute(pos, i);
      child.localToWorld(v);
      const dx = v.x - center.x;
      const dy = v.y - center.y;
      const dz = v.z - center.z;
      const rx = dy * dy + dz * dz; // Abstand² zur x-Achse
      const ry = dx * dx + dz * dz; // zur y-Achse
      const rz = dx * dx + dy * dy; // zur z-Achse
      if (rx > mx) mx = rx;
      if (ry > my) my = ry;
      if (rz > mz) mz = rz;
    }
  });
  return [['x', mx], ['y', my], ['z', mz]].sort((a, b) => a[1] - b[1])[0][0];
}

// Rohmaterial-Durchmesser: doppelter max. Abstand aller Punkte von der gewählten Drehachse.
// Liefert bei Zylindern den Zylinder-⌀, bei Teilen mit Lasche den ⌀ bis zum entferntesten Punkt.
function computeRoundStock(object, box, axisOverride, centerOverride) {
  const size = box.getSize(new THREE.Vector3());
  const center = centerOverride || box.getCenter(new THREE.Vector3());
  const axis = axisOverride || longestAxis(size);
  const length = size[axis];
  const perp = ['x', 'y', 'z'].filter((a) => a !== axis);
  let maxR2 = 0;
  const v = new THREE.Vector3();
  object.traverse((child) => {
    const pos = child.isMesh && child.geometry?.attributes?.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i += 1) {
      v.fromBufferAttribute(pos, i);
      child.localToWorld(v);
      const d0 = v[perp[0]] - center[perp[0]];
      const d1 = v[perp[1]] - center[perp[1]];
      const r2 = d0 * d0 + d1 * d1;
      if (r2 > maxR2) maxR2 = r2;
    }
  });
  return { diameter: 2 * Math.sqrt(maxR2), length };
}

// Automatische Dreh-/Rohmaterial-Achse: bei einem klassischen Dreh-Frästeil
// liegen die MEISTEN runden Merkmale (Bohrungen, Wellenabsätze, Flansche) auf
// EINER gemeinsamen Achse — der Spindelachse, auf der das Rohmaterial
// eingespannt war. Einzelne quer angeordnete Bohrungen (meist nachträglich
// gefräst) stehen dagegen für sich allein und fallen so aus der Wertung.
// Heuristik: Zylinderflächen nach gemeinsamer Achsgeraden gruppieren (nicht
// nach Radius — anders als istKoaxial, das nur exakte Duplikate matched),
// dann die Gruppe mit den MEISTEN zusammengehörigen Flächen wählen (bei
// Gleichstand: die mit dem größten Durchmesser — vermutlich der Rohteil-
// Außendurchmesser selbst, an dem das Teil eingespannt wurde).
function ermittleHauptdrehachse() {
  const zylinder = (props.flaechen || []).filter((f) => f.typ === 'zylinder' && f.achse && f.achsenpunkt && f.radius);
  if (!zylinder.length) return null;
  const gruppen = [];
  for (const f of zylinder) {
    let treffer = null;
    for (const g of gruppen) {
      const dot = f.achse.x * g.achse.x + f.achse.y * g.achse.y + f.achse.z * g.achse.z;
      if (Math.abs(dot) < 0.999) continue;
      const dx = f.achsenpunkt.x - g.achsenpunkt.x;
      const dy = f.achsenpunkt.y - g.achsenpunkt.y;
      const dz = f.achsenpunkt.z - g.achsenpunkt.z;
      const projLen = dx * g.achse.x + dy * g.achse.y + dz * g.achse.z;
      const perpX = dx - projLen * g.achse.x;
      const perpY = dy - projLen * g.achse.y;
      const perpZ = dz - projLen * g.achse.z;
      const perpAbstand = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ);
      if (perpAbstand < Math.max(f.radius, g.maxRadius, 1) * 0.05) { treffer = g; break; }
    }
    if (treffer) {
      treffer.flaechen.push(f);
      treffer.maxRadius = Math.max(treffer.maxRadius, f.radius);
    } else {
      gruppen.push({ achse: f.achse, achsenpunkt: f.achsenpunkt, flaechen: [f], maxRadius: f.radius });
    }
  }
  gruppen.sort((a, b) => b.flaechen.length - a.flaechen.length || b.maxRadius - a.maxRadius);
  return gruppen[0];
}

// Drehachse beim Laden automatisch setzen — bevorzugt über die erkannte
// Hauptdrehachse (siehe oben, nutzt die exakten Flächendaten aus opencascade.js,
// falls schon verfügbar), sonst Fallback auf die alte, aus dem reinen
// Dreiecksnetz geschätzte "kleinster umschließender Durchmesser"-Heuristik
// (z.B. bei STL/GLB ohne Flächendaten, oder bevor die Analyse fertig ist).
function resetRoundAxis() {
  roundCenter = null;
  if (!currentMesh || !scene) return;
  const box = new THREE.Box3().setFromObject(currentMesh);
  try {
    roundAxis.value = bestRoundAxis(currentMesh, box);
  } catch (e) {
    roundAxis.value = longestAxis(box.getSize(new THREE.Vector3()));
  }
}

// "Drehfräs-Rohteil": alternative, eigenständige Option zum normalen "Rund"
// (kleinstmöglicher umschließender Durchmesser) — schlägt stattdessen die
// erkannte Haupt-Drehachse vor (siehe ermittleHauptdrehachse), passend für
// klassische Dreh-Frästeile, bei denen der kleinste umschließende Durchmesser
// NICHT zwangsläufig der Achse entspricht, auf der das Rohmaterial eingespannt war.
function wendeDrehfraesRohteilAn() {
  if (!currentMesh || !scene) return;
  const gruppe = ermittleHauptdrehachse();
  if (!gruppe) return;
  const achse = new THREE.Vector3(gruppe.achse.x, gruppe.achse.y, gruppe.achse.z).normalize();
  const kandidaten = [['x', Math.abs(achse.x)], ['y', Math.abs(achse.y)], ['z', Math.abs(achse.z)]];
  kandidaten.sort((a, b) => b[1] - a[1]);
  // Nur übernehmen, wenn die erkannte Achse wirklich (fast) entlang einer
  // Weltachse liegt — unser Rundmaterial-Maßkasten unterstützt nur
  // achsparallele Ausrichtung.
  if (kandidaten[0][1] <= 0.95) return;
  roundAxis.value = kandidaten[0][0];
  const box = new THREE.Box3().setFromObject(currentMesh);
  const boxCenter = box.getCenter(new THREE.Vector3());
  const c = new THREE.Vector3(gruppe.achsenpunkt.x, gruppe.achsenpunkt.y, gruppe.achsenpunkt.z);
  c[roundAxis.value] = boxCenter[roundAxis.value];
  roundCenter = c;
  if (!showRund.value) showRund.value = true;
  emitDimensions();
  buildRund();
}

// Drehachse zyklisch wechseln (x → y → z → x), Mittelpunkt zurück auf Bauteilmitte
function cycleRoundAxis() {
  roundAxis.value = { x: 'y', y: 'z', z: 'x' }[roundAxis.value] || 'x';
  roundCenter = null;
  emitDimensions();
  if (showRund.value) buildRund();
}

// Maße aus Bounding Box + Drehdurchmesser (gewählte Achse) melden (Modell-Einheiten, mm)
function emitDimensions() {
  if (!currentMesh || !scene) return;
  const box = new THREE.Box3().setFromObject(currentMesh);
  const s = box.getSize(new THREE.Vector3());
  if (!(s.x || s.y || s.z)) return;
  let roundD = 0;
  let roundL = 0;
  try {
    const rs = computeRoundStock(currentMesh, box, roundAxis.value, roundCenter);
    roundD = rs.diameter;
    roundL = rs.length;
  } catch (e) { /* ignore */ }
  emits('dimensions', { x: s.x, y: s.y, z: s.z, roundD, roundL });
}

// --- Maßkästen (Quader + Rund) mit Beschriftung (CSS2D) ---
function makeLabel(text, pos, bg) {
  const d = document.createElement('div');
  d.textContent = text;
  d.style.cssText = `background:${bg};color:#fff;padding:1px 6px;border-radius:4px;`
    + 'font:600 11px/1.2 Arial,sans-serif;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.3);';
  const o = new CSS2DObject(d);
  o.position.copy(pos);
  return o;
}

function disposeGroup(g) {
  if (!g || !scene) return;
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
    if (o.element && o.element.parentNode) o.element.parentNode.removeChild(o.element);
  });
  scene.remove(g);
}

function buildQuader() {
  disposeGroup(quaderGroup); quaderGroup = null;
  if (!currentMesh || !scene) return;
  const a = Number(props.aufmass) || 0;
  const box = new THREE.Box3().setFromObject(currentMesh).expandByScalar(a); // + Aufmaß je Seite
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const { min, max } = box;
  const r = (v) => Math.round(v * 10) / 10;
  const g = new THREE.Group();
  g.add(new THREE.Box3Helper(box, 0x2563eb));
  g.add(makeLabel(`${r(size.x)} mm`, new THREE.Vector3(center.x, min.y, max.z), '#1e3a8a'));
  g.add(makeLabel(`${r(size.y)} mm`, new THREE.Vector3(max.x, center.y, max.z), '#1e3a8a'));
  g.add(makeLabel(`${r(size.z)} mm`, new THREE.Vector3(max.x, min.y, center.z), '#1e3a8a'));
  scene.add(g); quaderGroup = g;
}

function buildRund() {
  disposeGroup(rundGroup); rundGroup = null;
  if (!currentMesh || !scene) return;
  const box = new THREE.Box3().setFromObject(currentMesh);
  const center = roundCenter || box.getCenter(new THREE.Vector3());
  const rs = computeRoundStock(currentMesh, box, roundAxis.value, roundCenter);
  const a = Number(props.aufmass) || 0;
  const radius = rs.diameter / 2 + a;
  const length = rs.length + 2 * a;
  if (!radius || !length) return;
  const axis = roundAxis.value;
  const half = length / 2;
  const segs = 48;
  // Schlankes Drahtgitter: 2 Endkreise + nur 4 Axiallinien
  const pts = [];
  for (const y of [half, -half]) {
    let prev = null;
    for (let i = 0; i <= segs; i += 1) {
      const t = (i / segs) * Math.PI * 2;
      const p = new THREE.Vector3(Math.cos(t) * radius, y, Math.sin(t) * radius);
      if (prev) pts.push(prev, p);
      prev = p;
    }
  }
  for (let k = 0; k < 4; k += 1) {
    const t = (k * Math.PI) / 2;
    const x = Math.cos(t) * radius;
    const z = Math.sin(t) * radius;
    pts.push(new THREE.Vector3(x, half, z), new THREE.Vector3(x, -half, z));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x16a34a }));
  if (axis === 'x') lines.rotation.z = Math.PI / 2;
  else if (axis === 'z') lines.rotation.x = Math.PI / 2;
  lines.position.copy(center);
  const r = (v) => Math.round(v * 10) / 10;
  const axisVec = axis === 'x' ? new THREE.Vector3(1, 0, 0)
    : axis === 'y' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
  const perpVec = axis === 'x' ? new THREE.Vector3(0, radius, 0) : new THREE.Vector3(radius, 0, 0);
  const g = new THREE.Group();
  g.add(lines);
  // Durchmesser-Beschriftung an den äußeren Endkreis setzen (Achsende + radialer
  // Versatz), Längen-Beschriftung dafür auf die seitliche Linie (Achsmitte +
  // radialer Versatz) — vorher war es genau umgekehrt (Durchmesser auf der
  // Linie, Länge am Kreis), was auf Wunsch getauscht wurde.
  g.add(makeLabel(`⌀ ${r(radius * 2)} mm`, center.clone().add(axisVec.clone().multiplyScalar(half)).add(perpVec), '#166534'));
  g.add(makeLabel(`L ${r(length)} mm`, center.clone().add(perpVec), '#166534'));
  scene.add(g); rundGroup = g;
}

function refreshMeasures() {
  if (showQuader.value) buildQuader(); else { disposeGroup(quaderGroup); quaderGroup = null; }
  if (showRund.value) buildRund(); else { disposeGroup(rundGroup); rundGroup = null; }
}
function toggleQuader() { showQuader.value = !showQuader.value; refreshMeasures(); }
function toggleRund() { showRund.value = !showRund.value; refreshMeasures(); }

// --- Referenzfläche wählen: Klick auf eine (ebene) Fläche → deren Normale = Drehachse ---
// --- Messen: standardmäßig aktiv (wie Fusion 360) — Klick auf eine Fläche zeigt
// direkt unten rechts den exakten Wert, kein eigener Modus-Button nötig. Nur die
// Referenzflächen-Wahl bleibt ein expliziter Modus, weil sie Bauteildaten ändert. ---
const pickFaceMode = ref(false);
const messwert = ref('');
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoverGroup = null; // schwaches Highlight beim Überfahren (Fusion-Style)
let pickGroup = null; // festes Highlight der zuletzt gemessenen Fläche
let letzteHoverZeit = 0;

// Three.js' Raycaster kennt Clipping-Ebenen NICHT — er trifft immer die volle,
// ungeschnittene Original-Geometrie. Ohne diesen Filter ließen sich beim
// aktiven Schnitt weggeschnittene (unsichtbare) Flächen trotzdem anklicken/
// hovern und wurden dann (unclipped) als "Geister"-Hervorhebung angezeigt.
function sichtbareTreffer(hits) {
  // Three.js' Raycaster überspringt unsichtbare Objekte NICHT von selbst —
  // wichtig sowohl für die Schnittebene als auch für "Innenleben" (dort wird
  // die Außenhülle per mesh.visible=false ausgeblendet, nicht per Clipping).
  let ergebnis = hits.filter((h) => h.object.visible);
  if (schnittModus.value && schnittEbene) {
    ergebnis = ergebnis.filter((h) => schnittEbene.distanceToPoint(h.point) >= -1e-6);
  }
  return ergebnis;
}

// Hervorhebungs-/Markierungs-Meshes (Hover, Referenzfläche, Abstand) zeigen
// oft die GESAMTE getroffene Fläche (nicht nur den Klickpunkt) — auch die
// müssen bei aktivem Schnitt geclippt werden, sonst "blutet" die Markierung
// über die Schnittkante hinaus in den eigentlich weggeschnittenen Bereich.
function wendeSchnittAufGruppeAn(gruppe) {
  if (!gruppe || !schnittModus.value || !schnittEbene) return;
  gruppe.traverse((o) => { if (o.material) o.material.clippingPlanes = [schnittEbene]; });
}

function togglePickFace() {
  pickFaceMode.value = !pickFaceMode.value;
  if (pickFaceMode.value) abstandModus.value = false;
  if (renderer) renderer.domElement.style.cursor = '';
}

function clearMesswert() {
  messwert.value = '';
  disposeGroup(pickGroup);
  pickGroup = null;
}

// --- Abstand messen: wie in Fusion 360 — ganz normal Flächen/Kanten anklicken
// (dieselbe Anwahl wie beim einfachen Messen), zwischen den ZWEI angeklickten
// Elementen wird dann automatisch der sinnvollste Abstand berechnet: zwei
// (fast) parallele Ebenen → senkrechter Abstand zwischen den Ebenen; zwei
// (fast) achsparallele Zylinder/Bohrungen → Achsabstand (Lochabstand); sonst
// (z.B. eine Kante) Punkt-zu-Punkt zu einem sinnvollen Referenzpunkt
// (Kreiskante → Mittelpunkt, gerade Kante → näheres Ende). ---
const abstandModus = ref(false);
const abstandText = ref('');
const abstandPunkt1 = ref(null);
let abstandTreffer1 = null;
let abstandHit1 = null;
let abstandGruppe = null;
let abstandVorschauGruppe = null;

function toggleAbstandModus() {
  abstandModus.value = !abstandModus.value;
  if (abstandModus.value) pickFaceMode.value = false;
  abstandTreffer1 = null;
  abstandHit1 = null;
  abstandPunkt1.value = null;
  disposeGroup(abstandVorschauGruppe);
  abstandVorschauGruppe = null;
  // Beim DEAKTIVIEREN des Modus auch die zuletzt gemessene Maßlinie/-zahl
  // wieder ausblenden — sie soll nur sichtbar sein, während der Modus aktiv ist.
  if (!abstandModus.value) clearAbstand();
  if (renderer) renderer.domElement.style.cursor = '';
}

function clearAbstand() {
  abstandText.value = '';
  abstandTreffer1 = null;
  abstandHit1 = null;
  abstandPunkt1.value = null;
  disposeGroup(abstandGruppe);
  abstandGruppe = null;
}

// Schnittebene ("✂ Schnitt") — schneidet das Modell entlang einer Welt-Achse
// auf, um Innenkonturen (z.B. Bohrungen bei Drehteilen) sichtbar zu machen.
// Ein erster Versuch mit echter Stencil-Buffer-Kappung (feste Kappen-Ebene,
// wie bei Fusion 360) ist an inkonsistenter Dreiecks-Wicklung der aus OCCT
// gemergten Flächen gescheitert (ergab eine falsch große, zufällige Kappen-
// Fläche statt der echten Schnittkontur). Robusterer Ansatz statt dessen:
// die Original-Fläche bleibt beim Schnitt NUR noch von vorne sichtbar
// (side:FrontSide), und die dadurch aufgedeckte Innenseite wird mit einer
// zweiten, flach eingefärbten Kopie derselben Geometrie (side:BackSide, matte
// "Schnittflächen"-Farbe statt Metall-Schattierung) überzogen — zeigt die
// ECHTE Innenkontur (inkl. Stufen/Bohrungen), nur klar erkennbar als
// Schnittfläche statt wie zuvor verwirrend "hohl" in derselben Metallfarbe.
const schnittModus = ref(false);
const schnittAchse = ref('X');
const schnittPosition = ref(0); // -1..1, Anteil der halben Bauteilgröße entlang der Achse
const schnittInvertiert = ref(false);
const SCHNITT_FARBE = 0xd9762c; // warmes Orange, klassische Schnittflächen-Farbe
let schnittEbene = null;
let schnittFlaechenGruppe = null;
let schnittKonturLinie = null;
let schnittLetzterMesh = null; // erkennt einen neu geladenen/ersetzten Mesh, um die Box neu zu berechnen

function entferneSchnittFlaechen() {
  if (!schnittFlaechenGruppe) return;
  schnittFlaechenGruppe.traverse((o) => { if (o.material) o.material.dispose(); });
  if (scene) scene.remove(schnittFlaechenGruppe);
  schnittFlaechenGruppe = null;
}

function baueSchnittFlaechen() {
  entferneSchnittFlaechen();
  if (!schnittModus.value || !currentMesh || !schnittEbene || !scene) return;
  const meshes = [];
  currentMesh.traverse((o) => { if (o.isMesh) meshes.push(o); });
  if (!meshes.length) return;
  const gruppe = new THREE.Group();
  gruppe.name = '__schnittFlaeche';
  for (const mesh of meshes) {
    const mat = new THREE.MeshStandardMaterial({
      color: SCHNITT_FARBE, metalness: 0.05, roughness: 0.9,
      side: THREE.BackSide,
      clippingPlanes: [schnittEbene],
    });
    const kopie = new THREE.Mesh(mesh.geometry, mat);
    kopie.applyMatrix4(mesh.matrixWorld);
    gruppe.add(kopie);
  }
  scene.add(gruppe);
  schnittFlaechenGruppe = gruppe;
}

function entferneSchnittKontur() {
  if (!schnittKonturLinie) return;
  schnittKonturLinie.geometry?.dispose();
  schnittKonturLinie.material?.dispose();
  if (scene) scene.remove(schnittKonturLinie);
  schnittKonturLinie = null;
}

// Zeichnet die eigentliche Schnittkante — die Kontur, an der die Ebene die
// Bauteil-Oberfläche schneidet — als fette, immer sichtbare Linie (wie der
// Rand einer Schnittfläche in einem CAD-Viewer). Berechnet pro Dreieck exakt
// die 0 oder 2 Schnittpunkte mit der Ebene (Standard-"Slice a mesh"-Verfahren,
// funktioniert unabhängig davon, ob das Netz wasserdicht/topologisch sauber
// ist — genau das ist bei den aus OCCT-Flächen gemergten Netzen nicht immer
// gegeben, ein Stencil-Ansatz war deshalb hier bewusst nicht die Wahl).
function schneideKante(pA, dA, pB, dB, ziel) {
  if ((dA > 0 && dB > 0) || (dA < 0 && dB < 0) || dA === dB) return false;
  ziel.copy(pA).lerp(pB, dA / (dA - dB));
  return true;
}

function baueSchnittKontur() {
  entferneSchnittKontur();
  if (!schnittModus.value || !currentMesh || !schnittEbene || !scene) return;
  const meshes = [];
  currentMesh.traverse((o) => { if (o.isMesh) meshes.push(o); });
  if (!meshes.length) return;

  const segmente = [];
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const treffer = [];

  for (const mesh of meshes) {
    const pos = mesh.geometry.getAttribute('position');
    if (!pos) continue;
    const matrixWelt = mesh.matrixWorld;
    for (let i = 0; i < pos.count; i += 3) {
      va.fromBufferAttribute(pos, i).applyMatrix4(matrixWelt);
      vb.fromBufferAttribute(pos, i + 1).applyMatrix4(matrixWelt);
      vc.fromBufferAttribute(pos, i + 2).applyMatrix4(matrixWelt);
      const da = schnittEbene.distanceToPoint(va);
      const db = schnittEbene.distanceToPoint(vb);
      const dc = schnittEbene.distanceToPoint(vc);
      treffer.length = 0;
      if (schneideKante(va, da, vb, db, p1)) treffer.push(p1.clone());
      if (schneideKante(vb, db, vc, dc, p1)) treffer.push(p1.clone());
      if (schneideKante(vc, dc, va, da, p1)) treffer.push(p1.clone());
      if (treffer.length === 2) {
        segmente.push(treffer[0].x, treffer[0].y, treffer[0].z, treffer[1].x, treffer[1].y, treffer[1].z);
      }
    }
  }
  if (!segmente.length) return;

  const geo = new LineSegmentsGeometry();
  geo.setPositions(segmente);
  const groesse = renderer ? renderer.getSize(new THREE.Vector2()) : new THREE.Vector2(800, 600);
  const mat = new LineMaterial({
    color: 0x7a3a0e, // dunkles Orange — hebt sich von der Schnittflächen-Farbe ab, wirkt wie eine Konturlinie
    linewidth: 2.5,
    resolution: groesse,
    depthTest: false,
  });
  const linie = new LineSegments2(geo, mat);
  linie.computeLineDistances();
  linie.renderOrder = 1000;
  scene.add(linie);
  schnittKonturLinie = linie;
}

// Kanten-Overlays (exakter Kanten-Überzug + evtl. Vollkreis-/Referenz-Overlays),
// die NICHT zur Schnittfläche gehören, aber trotzdem am Schnitt beteiligte
// Geometrie zeigen — ohne eigenes Clipping würden Kanten des weggeschnittenen
// Teils weiter "freischwebend" sichtbar bleiben (kein Material mehr davor, das
// sie per Tiefentest verdeckt), was genau den gemeldeten Effekt "Kanten noch
// da, teilweise durchsichtig" erzeugt.
function schnittKantenGruppen() {
  return [exakteKantenGroup, hoverGroup, pickGroup, abstandGruppe, abstandVorschauGruppe].filter(Boolean);
}

function aktualisiereSchnittebene() {
  if (!renderer) return;
  if (!schnittModus.value || !currentMesh) {
    if (currentMesh) {
      currentMesh.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        o.material.clippingPlanes = [];
        if (o.userData.schnittUrsprungsSide !== undefined) {
          o.material.side = o.userData.schnittUrsprungsSide;
          delete o.userData.schnittUrsprungsSide;
        }
      });
    }
    for (const g of schnittKantenGruppen()) {
      g.traverse((o) => { if (o.material) o.material.clippingPlanes = []; });
    }
    entferneSchnittFlaechen();
    entferneSchnittKontur();
    return;
  }
  const box = new THREE.Box3().setFromObject(currentMesh);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const achsenKey = schnittAchse.value.toLowerCase();
  const halbe = (size[achsenKey] || 1) / 2;
  const achsenVektor = new THREE.Vector3(
    schnittAchse.value === 'X' ? 1 : 0,
    schnittAchse.value === 'Y' ? 1 : 0,
    schnittAchse.value === 'Z' ? 1 : 0,
  );
  const ebenenPunkt = center.clone().add(achsenVektor.clone().multiplyScalar(schnittPosition.value * halbe));
  const normale = schnittInvertiert.value ? achsenVektor.clone().negate() : achsenVektor;
  if (!schnittEbene) schnittEbene = new THREE.Plane();
  schnittEbene.setFromNormalAndCoplanarPoint(normale, ebenenPunkt);
  currentMesh.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    o.material.clippingPlanes = [schnittEbene];
    if (o.userData.schnittUrsprungsSide === undefined) o.userData.schnittUrsprungsSide = o.material.side;
    o.material.side = THREE.FrontSide; // eigene Rückseite aus, stattdessen die separate Schnittfläche unten
  });
  for (const g of schnittKantenGruppen()) {
    g.traverse((o) => { if (o.material) o.material.clippingPlanes = [schnittEbene]; });
  }
  baueSchnittFlaechen();
  baueSchnittKontur();
}

function toggleSchnittModus() {
  schnittModus.value = !schnittModus.value;
  if (schnittModus.value && innenlebenModus.value) { innenlebenModus.value = false; wendeInnenlebenAn(); }
  aktualisiereSchnittebene();
}

watch([schnittAchse, schnittPosition, schnittInvertiert], aktualisiereSchnittebene);

// "🫥 Innenleben" — statt einer Schnittebene (die bei komplexen Teilen immer
// wieder verwirrende Kanten-/Durchsichtigkeits-Artefakte erzeugt hat) einfach
// die komplette Außenhülle ausblenden und nur die Bohrungen/Kernflächen im
// Inneren stehen lassen — wie ein Röntgenbild, kein Ebenen-/Clipping-Aufwand
// nötig. Klassifikation pro (bereits koaxial gemergter) Fläche: von einem
// Punkt auf der Fläche einen Strahl entlang der Flächennormale schießen — bei
// einer Bohrung trifft der Strahl schnell die gegenüberliegende Bohrungswand
// oder den Lochboden (kurze Distanz), bei einer Außenfläche geht der Strahl
// weit (oder verlässt das Bauteil ganz) → Schwellwert an der Bauteilgröße.
const innenlebenModus = ref(false);
let innenlebenLetzterMesh = null;

function probeAusMesh(mesh) {
  const pos = mesh.geometry.getAttribute('position');
  if (!pos || pos.count < 3) return null;
  const dreieckIndex = Math.floor(pos.count / 3 / 2); // mittleres Dreieck, robuster als das erste
  const i = dreieckIndex * 3;
  const a = new THREE.Vector3().fromBufferAttribute(pos, i);
  const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
  const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
  const zentrum = a.clone().add(b).add(c).divideScalar(3);
  const normaleLokal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
  zentrum.applyMatrix4(mesh.matrixWorld);
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  const normale = normaleLokal.applyMatrix3(normalMatrix).normalize();
  return { zentrum, normale };
}

// Klassifikation pro (bereits koaxial gemergter) Fläche: von ihrem Mittelpunkt
// in BEIDE Normalenrichtungen einen Strahl schießen (Vorzeichen der Dreiecks-
// Normale ist wegen inkonsistenter Wicklung bei gemergten Netzen nicht
// verlässlich) und die GRÖSSERE der beiden freien Distanzen nehmen. Schwelle
// relativ zur gesamten Bauteilgröße. Das ist ein Heuristik-Kompromiss: bei
// Teilen mit einer sehr großen Bohrung relativ zum restlichen Bauteil kann
// das dazu führen, dass zu viel (im Extremfall alles) als "außen" gilt —
// deshalb der Sicherheitsnetz-Check unten in klassifikationIstSinnvoll().
function klassifiziereAussenschale() {
  if (!currentMesh) return;
  const meshes = [];
  currentMesh.traverse((o) => { if (o.isMesh) meshes.push(o); });
  if (!meshes.length) return;
  const box = new THREE.Box3().setFromObject(currentMesh);
  const diag = box.getSize(new THREE.Vector3()).length() || 1;
  const schwelle = diag * 0.25;
  const lokalerRaycaster = new THREE.Raycaster();
  lokalerRaycaster.far = diag * 2;
  const versatz = Math.max(diag * 0.001, 0.01);
  const distanzInRichtung = (zentrum, richtung) => {
    const ursprung = zentrum.clone().add(richtung.clone().multiplyScalar(versatz));
    lokalerRaycaster.set(ursprung, richtung);
    const treffer = lokalerRaycaster.intersectObjects(meshes, false);
    return treffer.length ? treffer[0].distance : Infinity;
  };
  for (const mesh of meshes) {
    const probe = probeAusMesh(mesh);
    if (!probe) { mesh.userData.istAussenschale = true; continue; }
    const distanz = Math.max(
      distanzInRichtung(probe.zentrum, probe.normale),
      distanzInRichtung(probe.zentrum, probe.normale.clone().negate()),
    );
    mesh.userData.istAussenschale = distanz > schwelle;
  }
}

// Sicherheitsnetz gegen genau den gemeldeten Bug "ganzes Modell verschwindet":
// eine Klassifikation, die ALLES (oder so gut wie nichts) als Außenfläche
// einstuft, ist für ein reales Bauteil unplausibel (praktisch jedes Teil hat
// sowohl Außenflächen als auch mindestens eine erkennbare Innenkontur) und
// deutet auf einen Grenzfall der Heuristik hin — dann lieber gar nichts
// ausblenden, als dem Nutzer ein leeres/komplett unverändertes Ergebnis ohne
// Erklärung zu zeigen.
function klassifikationIstSinnvoll(meshes) {
  const anzahlAussen = meshes.filter((m) => m.userData.istAussenschale).length;
  return anzahlAussen > 0 && anzahlAussen < meshes.length;
}

function wendeInnenlebenAn() {
  if (currentMesh) {
    currentMesh.traverse((o) => {
      if (!o.isMesh) return;
      o.visible = innenlebenModus.value ? !o.userData.istAussenschale : true;
    });
  }
  if (exakteKantenGroup) exakteKantenGroup.visible = !innenlebenModus.value;
}

function toggleInnenlebenModus() {
  const aktivieren = !innenlebenModus.value;
  if (aktivieren && currentMesh) {
    if (schnittModus.value) { schnittModus.value = false; aktualisiereSchnittebene(); }
    klassifiziereAussenschale();
    const meshes = [];
    currentMesh.traverse((o) => { if (o.isMesh) meshes.push(o); });
    if (!klassifikationIstSinnvoll(meshes)) {
      window.alert('Konnte bei diesem Bauteil keine eindeutige Innenkontur erkennen (z. B. sehr große Bohrung relativ zur Bauteilgröße) — "Innenleben" wird hier übersprungen, damit nicht das ganze Modell verschwindet.');
      return;
    }
  }
  innenlebenModus.value = aktivieren;
  wendeInnenlebenAn();
}

// Liefert den sinnvollen Referenzpunkt für ein angeklicktes/überfahrenes
// Element: bei einer Kreiskante deren Mittelpunkt (z.B. Bohrungsmitte), bei
// einer geraden Kante das nähere Ende, bei einer runden Fläche der auf die
// Achse projizierte Punkt (z.B. Zylindermitte auf Höhe des Klicks), sonst
// einfach der Klickpunkt selbst.
function ermittleReferenzpunkt(treffer, hitPoint) {
  if (!treffer) return hitPoint.clone();
  const obj = treffer.objekt;
  if (treffer.art === 'kante') {
    if (obj.typ === 'kreis' && obj.mitte) {
      return new THREE.Vector3(obj.mitte.x, obj.mitte.y, obj.mitte.z);
    }
    if (obj.typ === 'linie' && obj.start && obj.ende) {
      const start = new THREE.Vector3(obj.start.x, obj.start.y, obj.start.z);
      const ende = new THREE.Vector3(obj.ende.x, obj.ende.y, obj.ende.z);
      return hitPoint.distanceTo(start) <= hitPoint.distanceTo(ende) ? start : ende;
    }
    return hitPoint.clone();
  }
  if ((obj.typ === 'zylinder' || obj.typ === 'torus' || obj.typ === 'kegel') && obj.achsenpunkt && obj.achse) {
    const achsenpunkt = new THREE.Vector3(obj.achsenpunkt.x, obj.achsenpunkt.y, obj.achsenpunkt.z);
    const achse = new THREE.Vector3(obj.achse.x, obj.achse.y, obj.achse.z).normalize();
    const t = hitPoint.clone().sub(achsenpunkt).dot(achse);
    return achsenpunkt.addScaledVector(achse, t);
  }
  return hitPoint.clone();
}

// Berechnet den "richtigen" Abstand zwischen zwei angeklickten Elementen —
// nicht einfach nur die zwei angeklickten Punkte, sondern (wie in Fusion 360)
// je nach Elementtyp die geometrisch sinnvolle Größe.
function berechneAbstand(treffer1, hit1, treffer2, hit2) {
  const o1 = treffer1?.objekt;
  const o2 = treffer2?.objekt;

  if (treffer1?.art === 'flaeche' && treffer2?.art === 'flaeche' && o1?.typ === 'ebene' && o2?.typ === 'ebene') {
    const n1 = new THREE.Vector3(o1.normale.x, o1.normale.y, o1.normale.z).normalize();
    const n2 = new THREE.Vector3(o2.normale.x, o2.normale.y, o2.normale.z).normalize();
    if (Math.abs(n1.dot(n2)) > 0.98) {
      // (Fast) parallele Ebenen: senkrechter Abstand zwischen den Ebenen —
      // nicht Punkt-zu-Punkt (das wäre je nach Klickposition ungenau/schräg).
      const p1 = new THREE.Vector3(o1.mittelpunkt.x, o1.mittelpunkt.y, o1.mittelpunkt.z);
      const p2 = new THREE.Vector3(o2.mittelpunkt.x, o2.mittelpunkt.y, o2.mittelpunkt.z);
      const distanz = Math.abs(p2.clone().sub(p1).dot(n1));
      // Maßlinie: vom zweiten Klickpunkt senkrecht auf die erste Ebene projiziert.
      const versatz = hit2.clone().sub(p1).dot(n1);
      const fuss = hit2.clone().sub(n1.clone().multiplyScalar(versatz));
      return { punkt1: fuss, punkt2: hit2.clone(), distanz };
    }
  }

  if (
    treffer1?.art === 'flaeche' && treffer2?.art === 'flaeche'
    && (o1?.typ === 'zylinder' || o1?.typ === 'torus') && (o2?.typ === 'zylinder' || o2?.typ === 'torus')
    && o1.achse && o2.achse && o1.achsenpunkt && o2.achsenpunkt
  ) {
    const a1 = new THREE.Vector3(o1.achse.x, o1.achse.y, o1.achse.z).normalize();
    const a2 = new THREE.Vector3(o2.achse.x, o2.achse.y, o2.achse.z).normalize();
    if (Math.abs(a1.dot(a2)) > 0.98) {
      // (Fast) achsparallel — typisch zwei Bohrungen/Wellen: Lochabstand =
      // kürzester (senkrechter) Abstand zwischen den beiden Achsgeraden.
      const p1 = new THREE.Vector3(o1.achsenpunkt.x, o1.achsenpunkt.y, o1.achsenpunkt.z);
      const p2 = new THREE.Vector3(o2.achsenpunkt.x, o2.achsenpunkt.y, o2.achsenpunkt.z);
      const d = p2.clone().sub(p1);
      const perp = d.clone().sub(a1.clone().multiplyScalar(d.dot(a1)));
      const distanz = perp.length();
      return { punkt1: p1, punkt2: p1.clone().add(perp), distanz };
    }
  }

  // Fallback (z.B. Kanten oder nicht-parallele Flächen): sinnvoller
  // Referenzpunkt je Element (Kreismitte, Kantenende, Achsenpunkt auf
  // Klickhöhe) — das deckt genau den Wunsch "auch einzelne Punkte/
  // Mittelpunkte messen können" ab.
  const p1 = ermittleReferenzpunkt(treffer1, hit1);
  const p2 = ermittleReferenzpunkt(treffer2, hit2);
  return { punkt1: p1, punkt2: p2, distanz: p1.distanceTo(p2) };
}

function punktMarkerRadius() {
  const box = currentMesh ? new THREE.Box3().setFromObject(currentMesh) : null;
  return box ? Math.max(box.getSize(new THREE.Vector3()).length() * 0.006, 0.15) : 0.2;
}

function buildPunktMarker(punkt, color) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(punktMarkerRadius(), 16, 16),
    new THREE.MeshBasicMaterial({ color, depthTest: false }),
  );
  mesh.position.copy(punkt);
  mesh.renderOrder = 999;
  return mesh;
}

function buildAbstandsGruppe(p1, p2) {
  const g = new THREE.Group();
  const farbe = 0x10b981;
  g.add(buildPunktMarker(p1, farbe));
  g.add(buildPunktMarker(p2, farbe));
  g.add(buildKantenLinie([p1, p2], farbe, 2.5));
  const mitte = p1.clone().add(p2).multiplyScalar(0.5);
  const abstand = p1.distanceTo(p2);
  g.add(makeLabel(`${Math.round(abstand * 100) / 100} mm`, mitte, '#059669'));
  return g;
}

// Manche STEP-Dateien (bekanntes Import-Artefakt, z.B. auch aus GibbsCAM
// vertraut: "doppelte Elemente löschen") enthalten eine runde Fläche (Bohrung/
// Zylinder) nicht als EINE durchgängige 360°-Fläche, sondern aufgeteilt auf
// mehrere B-Rep-Flächen mit exakt derselben Achse+Radius. Beim Markieren einer
// solchen Fläche wirkt das dann wie "nur zur Hälfte ausgewählt". Fix: alle
// Flächen mit (fast) identischer Achse+Radius als EIN zusammengehöriges
// Feature behandeln und ihre Dreiecke gemeinsam einfärben.
function istKoaxial(f, g) {
  if (f === g) return true;
  if (f.typ !== g.typ) return false;
  if (!f.achse || !g.achse || !f.achsenpunkt || !g.achsenpunkt) return false;
  const dot = f.achse.x * g.achse.x + f.achse.y * g.achse.y + f.achse.z * g.achse.z;
  if (Math.abs(dot) < 0.999) return false; // Achsen müssen (anti-)parallel sein
  if (f.typ === 'kegel') {
    // Kegel haben keinen festen Radius (variiert entlang der Achse) — daher
    // über Halbwinkel + (fast identische) Spitze statt Radius vergleichen.
    if (f.halbwinkelGrad == null || g.halbwinkelGrad == null) return false;
    if (Math.abs(f.halbwinkelGrad - g.halbwinkelGrad) > 0.5) return false;
    const dx0 = g.achsenpunkt.x - f.achsenpunkt.x;
    const dy0 = g.achsenpunkt.y - f.achsenpunkt.y;
    const dz0 = g.achsenpunkt.z - f.achsenpunkt.z;
    const dist = Math.sqrt(dx0 * dx0 + dy0 * dy0 + dz0 * dz0);
    return dist < Math.max(f.radius || 1, 1) * 0.05;
  }
  if (f.radius == null || g.radius == null) return false;
  if (Math.abs(f.radius - g.radius) > Math.max(f.radius, g.radius) * 0.01 + 0.01) return false;
  const dx = g.achsenpunkt.x - f.achsenpunkt.x;
  const dy = g.achsenpunkt.y - f.achsenpunkt.y;
  const dz = g.achsenpunkt.z - f.achsenpunkt.z;
  const projLen = dx * f.achse.x + dy * f.achse.y + dz * f.achse.z;
  const perpX = dx - projLen * f.achse.x;
  const perpY = dy - projLen * f.achse.y;
  const perpZ = dz - projLen * f.achse.z;
  const perpAbstand = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ);
  return perpAbstand < Math.max(f.radius * 0.02, 0.05); // liegt auf derselben Achsgeraden
}

function gesammelteDreiecke(f) {
  const alle = props.flaechen || [];
  const passende = alle.filter((g) => g.dreiecke && istKoaxial(f, g));
  if (passende.length <= 1) return f.dreiecke;
  let gesamt = 0;
  for (const g of passende) gesamt += g.dreiecke.length;
  const kombiniert = new Float32Array(gesamt);
  let offset = 0;
  for (const g of passende) { kombiniert.set(g.dreiecke, offset); offset += g.dreiecke.length; }
  return kombiniert;
}

// Baut ein Highlight passend zur exakten Flächengeometrie. Bevorzugt: die ECHTE
// tessellierte Fläche aus opencascade.js (f.dreiecke) als gefüllte, halbtransparente
// Fläche mit Kontur — zeigt die tatsächliche Flächengrenze, nicht nur Kanten/einen
// Ring. Fallback (falls Tessellierung für diese Fläche fehlschlug): Ring bei
// Zylindern (exakt auf der Mantelfläche), Kreis + Normalen-Pfeil bei Ebenen, sonst Punkt.
function buildFlaechenMarker(f, hitPoint, color) {
  const g = new THREE.Group();
  if (!f) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 12), new THREE.MeshBasicMaterial({ color }));
    dot.position.copy(hitPoint);
    g.add(dot);
    return g;
  }
  if (f.dreiecke && f.dreiecke.length >= 9) {
    const positions = gesammelteDreiecke(f);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    // Das Anzeige-Netz wird jetzt aus DENSELBEN Flächen-Daten gebaut (siehe
    // buildMeshVonFlaechen) — diese Markierung liegt also EXAKT deckungsgleich
    // auf der echten Oberfläche, kein unabhängiges zweites Netz mehr. Ein
    // normaler kleiner polygonOffset reicht dafür völlig aus (Standardtechnik
    // für exakt koplanare Flächen) — kein Normalen-Versatz/depthTest-Trick
    // nötig, der zuletzt zu "schwebenden" Markierungen geführt hat.
    const flaeche = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }));
    g.add(flaeche);
    // KEINE EdgesGeometry-Kontur hier: bei stark gekrümmten Flächen (z.B. kleine
    // Verrundungen) hat praktisch jede innere Dreieckskante schon von Natur aus
    // einen großen Winkel zur nächsten — das erzeugte ein hässliches Zacken-
    // /Sägezahn-Muster statt einer sauberen Umrandung. Die halbtransparente
    // Fläche allein zeigt die Auswahl klar genug.
    return g;
  }
  if (f.typ === 'zylinder' && f.achsenpunkt && f.achse) {
    const achsenpunkt = new THREE.Vector3(f.achsenpunkt.x, f.achsenpunkt.y, f.achsenpunkt.z);
    const achse = new THREE.Vector3(f.achse.x, f.achse.y, f.achse.z).normalize();
    const p = hitPoint.clone().sub(achsenpunkt);
    const t = p.dot(achse);
    const ringMitte = achsenpunkt.clone().add(achse.clone().multiplyScalar(t));
    const helper = Math.abs(achse.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(achse, helper).normalize();
    const v = new THREE.Vector3().crossVectors(achse, u).normalize();
    const segs = 64;
    const pts = [];
    for (let i = 0; i <= segs; i += 1) {
      const t2 = (i / segs) * Math.PI * 2;
      pts.push(ringMitte.clone()
        .add(u.clone().multiplyScalar(Math.cos(t2) * f.radius))
        .add(v.clone().multiplyScalar(Math.sin(t2) * f.radius)));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    g.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color })));
  } else if (f.typ === 'ebene' && f.normale) {
    const center = new THREE.Vector3(f.mittelpunkt.x, f.mittelpunkt.y, f.mittelpunkt.z);
    const normal = new THREE.Vector3(f.normale.x, f.normale.y, f.normale.z).normalize();
    const helper = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(normal, helper).normalize();
    const v = new THREE.Vector3().crossVectors(normal, u).normalize();
    // Echte Flächengrenzen sind aus dem B-Rep hier nicht ausgelesen — feste,
    // an der Bauteilgröße orientierte Anzeige-Größe als visuelle Bestätigung.
    const box = currentMesh ? new THREE.Box3().setFromObject(currentMesh) : null;
    const r = box ? Math.max(box.getSize(new THREE.Vector3()).length() * 0.03, 2) : 5;
    const segs = 32;
    const pts = [];
    for (let i = 0; i <= segs; i += 1) {
      const t2 = (i / segs) * Math.PI * 2;
      pts.push(center.clone().add(u.clone().multiplyScalar(Math.cos(t2) * r)).add(v.clone().multiplyScalar(Math.sin(t2) * r)));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    g.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color })));
    g.add(new THREE.ArrowHelper(normal, center, r * 0.8, color, r * 0.35, r * 0.25));
  } else {
    const center = new THREE.Vector3(f.mittelpunkt.x, f.mittelpunkt.y, f.mittelpunkt.z);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 12), new THREE.MeshBasicMaterial({ color }));
    dot.position.copy(center);
    g.add(dot);
  }
  return g;
}

// Baut eine echte, gleichmäßig dicke Bildschirmraum-Linie (Line2 — im
// Gegensatz zu THREE.Line/LineBasicMaterial, deren "linewidth" WebGL schlicht
// ignoriert und die immer nur 1px dünn zeichnet). Genau das Standardverhalten
// jedes CAD-Viewers (Fusion 360, OCCT DMU-Viewer): eine Kante wird als etwas
// dickere, farbige Linie markiert — keine 3D-Röhre/Geometrie um die Kante herum.
function buildKantenLinie(pts, color, dickePx) {
  const positions = [];
  for (const p of pts) positions.push(p.x, p.y, p.z);
  const geo = new LineGeometry();
  geo.setPositions(positions);
  const groesse = renderer ? renderer.getSize(new THREE.Vector2()) : new THREE.Vector2(800, 600);
  const mat = new LineMaterial({
    color,
    linewidth: dickePx, // Pixel (worldUnits: false, Standard)
    resolution: groesse,
    depthTest: false,
    transparent: true,
  });
  const linie = new Line2(geo, mat);
  linie.computeLineDistances();
  linie.renderOrder = 999;
  return linie;
}

// Manche Kreiskanten (z.B. der Bohrungsrand bei genau dem STEP-Import-Artefakt,
// das auch koaxiale Flächen betrifft) sind selbst nur als Halbkreis-Segment
// vorhanden. Gibt es eine ANDERE Kreiskante mit (fast) identischer Mitte/
// Achse/Radius, gehören beide zum selben echten Rand — dann den vollen
// analytischen Kreis zeichnen statt nur das eigene (unvollständige) Segment.
// Winkel eines 3D-Punkts um (mitte, achse) im Bogenmaß, normalisiert auf
// [0, 2π) — WICHTIG: nie mit rohem atan2()-min/max weiterrechnen, dessen
// Sprungstelle bei ±180° liegt. Ein Bogen, der zufällig genau über diese
// Grenze läuft (je nach Bauteil-Ausrichtung unvorhersehbar), würde mit
// min/max fälschlich als riesige Spanne erscheinen — genau das war die
// Ursache dafür, dass einzelne, nicht geteilte Bögen "teilweise" (je nach
// Ausrichtung) fälschlich zu Vollkreisen ergänzt wurden.
function kantenWinkel(k) {
  const achse = new THREE.Vector3(k.achse.x, k.achse.y, k.achse.z).normalize();
  const mitte = new THREE.Vector3(k.mitte.x, k.mitte.y, k.mitte.z);
  const helper = Math.abs(achse.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(achse, helper).normalize();
  const v = new THREE.Vector3().crossVectors(achse, u).normalize();
  const winkel = [];
  for (let i = 0; i < k.punkte.length; i += 3) {
    const rel = new THREE.Vector3(k.punkte[i] - mitte.x, k.punkte[i + 1] - mitte.y, k.punkte[i + 2] - mitte.z);
    let w = Math.atan2(rel.dot(v), rel.dot(u));
    if (w < 0) w += 2 * Math.PI;
    winkel.push(w);
  }
  return winkel;
}

// Abdeckung (in Bogenmaß) einer Menge von Winkeln auf dem Kreis: die größte
// Lücke zwischen benachbarten (zyklisch sortierten) Winkeln finden — die
// Abdeckung ist alles ANDERE als diese Lücke. Funktioniert unabhängig davon,
// wo die Bögen relativ zur ±180°-Grenze liegen (siehe kantenWinkel oben).
function winkelAbdeckung(winkelListe) {
  if (winkelListe.length === 0) return 0;
  const sortiert = [...winkelListe].sort((a, b) => a - b);
  let groessteLuecke = 0;
  for (let i = 0; i < sortiert.length; i += 1) {
    const naechstes = i + 1 < sortiert.length ? sortiert[i + 1] : sortiert[0] + 2 * Math.PI;
    const luecke = naechstes - sortiert[i];
    if (luecke > groessteLuecke) groessteLuecke = luecke;
  }
  return 2 * Math.PI - groessteLuecke;
}

function ergaenzeKreisKante(k) {
  if (k.typ !== 'kreis' || !k.punkte || k.punkte.length < 6) return k;
  const alle = props.kanten || [];
  // Toleranzen zusätzlich mit einem ABSOLUTEN Deckel versehen (nicht nur
  // relativ zum Radius) — bei größeren Radien konnte die rein relative
  // Toleranz sonst mehrere ZEHNTELMILLIMETER betragen und dadurch
  // fälschlich verschiedene, real getrennte Rand-Kreise zusammenlegen (z.B.
  // bei mehreren gleich großen Nuten/Verrundungen mit geringem Abstand
  // zueinander auf demselben Schaft) — die betroffenen Ränder verschwanden
  // dadurch (istVollkreis=true, punkte=null, aber geometrisch falsch groß/
  // an falscher Stelle zusammengefasst).
  const radiusTol = Math.min(Math.max(k.radius, 1) * 0.015, 0.03);
  const mitteTol = Math.min(Math.max(k.radius, 1) * 0.03, 0.05);
  const passende = alle.filter((andere) => {
    if (andere.typ !== 'kreis' || !andere.punkte || andere.punkte.length < 6) return false;
    if (Math.abs(andere.radius - k.radius) > radiusTol) return false;
    const dx = andere.mitte.x - k.mitte.x;
    const dy = andere.mitte.y - k.mitte.y;
    const dz = andere.mitte.z - k.mitte.z;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) > mitteTol) return false;
    const dot = andere.achse.x * k.achse.x + andere.achse.y * k.achse.y + andere.achse.z * k.achse.z;
    return Math.abs(dot) > 0.998;
  });
  if (passende.length <= 1) return k;
  // Alle abgetasteten Punkte ALLER passenden Fragmente in EINE Winkelliste
  // sammeln und deren gemeinsame Abdeckung bestimmen (ein echter Rand kann
  // auf 3+ Flächen aufgeteilt sein, z.B. Bohrung + Fase). Das ist robust
  // gegenüber der ±180°-Grenze UND zählt Überlappungen nicht doppelt.
  let alleWinkel = [];
  for (const f of passende) alleWinkel = alleWinkel.concat(kantenWinkel(f));
  const abdeckung = winkelAbdeckung(alleWinkel);
  if (abdeckung < (5 * Math.PI) / 3) return k; // < 300° abgedeckt → eher ein echter Teil-Bogen, kein Vollkreis
  return { ...k, istVollkreis: true, punkte: null };
}

// Baut ein Highlight für eine exakte Kante (Linie/Kreis/Freiform-Polyline).
function buildKantenMarker(kRoh, color, dickePx = 3.5) {
  const k = ergaenzeKreisKante(kRoh);
  const g = new THREE.Group();
  let pts = [];
  let geschlossen = false;
  if (k.typ === 'linie') {
    pts = [
      new THREE.Vector3(k.start.x, k.start.y, k.start.z),
      new THREE.Vector3(k.ende.x, k.ende.y, k.ende.z),
    ];
  } else if (k.punkte && k.punkte.length >= 6) {
    // Bevorzugt: echte abgetastete Kurve (auch bei Kreis-Kanten!) — eine
    // Kreiskante ist oft nur ein Halbkreis o.ä., nicht immer ein Vollkreis.
    // Center+Radius+Achse allein verraten den tatsächlichen Bogen-Abschnitt
    // nicht, würden also fälschlich einen vollen Kreis zeichnen.
    for (let i = 0; i < k.punkte.length; i += 3) {
      pts.push(new THREE.Vector3(k.punkte[i], k.punkte[i + 1], k.punkte[i + 2]));
    }
    geschlossen = k.typ === 'kreis' && !!k.istVollkreis;
  } else if (k.typ === 'kreis') {
    // Fallback (sollte durch obiges k.punkte eigentlich nie greifen).
    const mitte = new THREE.Vector3(k.mitte.x, k.mitte.y, k.mitte.z);
    const achse = new THREE.Vector3(k.achse.x, k.achse.y, k.achse.z).normalize();
    const helper = Math.abs(achse.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(achse, helper).normalize();
    const v = new THREE.Vector3().crossVectors(achse, u).normalize();
    const segs = 64;
    for (let i = 0; i < segs; i += 1) {
      const t = (i / segs) * Math.PI * 2;
      pts.push(mitte.clone()
        .add(u.clone().multiplyScalar(Math.cos(t) * k.radius))
        .add(v.clone().multiplyScalar(Math.sin(t) * k.radius)));
    }
    geschlossen = true;
  }
  if (pts.length < 2) return g;
  if (geschlossen) pts = [...pts, pts[0]]; // Schleife für Line2 schließen
  g.add(buildKantenLinie(pts, color, dickePx));
  return g;
}

function formatiereKante(kRoh) {
  if (!kRoh) return 'Keine Kante erkannt.';
  const k = ergaenzeKreisKante(kRoh);
  const r2 = (v) => Math.round(v * 100) / 100;
  if (k.typ === 'linie') return `${r2(k.laenge)} mm`;
  // Kurze, reine Maßangabe (wie auf einer Fertigungszeichnung): ein voller
  // Kreis (z.B. eine Bohrung) wird üblicherweise über den Durchmesser
  // bemaßt, ein Bogen/Radius (z.B. eine Verrundung) über den Radius.
  if (k.typ === 'kreis') return k.istVollkreis ? `⌀ ${r2(k.radius * 2)} mm` : `R ${r2(k.radius)} mm`;
  return 'Freiform-Kante';
}

// Ermittelt, ob ein 3D-Punkt eher zu einer Kante oder einer Fläche gehört —
// Kanten bekommen einen kleinen "Fang"-Bonus (wie in Fusion 360: dünne Kanten
// schnappen beim Vorbeifahren bevorzugt ein statt der dahinterliegenden Fläche),
// sonst wäre eine 1D-Kante gegenüber einer flächigen 2D-Fläche kaum je die
// numerisch nächste, obwohl der Nutzer optisch klar auf sie gezielt hat.
function naechstesElement(punkt) {
  const flaeche = props.flaechen?.length ? naechsteFlaeche(props.flaechen, punkt) : null;
  const flaechenAbstand = flaeche ? abstandZurFlaeche(flaeche, punkt) : Infinity;
  const kante = props.kanten?.length ? naechsteKante(props.kanten, punkt) : null;
  const kantenAbstand = kante ? abstandZurKante(kante, punkt) : Infinity;
  // Eine feste Welt-Distanz als Toleranz (frühere Versuche: 0,25mm → 0,07mm →
  // 0,015mm) ist grundsätzlich falsch kalibriert: beim Reinzoomen wird sie
  // riesig relativ zum Sichtfeld (Kanten "kleben"), beim Rauszoomen winzig
  // (kein Einrasten mehr möglich). Wie in echten CAD-Viewern jetzt ein fester
  // BILDSCHIRM-Pixel-Radius (~8px) — dafür beide Abstände in Pixel umrechnen.
  function weltProPixelBei(p) {
    if (!camera || !renderer) return 0.02;
    const dist = camera.position.distanceTo(new THREE.Vector3(p.x, p.y, p.z));
    const fovRad = (camera.fov * Math.PI) / 180;
    const screenHoehe = renderer.getSize(new THREE.Vector2()).y || 400;
    return (2 * dist * Math.tan(fovRad / 2)) / screenHoehe;
  }
  const weltProPixel = weltProPixelBei(punkt);
  const toleranz = weltProPixel * 3; // ~3px Fang-Radius, wie in CAD-Viewern üblich
  if (kante && kantenAbstand <= flaechenAbstand + toleranz) {
    return { art: 'kante', objekt: kante };
  }
  if (flaeche) return { art: 'flaeche', objekt: flaeche };
  return null;
}

// Reine Hover-Vorschau: nur ein leicht AUFGEHELLTER Ton der aktuellen
// Modellfarbe (kein knalliges Blau) — dezentes Feedback, das nicht wie eine
// echte Auswahl aussieht. Die kräftige Akzentfarbe bleibt dem Klick (echte
// Auswahl) vorbehalten.
function hoverFarbeHex() {
  const c = new THREE.Color(modelColorHex.value);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  // Nur leicht aufhellen (vorher +0.3 → landete bei hellen Modellfarben
  // praktisch bei Weiß, besonders auf dünnen Kanten-Linien gut sichtbar/störend).
  c.setHSL(hsl.h, hsl.s, Math.min(0.72, hsl.l + 0.14));
  return c.getHex();
}

// Beim Überfahren (Hover) das nächste exakte Element (Kante ODER Fläche) live
// anzeigen — Fusion-360-Style visuelles Feedback, BEVOR geklickt wird. Leicht gedrosselt (~30ms).
function handleHover(event) {
  if (!currentMesh || !camera || !renderer || (!props.flaechen?.length && !props.kanten?.length)) return;
  const jetzt = performance.now();
  if (jetzt - letzteHoverZeit < 30) return;
  letzteHoverZeit = jetzt;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = sichtbareTreffer(raycaster.intersectObject(currentMesh, true)).find((h) => h.object.isMesh && h.face);
  disposeGroup(hoverGroup);
  hoverGroup = null;
  if (hit) {
    const treffer = naechstesElement({ x: hit.point.x, y: hit.point.y, z: hit.point.z });
    const farbe = abstandModus.value ? 0x34d399 : hoverFarbeHex();
    // Im Abstands-Modus GENAUSO die ganze Fläche/Kante hervorheben wie beim
    // normalen Messen (wie in Fusion 360 — man sieht das komplette gewählte
    // Element, nicht nur einen Punkt), zusätzlich aber den exakten
    // Referenzpunkt markieren, der für die Distanzberechnung verwendet wird.
    if (treffer?.art === 'kante') {
      hoverGroup = buildKantenMarker(treffer.objekt, farbe);
    } else if (treffer?.art === 'flaeche') {
      hoverGroup = buildFlaechenMarker(treffer.objekt, hit.point, farbe);
    }
    if (hoverGroup) { wendeSchnittAufGruppeAn(hoverGroup); scene.add(hoverGroup); }
    if (abstandModus.value) {
      disposeGroup(abstandVorschauGruppe);
      const punkt = ermittleReferenzpunkt(treffer, hit.point);
      abstandVorschauGruppe = new THREE.Group();
      abstandVorschauGruppe.add(buildPunktMarker(punkt, farbe));
      wendeSchnittAufGruppeAn(abstandVorschauGruppe);
      scene.add(abstandVorschauGruppe);
      renderer.domElement.style.cursor = 'crosshair';
    } else {
      renderer.domElement.style.cursor = pickFaceMode.value ? 'crosshair' : 'pointer';
    }
  } else {
    renderer.domElement.style.cursor = '';
    if (abstandModus.value) { disposeGroup(abstandVorschauGruppe); abstandVorschauGruppe = null; }
  }
}

// Prüft, ob eine Zylinderfläche (nach Zusammenführung koaxialer Teilflächen,
// siehe gesammelteDreiecke) tatsächlich ringsum geschlossen ist (>300°
// Winkelabdeckung) — nur DANN ist "Durchmesser" die sinnvolle Bemaßung. Eine
// nur teilweise umlaufende Zylinderfläche (z.B. eine große Rundung an einem
// Frästeil) ist geometrisch zwar ein Zylinder-Ausschnitt, sollte aber wie eine
// Verrundung über den Radius bemaßt werden, nicht über einen "Durchmesser",
// den es an der Stelle so gar nicht gibt.
function istVollstaendigerZylinder(f) {
  if (f.typ !== 'zylinder' || !f.achse || !f.achsenpunkt) return true;
  const achse = new THREE.Vector3(f.achse.x, f.achse.y, f.achse.z).normalize();
  const achsenpunkt = new THREE.Vector3(f.achsenpunkt.x, f.achsenpunkt.y, f.achsenpunkt.z);
  const helper = Math.abs(achse.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(achse, helper).normalize();
  const v = new THREE.Vector3().crossVectors(achse, u).normalize();
  const quellen = gesammelteDreiecke(f);
  if (!quellen || quellen.length < 9) return true;
  const winkel = [];
  for (let i = 0; i < quellen.length; i += 3) {
    const rel = new THREE.Vector3(quellen[i] - achsenpunkt.x, quellen[i + 1] - achsenpunkt.y, quellen[i + 2] - achsenpunkt.z);
    let w = Math.atan2(rel.dot(v), rel.dot(u));
    if (w < 0) w += 2 * Math.PI;
    winkel.push(w);
  }
  return winkelAbdeckung(winkel) > (5 * Math.PI) / 3; // > 300°
}

function formatiereFlaeche(f) {
  if (!f) return 'Keine Fläche erkannt.';
  const r2 = (v) => Math.round(v * 100) / 100;
  // Kurze, reine Maßangabe: ein voller Zylinder (Bohrung/Welle) wird über den
  // Durchmesser bemaßt, eine Verrundung/ein Kegel oder ein nur teilweise
  // umlaufender Zylinder-Ausschnitt über den Radius bzw. Winkel.
  if (f.typ === 'zylinder') {
    return istVollstaendigerZylinder(f) ? `⌀ ${r2(f.durchmesser)} mm` : `R ${r2(f.radius)} mm`;
  }
  if (f.typ === 'ebene') return `Ebene, Normale (${r2(f.normale.x)}, ${r2(f.normale.y)}, ${r2(f.normale.z)})`;
  // Fasen/Senkungen werden in der Fertigung über den vollen Öffnungswinkel
  // benannt (z.B. "90°-Fase" = 45° Neigung je Seite) — deshalb 2× Halbwinkel.
  if (f.typ === 'kegel') return f.halbwinkelGrad != null ? `Fase ${r2(f.halbwinkelGrad * 2)}°` : 'Kegelfläche';
  if (f.typ === 'torus') return `R ${r2(f.radius)} mm`;
  if (f.typ === 'kugel') return 'Kugelfläche';
  return 'Freiform-Fläche';
}

// Mittelpunkt der angeklickten (ebenen) Fläche schätzen: alle Mesh-Punkte nahe der
// getroffenen Ebene einsammeln und mitteln (z. B. Mitte einer runden Flanschfläche).
function estimateFaceCenter(object, hitPoint, normal, box) {
  const diag = box.getSize(new THREE.Vector3()).length();
  const tol = Math.max(diag * 0.01, 0.05); // Toleranz senkrecht zur Ebene
  const v = new THREE.Vector3();
  let sx = 0, sy = 0, sz = 0, n = 0;
  object.traverse((child) => {
    const pos = child.isMesh && child.geometry?.attributes?.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i += 1) {
      v.fromBufferAttribute(pos, i);
      child.localToWorld(v);
      const d = v.clone().sub(hitPoint).dot(normal);
      if (Math.abs(d) <= tol) { sx += v.x; sy += v.y; sz += v.z; n += 1; }
    }
  });
  if (!n) return hitPoint.clone();
  return new THREE.Vector3(sx / n, sy / n, sz / n);
}

function handlePick(event) {
  if (!currentMesh || !camera || !renderer) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = sichtbareTreffer(raycaster.intersectObject(currentMesh, true)).find((h) => h.object.isMesh && h.face);

  if (!hit || !hit.face) {
    // Klick neben das Bauteil (leerer Bereich im Viewer) → Auswahl aufheben,
    // wie in Fusion 360. Im Referenzflächen-Modus passiert bewusst nichts —
    // der Modus bleibt aktiv, bis eine Fläche getroffen oder er abgebrochen
    // wird. Im Abstands-Modus dagegen löst ein Klick daneben einen bereits
    // gesetzten ERSTEN Punkt wieder, damit man neu mit zwei frischen Punkten
    // messen kann, statt an einem versehentlichen ersten Klick festzuhängen.
    if (!pickFaceMode.value && !abstandModus.value) clearMesswert();
    if (abstandModus.value && abstandTreffer1) {
      abstandTreffer1 = null;
      abstandHit1 = null;
      abstandPunkt1.value = null;
      disposeGroup(abstandGruppe);
      abstandGruppe = null;
    }
    return;
  }

  if (abstandModus.value) {
    const treffer = naechstesElement({ x: hit.point.x, y: hit.point.y, z: hit.point.z });
    disposeGroup(abstandVorschauGruppe);
    abstandVorschauGruppe = null;
    if (!abstandTreffer1) {
      abstandTreffer1 = treffer;
      abstandHit1 = hit.point.clone();
      const punkt = ermittleReferenzpunkt(treffer, hit.point);
      abstandPunkt1.value = { x: punkt.x, y: punkt.y, z: punkt.z };
      disposeGroup(abstandGruppe);
      abstandGruppe = new THREE.Group();
      abstandGruppe.add(buildPunktMarker(punkt, 0x10b981));
      wendeSchnittAufGruppeAn(abstandGruppe);
      scene.add(abstandGruppe);
      abstandText.value = '';
    } else {
      const { punkt1, punkt2, distanz } = berechneAbstand(abstandTreffer1, abstandHit1, treffer, hit.point);
      disposeGroup(abstandGruppe);
      abstandGruppe = buildAbstandsGruppe(punkt1, punkt2);
      wendeSchnittAufGruppeAn(abstandGruppe);
      scene.add(abstandGruppe);
      abstandText.value = `${Math.round(distanz * 100) / 100} mm`;
      abstandTreffer1 = null;
      abstandHit1 = null;
      abstandPunkt1.value = null;
    }
    return;
  }

  if (!pickFaceMode.value) {
    // Standardverhalten (wie Fusion 360): Klick auf eine Kante ODER Fläche
    // misst sofort, kein eigener "Messen"-Modus nötig. Referenzflächen-Wahl
    // bleibt der einzige explizite Modus, weil sie die Bauteil-Ausrichtung
    // ändert statt nur anzuzeigen (und dafür nur Flächen sinnvoll sind).
    const treffer = naechstesElement({ x: hit.point.x, y: hit.point.y, z: hit.point.z });
    disposeGroup(pickGroup);
    pickGroup = null;
    if (treffer?.art === 'kante') {
      messwert.value = formatiereKante(treffer.objekt);
      pickGroup = buildKantenMarker(treffer.objekt, 0xa855f7, 4.5);
    } else if (treffer?.art === 'flaeche') {
      messwert.value = formatiereFlaeche(treffer.objekt);
      pickGroup = buildFlaechenMarker(treffer.objekt, hit.point, 0xa855f7);
    } else {
      messwert.value = '';
    }
    if (pickGroup) { wendeSchnittAufGruppeAn(pickGroup); scene.add(pickGroup); }
    return;
  }

  // Referenzflächen-Modus: exakte Fläche zum Klickpunkt suchen — liefert die ECHTE
  // Ebenen-Normale ODER (neu) bei Zylinderflächen direkt deren Rotationsachse (statt
  // nur bei Planflächen möglich). Für Drehteile oft der natürlichere Klick: direkt auf
  // eine zylindrische Mantelfläche statt erst eine Stirnfläche suchen zu müssen.
  const exakteFlaeche = props.flaechen?.length
    ? naechsteFlaeche(props.flaechen, { x: hit.point.x, y: hit.point.y, z: hit.point.z })
    : null;
  let n;
  if (exakteFlaeche?.typ === 'ebene') {
    n = new THREE.Vector3(exakteFlaeche.normale.x, exakteFlaeche.normale.y, exakteFlaeche.normale.z);
  } else if (exakteFlaeche?.typ === 'zylinder') {
    n = new THREE.Vector3(exakteFlaeche.achse.x, exakteFlaeche.achse.y, exakteFlaeche.achse.z);
  } else {
    n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
  }
  const ax = Math.abs(n.x);
  const ay = Math.abs(n.y);
  const az = Math.abs(n.z);
  const axis = ax >= ay && ax >= az ? 'x' : ay >= az ? 'y' : 'z';
  roundAxis.value = axis;

  const box = new THREE.Box3().setFromObject(currentMesh);
  let faceCenter;
  if (exakteFlaeche?.typ === 'zylinder' && exakteFlaeche.achsenpunkt) {
    // Echter Punkt AUF der Achse (nicht der Flächen-Mittelpunkt) — exakt für die Rotationsmitte.
    faceCenter = new THREE.Vector3(exakteFlaeche.achsenpunkt.x, exakteFlaeche.achsenpunkt.y, exakteFlaeche.achsenpunkt.z);
  } else if (exakteFlaeche) {
    faceCenter = new THREE.Vector3(exakteFlaeche.mittelpunkt.x, exakteFlaeche.mittelpunkt.y, exakteFlaeche.mittelpunkt.z);
  } else {
    faceCenter = estimateFaceCenter(currentMesh, hit.point, n, box);
  }
  // Rotationsachse durch die Flächenmitte: senkrecht zur Achse von der Flächenmitte
  // übernehmen, entlang der Achse selbst die Bauteilmitte (Zylinder bleibt symmetrisch).
  const boxCenter = box.getCenter(new THREE.Vector3());
  const c = faceCenter.clone();
  c[axis] = boxCenter[axis];
  roundCenter = c;

  emitDimensions();
  if (!showRund.value) showRund.value = true;
  buildRund();

  pickFaceMode.value = false;
  renderer.domElement.style.cursor = '';
}

// Kanten sichtbar machen (CAD-Look): dunkle Linien an den Bauteilkanten
function addEdges(object) {
  if (!object?.traverse) return;
  object.traverse((child) => {
    if (child.isMesh && child.geometry && !child.userData.__hasEdges) {
      try {
        const eg = new THREE.EdgesGeometry(child.geometry, 8);
        const line = new THREE.LineSegments(
          eg,
          new THREE.LineBasicMaterial({ color: 0x3a4048 }),
        );
        line.userData.__isEdge = true;
        child.add(line);
        child.userData.__hasEdges = true;
      } catch (e) {
        /* ignore */
      }
    }
  });
}

let exakteKantenGroup = null;

// Exakte CAD-Kanten (aus opencascade.js, siehe props.kanten) als graue Linien
// zeichnen — ersetzt/ergänzt addEdges() oben, das auf dem GROBEN Anzeige-Netz
// von occt-import-js basiert und dadurch manche echten Kanten verpasst (unklare
// Dreiecks-Normalen-Winkel bei grober Triangulierung). Diese Linien sind exakt
// aus der B-Rep-Geometrie abgeleitet (Linie/Kreis analytisch, kein Netz-Rätselraten).
// Feste Pixel-Breite statt THREE.LineBasicMaterial (dessen "linewidth" wird
// von den meisten Browsern/GPU-Treibern schlicht ignoriert — immer genau 1
// Bildschirm-Pixel, unabhängig vom gesetzten Wert). Bei sehr kleinen
// Radienübergängen (z.B. 0,2mm Verrundungen) war diese 1px-Linie praktisch
// unsichtbar/verschwand im Kantenglätten — mit garantierter Pixel-Breite
// (wie schon bei den anderen Kanten-Overlays im Viewer, siehe buildKantenLinie)
// bleibt sie auch bei kleinsten Rundungen klar erkennbar.
function buildExaktesKantenLinie(pts, color) {
  const positions = [];
  for (const p of pts) positions.push(p.x, p.y, p.z);
  const geo = new LineGeometry();
  geo.setPositions(positions);
  const groesse = renderer ? renderer.getSize(new THREE.Vector2()) : new THREE.Vector2(800, 600);
  // KEIN polygonOffset hier (ein Versuch damit hat auf manchen Bauteilen die
  // komplette Linie unsichtbar gemacht statt nur das Z-Fighting/Gestrichelt-
  // Aussehen zu beheben — für Line2 offenbar nicht zuverlässig genug, um das
  // Risiko einzugehen). depthTest bleibt AN (Standard), damit Kanten auf der
  // abgewandten Bauteilseite weiterhin korrekt verdeckt werden.
  const mat = new LineMaterial({ color, linewidth: 1.6, resolution: groesse });
  const linie = new Line2(geo, mat);
  linie.computeLineDistances();
  return linie;
}

function buildExakteKantenOverlay() {
  disposeGroup(exakteKantenGroup);
  exakteKantenGroup = null;
  if (!scene || !props.kanten?.length) return;
  const g = new THREE.Group();
  const farbe = 0x3a4048;
  for (const kRoh of props.kanten) {
    const k = ergaenzeKreisKante(kRoh);
    let pts = [];
    if (k.typ === 'linie') {
      pts = [
        new THREE.Vector3(k.start.x, k.start.y, k.start.z),
        new THREE.Vector3(k.ende.x, k.ende.y, k.ende.z),
      ];
    } else if (k.punkte && k.punkte.length >= 6) {
      // Echte abgetastete Kurve (auch bei Kreis-Kanten) — respektiert den
      // tatsächlichen Bogen-Abschnitt statt fälschlich einen Vollkreis zu zeichnen.
      for (let i = 0; i < k.punkte.length; i += 3) {
        pts.push(new THREE.Vector3(k.punkte[i], k.punkte[i + 1], k.punkte[i + 2]));
      }
    } else if (k.typ === 'kreis') {
      const mitte = new THREE.Vector3(k.mitte.x, k.mitte.y, k.mitte.z);
      const achse = new THREE.Vector3(k.achse.x, k.achse.y, k.achse.z).normalize();
      const helper = Math.abs(achse.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const u = new THREE.Vector3().crossVectors(achse, helper).normalize();
      const v = new THREE.Vector3().crossVectors(achse, u).normalize();
      const segs = 48;
      for (let i = 0; i <= segs; i += 1) {
        const t = (i / segs) * Math.PI * 2;
        pts.push(mitte.clone()
          .add(u.clone().multiplyScalar(Math.cos(t) * k.radius))
          .add(v.clone().multiplyScalar(Math.sin(t) * k.radius)));
      }
    }
    if (pts.length < 2) continue;
    g.add(buildExaktesKantenLinie(pts, farbe));
  }
  scene.add(g);
  exakteKantenGroup = g;
}

// Screenshot des Modells, auf den Inhalt zugeschnitten (Teil füllt das Bild).
// manuell=true nur beim expliziten "📷 Ansicht"-Klick — die automatischen
// Aufrufe nach dem Laden (unten) markieren sich als NICHT manuell, damit
// PartCard.vue eine bereits vom Nutzer gewählte Vorschau nicht überschreibt.
function captureThumbnail(manuell = false) {
  if (!renderer || !scene || !camera) return;
  try {
    // Maßkästen NUR fürs Bild ausblenden (Live-Viewer behält sie); Labels sind CSS2D → eh nicht im Bild
    const qVis = quaderGroup ? quaderGroup.visible : null;
    const rVis = rundGroup ? rundGroup.visible : null;
    if (quaderGroup) quaderGroup.visible = false;
    if (rundGroup) rundGroup.visible = false;
    const prevBg = scene.background;
    scene.background = new THREE.Color('#ffffff');
    renderer.render(scene, camera);
    const src = renderer.domElement;
    const w = src.width;
    const h = src.height;
    const full = document.createElement('canvas');
    full.width = w;
    full.height = h;
    const fctx = full.getContext('2d');
    fctx.drawImage(src, 0, 0);
    scene.background = prevBg;
    if (quaderGroup && qVis !== null) quaderGroup.visible = qVis;
    if (rundGroup && rVis !== null) rundGroup.visible = rVis;
    renderer.render(scene, camera);

    // Weiße Ränder trimmen, damit das Teil groß im Bild liegt
    const data = fctx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    let dataUrl;
    if (!found) {
      dataUrl = full.toDataURL('image/png');
    } else {
      const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.06) + 4;
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(w - 1, maxX + pad);
      maxY = Math.min(h - 1, maxY + pad);
      const cw = maxX - minX + 1;
      const ch = maxY - minY + 1;
      const out = document.createElement('canvas');
      out.width = cw;
      out.height = ch;
      out.getContext('2d').drawImage(full, minX, minY, cw, ch, 0, 0, cw, ch);
      dataUrl = out.toDataURL('image/png');
    }
    if (dataUrl && dataUrl.length > 1000) emits('thumbnail', dataUrl, manuell);
  } catch (e) {
    /* ignore */
  }
}

const fileName = ref('');
const containerRef = ref(null);
const loadingStep = ref(false);
const stepError = ref('');
const modelColorHex = ref('#b0b8c4');

let renderer;
let scene;
let camera;
let controls;
let currentMesh = null;
let animFrameId = null;
let resizeObs = null;

function initScene() {
  const container = containerRef.value;
  if (!container) return;

  const width = container.clientWidth || 200;
  const height = Math.max(container.clientHeight || 160, 140);

  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.localClippingEnabled = true; // für die Schnittebenen-Kappung (siehe aktualisiereSchnittebene/baueSchnittKappen)
  container.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('click', handlePick);
  renderer.domElement.addEventListener('mousemove', handleHover);
  renderer.domElement.addEventListener('mouseleave', () => {
    disposeGroup(hoverGroup);
    hoverGroup = null;
    disposeGroup(abstandVorschauGruppe);
    abstandVorschauGruppe = null;
    renderer.domElement.style.cursor = '';
  });

  // Label-Renderer (CSS2D) als Overlay für die Maß-Beschriftungen
  container.style.position = 'relative';
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  scene = new THREE.Scene();
  // Heller Studio-Look (wie INFAB/Uptool): weißer Hintergrund, hellgraues Modell
  scene.background = new THREE.Color('#ffffff');

  camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
  camera.position.set(4, 4, 6);

  // OrbitControls statt TrackballControls: nach mehreren gescheiterten Versuchen,
  // ein eigenes "Zoom zum Mauszeiger" gegen TrackballControls' Eigenheiten robust
  // zu bauen (führte wiederholt zu leichtem Verdrehen des Bauteils beim Zoomen),
  // auf OrbitControls' EINGEBAUTES, gut getestetes zoomToCursor umgestiegen —
  // exakt das Standardverhalten aus Fusion 360/CAD-Viewern. Kompromiss: kein
  // freies "Tumbling" (Rollen um die Blickachse) mehr wie bei TrackballControls,
  // dafür verlässliches, unverdrehtes Zoomen zum Cursor UND ein Drehpunkt, der
  // beim Rotieren immer am aktuellen Blickziel bleibt.
  controls = new OrbitControls(camera, renderer.domElement);
  controls.rotateSpeed = 1.4;
  controls.panSpeed = 1.0;
  controls.zoomSpeed = 1.6; // 0.6 (Reaktion auf den alten Eigenbau-Zoom) war deutlich zu langsam
  controls.zoomToCursor = true;
  controls.enableDamping = true;
  controls.dampingFactor = 0.15;
  controls.screenSpacePanning = true;
  // Wie in Fusion 360/gängigen CAD-Viewern: rechte Maustaste dreht das Modell,
  // linke Maustaste bleibt frei für das eigene Klicken/Anwählen von Flächen/
  // Kanten (handlePick/handleHover unten, unabhängig von OrbitControls) —
  // vorher lag Drehen auf LINKS, was mit dem präzisen Anklicken kollidierte.
  controls.mouseButtons = {
    LEFT: null,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.ROTATE,
  };

  // Weiches, gleichmäßiges Licht — Modell bleibt hellgrau mit sanfter Schattierung
  const hemi = new THREE.HemisphereLight(0xffffff, 0xc4c9d0, 1.1);
  scene.add(hemi);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(5, 10, 7.5);
  scene.add(dirLight);
  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.35);
  dirLight2.position.set(-5, -3, -5);
  scene.add(dirLight2);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  addPlaceholderMesh();
  animate();
}

function removeCurrent() {
  // Alte Maßkästen/Mess-Highlights gehören zum alten Modell → mit entfernen
  disposeGroup(quaderGroup); quaderGroup = null;
  disposeGroup(rundGroup); rundGroup = null;
  disposeGroup(hoverGroup); hoverGroup = null;
  disposeGroup(pickGroup); pickGroup = null;
  disposeGroup(exakteKantenGroup); exakteKantenGroup = null;
  disposeGroup(abstandGruppe); abstandGruppe = null;
  disposeGroup(abstandVorschauGruppe); abstandVorschauGruppe = null;
  abstandText.value = '';
  abstandTreffer1 = null;
  abstandHit1 = null;
  abstandPunkt1.value = null;
  if (!currentMesh || !scene) return;
  scene.remove(currentMesh);
  currentMesh.traverse?.((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
      else child.material.dispose();
    }
  });
  if (currentMesh.geometry) currentMesh.geometry.dispose();
  if (currentMesh.material) currentMesh.material.dispose();
  currentMesh = null;
}

function getModelColorThree() {
  return new THREE.Color(modelColorHex.value);
}

function addPlaceholderMesh() {
  if (!scene) return;
  removeCurrent();
  const geometry = new THREE.BoxGeometry(2, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: getModelColorThree(),
    metalness: 0.35,
    roughness: 0.5,
  });
  currentMesh = new THREE.Mesh(geometry, material);
  scene.add(currentMesh);
  addEdges(currentMesh);
}

function applyModelColor() {
  if (!currentMesh || !scene) return;
  const color = getModelColorThree();
  currentMesh.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.color.copy(color);
    }
  });
}

// Aktuell geladene STEP-Datei merken — damit ein späteres, präziseres Netz
// (siehe buildMeshVonFlaechen) nicht versehentlich ein bereits gewechseltes
// Bauteil überschreibt, falls props.flaechen verzögert vom vorherigen Datei-
// wechsel eintrifft.
let aktuelleStepDatei = null;

// Präzises Anzeige-Netz DIREKT aus opencascade.js' eigener Flächen-Triangulierung
// bauen — denselben Daten, die auch fürs Markieren/Messen verwendet werden.
// Das behebt das Grundproblem der letzten Versuche: Anzeige-Netz (bisher aus
// occt-import-js) und Markierungs-Netz (opencascade.js) waren zwei UNABHÄNGIGE
// Triangulierungen derselben Fläche, die nie exakt übereinanderlagen — Ursache
// für Z-Fighting, "schwebende" und halbierte Markierungen. Jedes Flächen-Mesh
// trägt seine Analyse-Daten in userData.flaeche, damit später exakt dieselben
// Punkte markiert werden statt sie separat neu zu berechnen.
function buildMeshVonFlaechen(flaechen) {
  const group = new THREE.Group();
  const color = getModelColorThree();
  // Koaxiale Flächen (siehe istKoaxial/gesammelteDreiecke oben) auch HIER schon
  // zu einem einzigen Mesh zusammenfassen, nicht erst beim Markieren — sonst
  // berechnet computeVertexNormals() für jede Teilfläche unabhängig eigene
  // Normalen, was an der inneren Grenze als sichtbarer Schattierungs-Sprung/
  // Naht auffällt, obwohl es geometrisch eine durchgängige Rundfläche ist.
  const verwendet = new Set();
  for (const f of flaechen) {
    if (verwendet.has(f) || !f.dreiecke || f.dreiecke.length < 9) continue;
    const passende = flaechen.filter((g) => g.dreiecke && istKoaxial(f, g));
    for (const g of passende) verwendet.add(g);
    let positions = f.dreiecke;
    if (passende.length > 1) {
      let gesamt = 0;
      for (const g of passende) gesamt += g.dreiecke.length;
      positions = new Float32Array(gesamt);
      let offset = 0;
      for (const g of passende) { positions.set(g.dreiecke, offset); offset += g.dreiecke.length; }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color, metalness: 0.35, roughness: 0.5, side: THREE.DoubleSide,
      // polygonOffset HIER auf der Fläche (nicht auf der Kanten-Linie!) —
      // schiebt nur die Dreiecke minimal von der Kamera weg, damit die exakten
      // Kanten (buildExaktesKantenLinie/exakteKantenGroup), die exakt auf der
      // Flächengrenze liegen, nicht mehr mit ihr um denselben Tiefenwert
      // "flackern" (Z-Fighting → gestrichelt wirkende Linien). Ein früherer
      // Versuch, denselben Effekt stattdessen auf der Line2/LineMaterial zu
      // erzeugen, machte die Linien auf manchen Bauteilen komplett unsichtbar.
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.flaeche = f;
    group.add(mesh);
  }
  return group;
}

// Sobald PartCard die exakte Flächenanalyse fertig hat (läuft asynchron parallel
// zur Volumenberechnung, kommt also etwas NACH dem ersten schnellen Rendern über
// occt-import-js), das Anzeige-Netz durch die präzise Version ersetzen.
watch(() => props.flaechen, (neu) => {
  if (!scene || !aktuelleStepDatei || !neu?.length) return;
  const praezise = buildMeshVonFlaechen(neu);
  if (!praezise.children.length) return;
  removeCurrent();
  scene.add(praezise);
  currentMesh = praezise;
  buildExakteKantenOverlay();
  refreshMeasures();
});

async function loadStepWithOcct(file) {
  loadingStep.value = true;
  stepError.value = '';
  // Sicherheitsnetz: bleibt loadingStep aus irgendeinem Grund (z.B. ein nicht
  // abgefangener Fehler in einer verschachtelten Callback/Promise) auf "true"
  // hängen, blendet der Lade-Overlay (position:absolute inset-0) die GESAMTE
  // Werkzeugleiste inkl. "Datei wählen" dauerhaft ab — der Viewer wirkt dann
  // komplett eingefroren, ohne jeden Klick-Ausweg. Nach 20s zwangsweise
  // zurücksetzen, damit der Nutzer es zumindest erneut versuchen kann.
  const wachhund = setTimeout(() => {
    if (loadingStep.value) {
      loadingStep.value = false;
      stepError.value = 'STEP-Import hat zu lange gedauert oder hängt fest. Bitte erneut versuchen.';
    }
  }, 20000);
  try {
    // Bereits geparst? Dann aus dem Cache (kein erneutes WASM-Parsen beim Durchklicken)
    let meshes = stepMeshCache.get(file);
    if (!meshes) {
      // Läuft/wartet die Datei schon im Hintergrund-Worker? Dann darauf warten
      // (an den Anfang der Warteschlange gezogen) — max. 8 s, danach wie bisher
      // selbst im Hauptthread parsen.
      const job = jobFuerDatei(file);
      if (job) {
        planeAnalyse(job.partId, file, { vorne: true });
        meshes = await Promise.race([
          job.mesh.catch(() => null),
          new Promise((res) => setTimeout(() => res(null), 8000)),
        ]);
      }
    }
    if (!meshes) {
      meshes = await leseStepMeshes(file);
      if (!meshes.length) {
        stepError.value = 'STEP-Datei enthält keine darstellbare Geometrie.';
        loadingStep.value = false;
        clearTimeout(wachhund);
        return;
      }
      try { stepMeshCache.set(file, meshes); } catch (e) { /* ignore */ }
    }
    if (!meshes.length) {
      stepError.value = 'STEP-Datei enthält keine darstellbare Geometrie.';
      loadingStep.value = false;
      clearTimeout(wachhund);
      return;
    }

    removeCurrent();
    const group = new THREE.Group();

    for (const resultMesh of meshes) {
      const geometry = new THREE.BufferGeometry();
      const pos = resultMesh.attributes?.position;
      if (pos?.array) {
        const arr = pos.array instanceof Float32Array ? pos.array : new Float32Array(pos.array);
        geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      }
      const norm = resultMesh.attributes?.normal;
      if (norm?.array) {
        const arr = norm.array instanceof Float32Array ? norm.array : new Float32Array(norm.array);
        geometry.setAttribute('normal', new THREE.BufferAttribute(arr, 3));
      }
      const idx = resultMesh.index;
      if (idx?.array && idx.array.length > 0) {
        const arr = idx.array instanceof Uint32Array ? idx.array
          : idx.array instanceof Uint16Array ? idx.array
          : new Uint32Array(idx.array);
        geometry.setIndex(new THREE.BufferAttribute(arr, 1));
      }

      const color = getModelColorThree();
      const mat = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.35,
        roughness: 0.5,
        side: THREE.DoubleSide,
        // Siehe Kommentar in buildMeshVonFlaechen — verhindert Z-Fighting mit
        // den exakten Kanten-Linien, die schon auf diesem ersten schnellen
        // Netz erscheinen können, solange die präzise Fläche noch lädt.
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
      group.add(new THREE.Mesh(geometry, mat));
    }

    scene.add(group);
    currentMesh = group;
    addEdges(group);
    fitCameraToObject(group);
    resetRoundAxis();
    emitDimensions();
    refreshMeasures();
    loadingStep.value = false;
    clearTimeout(wachhund);
    setTimeout(captureThumbnail, 350);
  } catch (err) {
    console.error('STEP-Import Fehler:', err);
    const msg = err.message || String(err);
    // NUR bei einem Fehler beim Laden/Ausführen der WASM-Datei selbst auf den
    // Einrichtungs-Hinweis verweisen — der bloße Text "fetch" kam vorher auch
    // bei völlig anderen Fehlern (z.B. defekte STEP-Datei aus dem NAS-Speicher)
    // vor und hat dann fälschlich "WASM fehlt" behauptet, obwohl die Datei da
    // war. Echte Meldung IMMER mit anzeigen, statt sie zu verschlucken.
    const istWasmFehler = msg.includes('occt-import-js.wasm') || msg.includes('locateFile') || msg.includes('wasm streaming compile');
    stepError.value = istWasmFehler
      ? `WASM-Datei fehlt oder konnte nicht geladen werden. Bitte ANLEITUNG-STEP-WASM.md prüfen. (${msg})`
      : 'STEP-Import fehlgeschlagen: ' + msg;
    loadingStep.value = false;
    clearTimeout(wachhund);
    addPlaceholderMesh();
  }
}

function loadModelFromFile(file) {
  if (!file || !scene) return;
  stepError.value = '';
  messwert.value = '';
  const name = (file.name || '').toLowerCase();
  const isStep = name.endsWith('.step') || name.endsWith('.stp');

  fileName.value = file.name;
  emits('loaded', file);

  if (isStep) {
    aktuelleStepDatei = file;
    loadStepWithOcct(file);
    return;
  }
  aktuelleStepDatei = null;

  const url = URL.createObjectURL(file);

  if (name.endsWith('.stl')) {
    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        removeCurrent();
        geometry.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({
          color: getModelColorThree(),
          metalness: 0.35,
          roughness: 0.5,
        });
        currentMesh = new THREE.Mesh(geometry, mat);
        scene.add(currentMesh);
        addEdges(currentMesh);
        fitCameraToObject(currentMesh);
        resetRoundAxis();
        emitDimensions();
        refreshMeasures();
        setTimeout(captureThumbnail, 350);
        URL.revokeObjectURL(url);
      },
      undefined,
      (err) => {
        console.error('STL load error', err);
        URL.revokeObjectURL(url);
      },
    );
  } else if (name.endsWith('.glb') || name.endsWith('.gltf')) {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        removeCurrent();
        const model = gltf.scene;
        scene.add(model);
        currentMesh = model;
        addEdges(model);
        fitCameraToObject(model);
        resetRoundAxis();
        emitDimensions();
        refreshMeasures();
        setTimeout(captureThumbnail, 350);
        URL.revokeObjectURL(url);
      },
      undefined,
      (err) => {
        console.error('GLTF load error', err);
        URL.revokeObjectURL(url);
      },
    );
  } else {
    URL.revokeObjectURL(url);
  }
}

function fitCameraToObject(object) {
  if (!camera || !object) return;
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const radius = sphere.radius;
  if (!radius || radius === 0) return;
  const fov = camera.fov * (Math.PI / 180);
  const aspect = Math.max(0.25, camera.aspect || 1); // gegen Division durch ~0 (Kamera-Flucht)
  // Abstand, damit die Umkugel KOMPLETT ins Bild passt — egal wie gedreht (kein Abschneiden)
  let dist = radius / Math.sin(fov / 2);
  dist = dist / Math.min(1, aspect); // schmaler Viewport → weiter weg
  dist *= 1.2; // 20 % Rand
  // Clipping-Ebenen an Modellgröße anpassen (sonst wird großes Modell hinter "far" abgeschnitten)
  camera.near = Math.max(dist / 1000, radius / 1000, 0.01);
  camera.far = dist * 6 + radius * 6;
  camera.updateProjectionMatrix();
  camera.position.set(center.x + dist * 0.5, center.y + dist * 0.5, center.z + dist);
  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();
}

// Viewer an Container-Größe anpassen (verhindert Verzerrung/Abschneiden)
function handleResize() {
  const container = containerRef.value;
  if (!container || !renderer || !camera) return;
  const width = container.clientWidth;
  const height = container.clientHeight;
  // Ungültige/Null-Größen ignorieren (sonst fliegt die Kamera weg)
  if (width < 10 || height < 10) return;
  renderer.setSize(width, height);
  if (labelRenderer) labelRenderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (controls?.handleResize) controls.handleResize();
  if (currentMesh) fitCameraToObject(currentMesh);
}

function animate() {
  if (!renderer || !scene || !camera) return;
  animFrameId = requestAnimationFrame(animate);
  controls?.update();
  if (schnittModus.value && currentMesh !== schnittLetzterMesh) {
    schnittLetzterMesh = currentMesh;
    aktualisiereSchnittebene();
  }
  if (innenlebenModus.value && currentMesh !== innenlebenLetzterMesh) {
    innenlebenLetzterMesh = currentMesh;
    klassifiziereAussenschale();
    const meshes = [];
    currentMesh?.traverse((o) => { if (o.isMesh) meshes.push(o); });
    if (!klassifikationIstSinnvoll(meshes)) innenlebenModus.value = false; // Sicherheitsnetz, siehe toggleInnenlebenModus
    wendeInnenlebenAn();
  }
  renderer.render(scene, camera);
  if (labelRenderer) labelRenderer.render(scene, camera);
}

function onFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  loadModelFromFile(file);
}

function onDrop(event) {
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  loadModelFromFile(file);
}

watch(
  () => props.initialFile,
  (file) => {
    if (file) loadModelFromFile(file);
    else {
      fileName.value = '';
      stepError.value = '';
      addPlaceholderMesh();
    }
  },
);

// Aufmaß geändert → Maßkästen live anpassen
watch(() => props.aufmass, () => refreshMeasures());

// Exakte Kanten treffen (aus PartCard, opencascade.js-Analyse) meist etwas
// SPÄTER ein als das Anzeige-Netz (läuft parallel zur Volumenberechnung) —
// sobald verfügbar, die exakte Kanten-Kontur nachziehen.
watch(() => props.kanten, () => buildExakteKantenOverlay());

onMounted(() => {
  initScene();
  if (containerRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObs = new ResizeObserver(() => handleResize());
    resizeObs.observe(containerRef.value);
  }
  if (props.initialFile) loadModelFromFile(props.initialFile);
});

onBeforeUnmount(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
  removeCurrent();
  if (labelRenderer && labelRenderer.domElement.parentNode) {
    labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement);
  }
  if (renderer) renderer.dispose();
});
</script>
