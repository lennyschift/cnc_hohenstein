<template>
  <div class="mt-2">
    <p v-if="formulaText" class="text-[10px] text-slate-500 mb-2">
      {{ formulaText }}
    </p>
    <table class="w-full text-xs border-separate border-spacing-y-1">
      <thead>
        <tr class="text-[11px] text-slate-400">
          <th class="text-left px-2 py-1 font-medium">Menge (Staffel)</th>
          <th class="text-center px-2 py-1 font-medium">Stückpreis</th>
          <th class="text-center px-2 py-1 font-medium">
            <input
              :value="extraLabel"
              type="text"
              class="w-20 bg-transparent border-b border-dashed border-slate-600 px-1 py-0.5 text-center text-[11px] text-slate-400 focus:outline-none focus:border-sky-500"
              title="Eigene Beschriftung für diese Spalte (z. B. extern kalkulierter Zuschlag)"
              @focus="$event.target.select()"
              @change="$emit('update:extraLabel', $event.target.value || 'Extra')"
            />
          </th>
          <th class="text-right px-2 py-1 font-medium">Gesamt</th>
          <th class="w-8"></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(tier, idx) in localTiers"
          :key="idx"
          class="bg-slate-900/80 hover:bg-slate-900 transition"
        >
          <td class="px-2 py-1.5 align-middle">
            <input
              v-model.number="tier.qty"
              type="number"
              min="1"
              step="1"
              class="w-16 bg-slate-950/80 border border-slate-700/80 rounded-md px-2 py-1 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
              @focus="$event.target.select()"
            />
          </td>
          <td class="px-2 py-1.5 align-middle text-center">
            <input
              v-model.number="tier.unit_price"
              type="number"
              step="0.01"
              min="0"
              class="w-24 bg-slate-950/80 border border-slate-700/80 rounded-md px-2 py-1 text-center text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              @focus="$event.target.select()"
            />
          </td>
          <td class="px-2 py-1.5 align-middle text-center">
            <input
              v-model.number="tier.extra_price"
              type="number"
              step="0.01"
              min="0"
              class="w-20 bg-slate-950/80 border border-slate-700/80 rounded-md px-2 py-1 text-center text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              :title="`${extraLabel} pro Stück — wird zum Stückpreis addiert`"
              @focus="$event.target.select()"
            />
          </td>
          <td class="px-2 py-1.5 text-right align-middle text-xs text-slate-200">
            {{ formatCurrency(((tier.unit_price || 0) + (tier.extra_price || 0)) * (tier.qty || 0)) }}
          </td>
          <td class="px-1 py-1.5 align-middle">
            <button
              type="button"
              class="text-slate-500 hover:text-red-400 text-sm leading-none"
              title="Staffel entfernen"
              @click="removeTier(idx)"
            >
              ×
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <button
      type="button"
      class="mt-2 text-[11px] text-sky-400 hover:text-sky-300"
      @click="addTier"
    >
      + Staffel hinzufügen
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  priceTiers: {
    type: Array,
    required: true,
  },
  /** Optional: Anzeige der Formel (Rüst + Stück×Menge + Material + Sonder) / Menge */
  formulaText: {
    type: String,
    default: '',
  },
  /** Beschriftung der zusätzlichen "Extra"-Spalte — frei editierbar (siehe Header-Input oben) */
  extraLabel: {
    type: String,
    default: 'Extra',
  },
});

const emits = defineEmits(['update', 'update:extraLabel']);

const localTiers = computed({
  get() {
    return props.priceTiers;
  },
  set(value) {
    emits('update', value);
  },
});

function addTier() {
  const tiers = [...(props.priceTiers || [])];
  const lastQty = tiers.length ? Math.max(1, tiers[tiers.length - 1].qty || 0) : 100;
  tiers.push({ qty: lastQty + 50, unit_price: 0, extra_price: 0 });
  emits('update', tiers);
}

function removeTier(index) {
  const tiers = props.priceTiers.filter((_, i) => i !== index);
  if (tiers.length) emits('update', tiers);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value || 0);
}
</script>
