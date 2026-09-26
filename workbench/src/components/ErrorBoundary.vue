<template>
  <div class="error-boundary">
    <slot v-if="!errored" />
    <div
      v-else
      class="rounded-xl border border-amber-500/50 bg-amber-950/30 p-4 text-sm text-amber-200 space-y-2"
    >
      <p class="font-semibold">Inhalt konnte nicht geladen werden</p>
      <p class="text-amber-300/90 text-xs">{{ errorMessage }}</p>
      <button
        type="button"
        class="mt-2 rounded-lg bg-amber-800/80 px-3 py-1.5 text-xs font-medium hover:bg-amber-700/80"
        @click="errored = false; errorMessage = ''"
      >
        Erneut versuchen
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue';

const errored = ref(false);
const errorMessage = ref('');

onErrorCaptured((err) => {
  errored.value = true;
  errorMessage.value = err?.message || String(err);
  return false;
});
</script>
