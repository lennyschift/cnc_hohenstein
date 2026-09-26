<template>
  <div class="flex flex-col h-full">
    <!-- Kopf -->
    <div class="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
      <span class="text-sm text-slate-300 font-medium">Rohmaterial aus Lager wählen</span>
      <button type="button" class="text-slate-400 hover:text-white text-2xl leading-none" @click="$emit('close')">×</button>
    </div>

    <div class="flex flex-1 min-h-0">
      <!-- Links: Form/Profil -->
      <aside class="w-40 flex-shrink-0 border-r border-slate-800 overflow-y-auto p-2">
        <p class="text-[10px] uppercase tracking-wide text-slate-500 px-2 mb-1">Form</p>
        <button
          v-for="f in formen"
          :key="f"
          type="button"
          class="block w-full text-left px-2 py-1.5 rounded-md text-xs transition"
          :class="form === f ? 'bg-sky-500/20 text-sky-300' : 'text-slate-300 hover:bg-slate-800'"
          @click="form = form === f ? '' : f"
        >
          {{ f }}
        </button>
      </aside>

      <!-- Rechts: Facetten + Ergebnis -->
      <div class="flex-1 min-w-0 flex flex-col">
        <!-- Facetten-Chips -->
        <div class="p-3 space-y-2 border-b border-slate-800">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[10px] uppercase tracking-wide text-slate-500 w-20">Werkstoff</span>
            <button
              v-for="w in werkstoffOptionen"
              :key="w"
              type="button"
              class="px-2 py-0.5 rounded-full text-[11px] border transition"
              :class="werkstoff === w ? 'bg-sky-500 text-slate-950 border-sky-500' : 'border-slate-700 text-slate-300 hover:border-sky-500'"
              @click="werkstoff = werkstoff === w ? '' : w"
            >{{ w }}</button>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[10px] uppercase tracking-wide text-slate-500 w-20">Durchmesser</span>
            <button
              v-for="d in durchmesserOptionen"
              :key="d"
              type="button"
              class="px-2 py-0.5 rounded-full text-[11px] border transition"
              :class="durchmesser === d ? 'bg-sky-500 text-slate-950 border-sky-500' : 'border-slate-700 text-slate-300 hover:border-sky-500'"
              @click="durchmesser = durchmesser === d ? null : d"
            >⌀{{ d }}</button>
          </div>
          <div class="flex items-center gap-3 pt-1">
            <label class="flex items-center gap-1.5 cursor-pointer select-none">
              <input v-model="nurVorrat" type="checkbox" class="w-3.5 h-3.5 rounded border-slate-600 bg-slate-950 text-sky-500" />
              <span class="text-[11px] text-slate-400">nur vorrätig</span>
            </label>
            <button type="button" class="text-[11px] text-slate-500 hover:text-sky-400 ml-auto" @click="reset">Alle Filter zurücksetzen</button>
          </div>
        </div>

        <!-- Ergebnisliste -->
        <div class="flex-1 overflow-y-auto">
          <table class="w-full text-xs">
            <thead class="text-[10px] uppercase tracking-wide text-slate-500 sticky top-0 bg-slate-900">
              <tr>
                <th class="text-left px-3 py-2 font-medium">Artikel</th>
                <th class="text-left px-2 py-2 font-medium">⌀</th>
                <th class="text-left px-2 py-2 font-medium">Werkstoff</th>
                <th class="text-left px-2 py-2 font-medium">Länge</th>
                <th class="text-left px-2 py-2 font-medium">Bestand</th>
                <th class="text-right px-3 py-2 font-medium">Preis</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in gefiltert"
                :key="row.code"
                class="border-t border-slate-800 hover:bg-slate-800/60 cursor-pointer"
                @click="$emit('select', row)"
              >
                <td class="px-3 py-2 text-slate-200 font-medium whitespace-nowrap">{{ row.code }}</td>
                <td class="px-2 py-2 text-slate-300">{{ row.durchmesser }}</td>
                <td class="px-2 py-2 text-slate-400">{{ row.norm }}</td>
                <td class="px-2 py-2 text-slate-400">{{ row.laenge }}</td>
                <td class="px-2 py-2">
                  <span
                    class="px-1.5 py-0.5 rounded text-[10px]"
                    :class="row.vorrat ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'"
                  >{{ row.vorrat ? 'Vorrat' : 'nicht verfügbar' }}</span>
                </td>
                <td class="px-3 py-2 text-right text-slate-200 whitespace-nowrap">
                  {{ row.preis ? row.preis.toFixed(2) + ' €/kg' : '–' }}
                </td>
              </tr>
              <tr v-if="gefiltert.length === 0">
                <td colspan="6" class="px-3 py-6 text-center text-slate-500">Keine Artikel für diese Auswahl.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="px-3 py-2 border-t border-slate-800 text-[11px] text-slate-500">
          {{ gefiltert.length }} Artikel · Demo-Daten (später live aus ERPNext / Weinmann)
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

defineEmits(['select', 'close']);

// DEMO-Lagerdaten – später ersetzt durch ERPNext-Artikel + Charge + Weinmann-Preise
const lager = [
  { code: 'ALU-7075-RD-D50', werkstoff: 'Alu 7075', form: 'Rund', durchmesser: 50, norm: 'EN AW-7075', laenge: 3000, vorrat: true, preis: 7.20, dichte: 2.81 },
  { code: 'ALU-7075-RD-D60', werkstoff: 'Alu 7075', form: 'Rund', durchmesser: 60, norm: 'EN AW-7075', laenge: 3000, vorrat: true, preis: 7.20, dichte: 2.81 },
  { code: 'ALU-7075-RD-D38', werkstoff: 'Alu 7075', form: 'Rund', durchmesser: 38, norm: 'EN AW-7075', laenge: 3000, vorrat: false, preis: null, dichte: 2.81 },
  { code: 'ALU-6082-RD-D50', werkstoff: 'Alu 6082', form: 'Rund', durchmesser: 50, norm: 'EN AW-6082', laenge: 3000, vorrat: true, preis: 5.40, dichte: 2.70 },
  { code: 'ALU-6082-FL-40x20', werkstoff: 'Alu 6082', form: 'Flach', durchmesser: 40, norm: 'EN AW-6082', laenge: 3000, vorrat: true, preis: 5.60, dichte: 2.70 },
  { code: 'STAHL-S235-RD-D40', werkstoff: 'S235JR', form: 'Rund', durchmesser: 40, norm: 'S235JR', laenge: 6000, vorrat: true, preis: 1.85, dichte: 7.85 },
  { code: 'STAHL-S235-RD-D65', werkstoff: 'S235JR', form: 'Rund', durchmesser: 65, norm: 'S235JR', laenge: 6000, vorrat: true, preis: 1.85, dichte: 7.85 },
  { code: 'VA-1.4301-RD-D50', werkstoff: '1.4301', form: 'Rund', durchmesser: 50, norm: '1.4301', laenge: 3000, vorrat: false, preis: null, dichte: 7.90 },
  { code: 'VA-1.4301-VK-30', werkstoff: '1.4301', form: 'Vierkant', durchmesser: 30, norm: '1.4301', laenge: 3000, vorrat: true, preis: 4.10, dichte: 7.90 },
];

const formen = ['Rund', 'Flach', 'Vierkant', 'Rohr', 'Sechskant'];

const form = ref('Rund');
const werkstoff = ref('');
const durchmesser = ref(null);
const nurVorrat = ref(false);

// Facetten passen sich an die bereits getroffene Auswahl an (Kaskade)
const teilGefiltert = computed(() =>
  lager.filter((r) =>
    (!form.value || r.form === form.value) &&
    (!werkstoff.value || r.werkstoff === werkstoff.value) &&
    (!nurVorrat.value || r.vorrat),
  ),
);

const werkstoffOptionen = computed(() =>
  [...new Set(lager.filter((r) => !form.value || r.form === form.value).map((r) => r.werkstoff))],
);
const durchmesserOptionen = computed(() =>
  [...new Set(teilGefiltert.value.map((r) => r.durchmesser))].sort((a, b) => a - b),
);

const gefiltert = computed(() =>
  teilGefiltert.value.filter((r) => durchmesser.value == null || r.durchmesser === durchmesser.value),
);

function reset() {
  form.value = '';
  werkstoff.value = '';
  durchmesser.value = null;
  nurVorrat.value = false;
}
</script>
