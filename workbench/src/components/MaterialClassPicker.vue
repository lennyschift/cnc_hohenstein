<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
      <span class="text-sm text-slate-300 font-medium">Material wählen</span>
      <button type="button" class="text-slate-400 hover:text-white text-2xl leading-none" @click="$emit('close')">×</button>
    </div>

    <div class="flex flex-1 min-h-0">
      <!-- Links: Klassen -->
      <aside class="w-56 flex-shrink-0 border-r border-slate-800 overflow-y-auto p-2">
        <button
          type="button"
          class="w-full text-left px-2 py-1.5 rounded-md text-xs mb-1 transition"
          :class="!klasse ? 'bg-sky-500/20 text-sky-300' : 'text-slate-300 hover:bg-slate-800'"
          @click="klasse = ''"
        >
          Alle Materialien anzeigen
        </button>
        <button
          v-for="c in gruppen"
          :key="c.key"
          type="button"
          class="w-full flex items-start gap-2 text-left px-2 py-2 rounded-md mb-1 transition"
          :class="klasse === c.key ? 'bg-sky-500/20' : 'hover:bg-slate-800'"
          @click="klasse = klasse === c.key ? '' : c.key"
        >
          <span
            class="inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-bold text-slate-900 flex-shrink-0 mt-0.5"
            :style="{ background: c.color }"
          >{{ c.key }}</span>
          <span class="min-w-0">
            <span class="block text-xs font-medium text-slate-200">{{ c.label }}</span>
            <span class="block text-[10px] text-slate-500 leading-snug">{{ c.description }}</span>
          </span>
        </button>
      </aside>

      <!-- Rechts: Suche + Ergebnisliste -->
      <div class="flex-1 min-w-0 flex flex-col">
        <div class="p-3 border-b border-slate-800">
          <input
            v-model="suche"
            type="text"
            placeholder="Suchen (Name, Werkstoffnummer)..."
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div class="flex-1 overflow-y-auto">
          <table class="w-full text-xs">
            <tbody>
              <tr
                v-for="m in gefiltert"
                :key="m.name"
                class="border-t border-slate-800 hover:bg-slate-800/60 cursor-pointer"
                @click="selectMaterial(m)"
              >
                <td class="px-3 py-2 w-8">
                  <span
                    class="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-slate-900"
                    :style="{ background: klasseColor(m.klasse) }"
                  >{{ m.klasse }}</span>
                </td>
                <td class="px-2 py-2 text-slate-200 font-medium">
                  {{ m.name }}
                  <span v-if="m.custom" class="ml-1 text-[9px] text-emerald-400">eigen</span>
                </td>
                <td class="px-3 py-2 text-right text-slate-500 whitespace-nowrap">{{ m.dichte }} g/cm³</td>
              </tr>
              <tr v-if="gefiltert.length === 0">
                <td colspan="3" class="px-3 py-6 text-center text-slate-500">Keine Materialien gefunden.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Neues Material anlegen -->
        <div class="border-t border-slate-800 p-3">
          <button
            v-if="!showForm"
            type="button"
            class="w-full rounded-lg border border-dashed border-slate-600 px-3 py-2 text-xs text-slate-300 hover:border-sky-500 hover:text-sky-300 transition"
            @click="showForm = true"
          >
            + Neues Material anlegen
          </button>
          <div v-else class="space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <input v-model="form.name" type="text" placeholder="Name (z. B. 1.4462)" class="bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500" />
              <select v-model="form.klasse" class="bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500">
                <option value="">Klasse wählen</option>
                <option v-for="c in gruppen" :key="c.key" :value="c.key">{{ c.key }} – {{ c.label }}</option>
              </select>
              <input v-model.number="form.dichte" type="number" step="0.01" placeholder="Dichte (g/cm³)" class="bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500" />
              <input v-model="form.keywords" type="text" placeholder="Schlüsselwörter (Komma-getrennt)" class="bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500" />
            </div>
            <p class="text-[10px] text-slate-500">
              Schlüsselwörter = Begriffe, die künftig in Zeichnungen erkannt werden sollen (z. B. Werkstoffnummer, EN-Bezeichnung).
              Wird nur in diesem Browser gespeichert (kein Server) — Export/Import unten zur Sicherung.
            </p>
            <div class="flex items-center gap-2">
              <button type="button" class="rounded bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 text-xs font-medium transition" @click="saveNewMaterial">
                Speichern
              </button>
              <button type="button" class="rounded border border-slate-600 text-slate-300 px-3 py-1.5 text-xs hover:border-slate-400 transition" @click="showForm = false">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { MATERIAL_CLASSES, materialsByClass, addCustomMaterial } from '../utils/materialRecognition.js';

const emits = defineEmits(['select', 'close']);

const klasse = ref('');
const suche = ref('');
const showForm = ref(false);
const form = ref({ name: '', klasse: '', dichte: '', keywords: '' });

const gruppen = MATERIAL_CLASSES;

function klasseColor(key) {
  return gruppen.find((g) => g.key === key)?.color || '#94a3b8';
}

const alleMaterialien = computed(() => materialsByClass().flatMap((g) => g.materials));

const gefiltert = computed(() => {
  let list = alleMaterialien.value;
  if (klasse.value) list = list.filter((m) => m.klasse === klasse.value);
  const q = suche.value.trim().toLowerCase();
  if (q) list = list.filter((m) => m.name.toLowerCase().includes(q));
  return list;
});

function selectMaterial(m) {
  const c = gruppen.find((g) => g.key === m.klasse);
  emits('select', {
    name: m.name,
    klasse: m.klasse,
    color: c?.color || '#94a3b8',
    label: c?.label || m.klasse,
    dichte: m.dichte,
  });
}

function saveNewMaterial() {
  if (!form.value.name || !form.value.klasse) return;
  addCustomMaterial(form.value);
  selectMaterial({ name: form.value.name, klasse: form.value.klasse, dichte: Number(form.value.dichte) || 0 });
  showForm.value = false;
  form.value = { name: '', klasse: '', dichte: '', keywords: '' };
}
</script>
