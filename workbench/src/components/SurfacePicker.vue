<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
      <span class="text-sm text-slate-300 font-medium">Oberfläche wählen</span>
      <button type="button" class="text-slate-400 hover:text-white text-2xl leading-none" @click="$emit('close')">×</button>
    </div>
    <div class="flex-1 overflow-y-auto p-2">
      <button
        v-for="s in liste"
        :key="s.label"
        type="button"
        class="w-full flex items-center justify-between text-left px-3 py-2 rounded-md text-xs hover:bg-slate-800 transition mb-1"
        @click="$emit('select', s.label)"
      >
        <span class="text-slate-200">{{ s.label }}</span>
        <span v-if="s.custom" class="text-[9px] text-emerald-400">eigen</span>
      </button>
      <p v-if="!liste.length" class="text-center text-slate-500 text-xs py-6">Keine Einträge.</p>
    </div>
    <div class="border-t border-slate-800 p-3">
      <button
        v-if="!showForm"
        type="button"
        class="w-full rounded-lg border border-dashed border-slate-600 px-3 py-2 text-xs text-slate-300 hover:border-sky-500 hover:text-sky-300 transition"
        @click="showForm = true"
      >
        + Neue Oberfläche anlegen
      </button>
      <div v-else class="space-y-2">
        <input v-model="form.label" type="text" placeholder="Bezeichnung (z. B. gebeizt)" class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500" />
        <input v-model="form.keywords" type="text" placeholder="Schlüsselwörter (Komma-getrennt)" class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500" />
        <p class="text-[10px] text-slate-500">Nur in diesem Browser gespeichert (kein Server).</p>
        <div class="flex items-center gap-2">
          <button type="button" class="rounded bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 text-xs font-medium transition" @click="saveNew">Speichern</button>
          <button type="button" class="rounded border border-slate-600 text-slate-300 px-3 py-1.5 text-xs hover:border-slate-400 transition" @click="showForm = false">Abbrechen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { getAllSurfaces, addCustomSurface } from '../utils/materialRecognition.js';

const emits = defineEmits(['select', 'close']);
const showForm = ref(false);
const form = ref({ label: '', keywords: '' });
const refreshKey = ref(0);

const liste = computed(() => { refreshKey.value; return getAllSurfaces(); });

function saveNew() {
  if (!form.value.label) return;
  addCustomSurface(form.value);
  emits('select', form.value.label);
  showForm.value = false;
  form.value = { label: '', keywords: '' };
  refreshKey.value += 1;
}
</script>
