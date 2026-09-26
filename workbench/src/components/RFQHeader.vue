<template>
  <header
    class="bg-slate-900/80 border border-slate-800 rounded-2xl px-5 py-4 flex flex-col gap-3 shadow-sm"
  >
    <div class="space-y-2">
      <div class="flex items-center gap-3 flex-wrap">
        <p class="text-xs font-semibold tracking-wide text-sky-400 uppercase">
          RFQ
        </p>
        <span v-if="localRfq.aktualisiert" class="text-[10px] text-slate-500">
          Erstellt: {{ formatZeitpunkt(localRfq.erstellt) }} · Zuletzt geändert: {{ formatZeitpunkt(localRfq.aktualisiert) }}
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <select
          class="bg-slate-900 border border-sky-700/60 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
          @change="onKundeSelect"
        >
          <option value="">Kunde wählen…</option>
          <option v-for="(k, i) in kunden" :key="i" :value="i">{{ k.name }}</option>
          <option value="__new__">+ Neuer Kunde…</option>
        </select>
        <textarea
          v-model="localRfq.customer_name"
          rows="1"
          class="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 min-w-[200px] resize-y leading-tight"
          placeholder="Kunde / Anschrift (mehrzeilig möglich)"
          title="Mehrere Zeilen möglich (Firma / Straße / PLZ Ort) — Feld ist vertikal ziehbar"
        ></textarea>
        <select
          v-if="ansprechpartnerListe.length || aktuellerKunde"
          v-model="localRfq.ansprechpartner_name"
          class="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
          @change="onAnsprechpartnerSelect"
        >
          <option value="">Ansprechpartner…</option>
          <option v-for="(a, i) in ansprechpartnerListe" :key="i" :value="a.name">{{ a.name }}</option>
          <option value="__new__">+ Neuer Ansprechpartner…</option>
        </select>
        <div class="flex items-center gap-1">
          <span class="text-[11px] text-slate-400">AN-Nr.</span>
          <input
            v-model="localRfq.rfq_number"
            type="text"
            class="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 w-28"
            placeholder="z. B. 260001"
          />
          <button
            type="button"
            class="rounded-lg border border-slate-700/80 bg-slate-800 px-2 py-1.5 text-[11px] text-slate-200 hover:border-sky-500 transition"
            title="Nächste fortlaufende Nummer vergeben (Jahr + 4-stellig)"
            @click="vergebeNummer"
          >
            Nr. vergeben
          </button>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-[11px] text-slate-400">Lieferanten-Nr.</span>
          <input
            v-model="localRfq.lieferanten_nr"
            type="text"
            class="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 w-28"
            placeholder="063018/00"
          />
        </div>
        <input
          v-model="localRfq.email_source"
          type="text"
          class="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 min-w-[160px]"
          placeholder="E-Mail Quelle (intern)"
        />
      </div>

      <!-- Neuer Kunde anlegen -->
      <div v-if="showNeuerKunde" class="flex flex-wrap items-center gap-2 pt-1 bg-slate-950/60 rounded-lg p-2">
        <span class="text-[11px] text-emerald-300 font-medium">Neuer Kunde:</span>
        <input v-model="neuerKunde.name" type="text" placeholder="Firma" class="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 w-40" />
        <textarea v-model="neuerKunde.adresse" placeholder="Anschrift (mehrzeilig)" rows="1" class="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 w-56 resize-none"></textarea>
        <input v-model="neuerKunde.email" type="text" placeholder="E-Mail" class="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 w-40" />
        <input v-model="neuerKunde.lieferanten_nr" type="text" placeholder="Lieferanten-Nr." class="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 w-28" />
        <button type="button" class="rounded bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[11px] font-medium transition" @click="speichereNeuenKunden">Speichern</button>
        <button type="button" class="rounded border border-slate-600 text-slate-300 px-2 py-1 text-[11px] hover:border-slate-400 transition" @click="showNeuerKunde = false">Abbrechen</button>
      </div>

      <!-- Neuer Ansprechpartner anlegen -->
      <div v-if="showNeuerKontakt" class="flex flex-wrap items-center gap-2 pt-1 bg-slate-950/60 rounded-lg p-2">
        <span class="text-[11px] text-emerald-300 font-medium">Neuer Ansprechpartner{{ aktuellerKunde ? ' für ' + aktuellerKunde.name : '' }}:</span>
        <input v-model="neuerKontakt.name" type="text" placeholder="Name" class="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 w-40" />
        <input v-model="neuerKontakt.email" type="text" placeholder="E-Mail" class="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 w-40" />
        <input v-model="neuerKontakt.telefon" type="text" placeholder="Telefon" class="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 w-32" />
        <button type="button" class="rounded bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[11px] font-medium transition" @click="speichereNeuenKontakt">Speichern</button>
        <button type="button" class="rounded border border-slate-600 text-slate-300 px-2 py-1 text-[11px] hover:border-slate-400 transition" @click="showNeuerKontakt = false">Abbrechen</button>
      </div>

      <div class="flex flex-wrap items-center gap-3 pt-1">
        <div class="flex items-center gap-2">
          <label class="text-[11px] text-slate-400 whitespace-nowrap">Datum</label>
          <input
            v-model="localRfq.date"
            type="date"
            class="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 cursor-pointer"
            @click="openDatePicker"
          />
        </div>
        <span
          v-if="localRfq.date && weekNumber != null"
          class="text-xs text-slate-300 font-medium"
        >
          KW {{ weekNumber }}
        </span>
        <span class="text-slate-600">|</span>
        <div class="flex items-center gap-2">
          <label class="text-[11px] text-slate-400 whitespace-nowrap">KW wählen</label>
          <select
            v-model="selectedKw"
            class="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 w-20"
            @change="onKwSelect"
          >
            <option value="">–</option>
            <option
              v-for="w in 53"
              :key="w"
              :value="w"
            >
              {{ w }}
            </option>
          </select>
          <span class="text-[11px] text-slate-500">Jahr</span>
          <select
            v-model="kwYear"
            class="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 w-20"
            @change="onKwSelect"
          >
            <option
              v-for="y in yearOptions"
              :key="y"
              :value="y"
            >
              {{ y }}
            </option>
          </select>
        </div>
        <span class="text-slate-600">|</span>
        <div class="flex items-center gap-2">
          <label class="text-[11px] text-emerald-300 whitespace-nowrap">Kundenliefertermin (im PDF)</label>
          <input
            v-model="localRfq.kundenliefertermin"
            type="text"
            class="bg-slate-900 border border-emerald-800/60 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-w-[150px]"
            placeholder="Nach Absprache / KW 30 / 25.07.2026"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-[11px] text-emerald-300 whitespace-nowrap">Angebotsgültigkeit (Wochen)</label>
          <input
            v-model.number="localRfq.gueltigkeit_wochen"
            type="number"
            min="1"
            step="1"
            class="bg-slate-900 border border-emerald-800/60 rounded-lg px-3 py-1.5 text-sm text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500 w-16"
          />
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:border-sky-500 hover:text-sky-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="speichernLaeuft"
        @click="$emit('save')"
      >
        {{ speichernLaeuft ? 'Speichert …' : 'Speichern' }}
      </button>
      <div class="flex flex-col gap-1">
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:border-sky-500 hover:text-sky-100 transition"
          @click="$emit('preview-pdf')"
        >
          Angebots-PDF ansehen
        </button>
        <label class="flex items-center gap-1.5 cursor-pointer select-none px-1">
          <input
            type="checkbox"
            :checked="bildImPdf"
            class="w-3.5 h-3.5 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
            @change="$emit('update:bildImPdf', $event.target.checked)"
          />
          <span class="text-[10px] text-slate-400">Bauteilbild im PDF</span>
        </label>
      </div>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:bg-sky-400 transition"
        @click="$emit('create-erpnext-quotation')"
      >
        ERPNext-Angebot erzeugen
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:bg-emerald-400 transition"
        @click="$emit('send-email')"
      >
        Per E-Mail senden
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { getISOWeek, getMondayOfISOWeek } from '../utils/dateWeek.js';
import { getNextAngebotsNummer } from '../utils/counters.js';
import { addCustomKunde, addCustomKontakt } from '../utils/kundenStore.js';

const props = defineProps({
  rfq: {
    type: Object,
    required: true,
  },
  kunden: {
    type: Array,
    default: () => [],
  },
  bildImPdf: {
    type: Boolean,
    default: false,
  },
  speichernLaeuft: {
    type: Boolean,
    default: false,
  },
});

function vergebeNummer() {
  const jahr = localRfq.value.date ? new Date(localRfq.value.date).getFullYear() : new Date().getFullYear();
  localRfq.value.rfq_number = getNextAngebotsNummer(jahr);
}

const aktuellerKunde = ref(null);
const ansprechpartnerListe = computed(() => aktuellerKunde.value?.ansprechpartner || []);

function onKundeSelect(e) {
  const val = e.target.value;
  if (val === '__new__') {
    showNeuerKunde.value = true;
    e.target.value = '';
    return;
  }
  if (val === '' || val == null) return;
  const k = props.kunden[Number(val)];
  if (!k) return;
  aktuellerKunde.value = k;
  localRfq.value.customer_name = k.adresse || k.name || '';
  localRfq.value.ansprechpartner_name = '';
  if (k.email && !localRfq.value.email_source) localRfq.value.email_source = k.email;
  if (k.lieferanten_nr != null) localRfq.value.lieferanten_nr = k.lieferanten_nr;
}

function onAnsprechpartnerSelect() {
  if (localRfq.value.ansprechpartner_name === '__new__') {
    localRfq.value.ansprechpartner_name = '';
    showNeuerKontakt.value = true;
  }
}

// --- Neuer Kunde ---
const showNeuerKunde = ref(false);
const neuerKunde = ref({ name: '', adresse: '', email: '', lieferanten_nr: '' });
function speichereNeuenKunden() {
  if (!neuerKunde.value.name) return;
  addCustomKunde({ ...neuerKunde.value });
  localRfq.value.customer_name = neuerKunde.value.adresse || neuerKunde.value.name;
  if (neuerKunde.value.lieferanten_nr) localRfq.value.lieferanten_nr = neuerKunde.value.lieferanten_nr;
  aktuellerKunde.value = { ...neuerKunde.value, ansprechpartner: [] };
  showNeuerKunde.value = false;
  neuerKunde.value = { name: '', adresse: '', email: '', lieferanten_nr: '' };
  emits('kunden-changed');
}

// --- Neuer Ansprechpartner ---
const showNeuerKontakt = ref(false);
const neuerKontakt = ref({ name: '', email: '', telefon: '' });
function speichereNeuenKontakt() {
  if (!neuerKontakt.value.name || !aktuellerKunde.value) return;
  const neu = { ...neuerKontakt.value };
  addCustomKontakt(aktuellerKunde.value.name, neu);
  aktuellerKunde.value = {
    ...aktuellerKunde.value,
    ansprechpartner: [...(aktuellerKunde.value.ansprechpartner || []), neu],
  };
  localRfq.value.ansprechpartner_name = neu.name;
  showNeuerKontakt.value = false;
  neuerKontakt.value = { name: '', email: '', telefon: '' };
  emits('kunden-changed');
}

const emits = defineEmits(['update:rfq', 'save', 'create-erpnext-quotation', 'preview-pdf', 'send-email', 'update:bildImPdf', 'kunden-changed']);

function formatZeitpunkt(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const localRfq = computed({
  get() {
    return props.rfq;
  },
  set(value) {
    emits('update:rfq', value);
  },
});

const weekNumber = computed(() => getISOWeek(props.rfq.date));

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + i - 1);

const kwYear = ref(currentYear);
const selectedKw = ref('');

watch(() => props.rfq.date, (date) => {
  if (!date) {
    selectedKw.value = '';
    return;
  }
  const w = getISOWeek(date);
  if (w != null) selectedKw.value = w;
  const y = new Date(date).getFullYear();
  if (yearOptions.includes(y)) kwYear.value = y;
}, { immediate: true });

function openDatePicker(e) {
  if (e.target && typeof e.target.showPicker === 'function') {
    try { e.target.showPicker(); } catch (err) { /* ignore */ }
  }
}

function onKwSelect() {
  if (!selectedKw.value) return;
  const w = Number(selectedKw.value);
  const y = Number(kwYear.value);
  const newDate = getMondayOfISOWeek(y, w);
  if (localRfq.value) localRfq.value.date = newDate;
}
</script>
