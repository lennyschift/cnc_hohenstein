<template>
  <div class="flex flex-col gap-1 w-full">
    <div class="mb-2">
      <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
        Bauteile
      </p>
    </div>
    <button
      type="button"
      class="flex items-center gap-2 w-full rounded-lg border border-dashed border-slate-600 px-3 py-2 text-left text-xs text-slate-400 hover:border-sky-500 hover:text-sky-300 transition mb-2"
      @click="$emit('add-part')"
    >
      <span class="text-base">+</span>
      Teil hinzufügen
    </button>
    <div
      v-if="!parts.length"
      class="rounded-lg border border-dashed border-slate-700 bg-slate-900/50 px-3 py-6 text-center text-[11px] text-slate-500"
    >
      PDFs oben ablegen – pro PDF wird ein Bauteil angelegt
    </div>
    <button
      v-for="(part, index) in parts"
      :key="part.id"
      type="button"
      class="flex flex-col w-full rounded-lg border overflow-hidden text-left transition mb-1.5"
      :class="
        index === activeIndex
          ? 'border-sky-500 ring-1 ring-sky-500/40'
          : 'border-slate-800 hover:border-slate-600'
      "
      @click="$emit('select', index)"
    >
      <div class="w-full h-24 bg-white overflow-hidden flex items-center justify-center">
        <img
          v-if="part.stepThumbnailDataUrl || part.thumbnailDataUrl"
          :src="part.stepThumbnailDataUrl || part.thumbnailDataUrl"
          alt=""
          class="w-full h-full object-contain"
        />
        <span v-else class="text-xs text-slate-400 font-medium">
          {{ (part.part_name || '?').slice(0, 2) }}
        </span>
      </div>
      <span
        class="px-2 py-1.5 text-[11px] font-medium truncate"
        :class="index === activeIndex ? 'bg-sky-500/10 text-slate-100' : 'bg-slate-900/80 text-slate-300'"
      >
        {{ part.part_name || 'Unbenanntes Teil' }}
      </span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  parts: { type: Array, default: () => [] },
  activeIndex: { type: Number, default: 0 },
});

defineEmits(['select', 'add-part']);
</script>
