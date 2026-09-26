<template>
  <article
    class="flex flex-col gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm min-h-[420px]"
  >
    <header class="flex items-center justify-between gap-2 flex-wrap">
      <input
        v-model="localPart.part_name"
        type="text"
        class="flex-1 min-w-[200px] bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
        placeholder="Teilename"
        @change="emitUpdate"
      />
      <div v-if="!localPart.use_staffelpreise" class="flex items-center gap-2">
        <label class="text-[11px] text-slate-400">Stückzahl</label>
        <input
          v-model.number="localPart.stueckzahl"
          type="number"
          min="1"
          step="1"
          class="w-20 bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-2 text-sm text-slate-100 text-center font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
          @focus="selectAll"
          @change="emitUpdate"
        />
      </div>
      <span v-else class="text-[11px] text-slate-500 italic">Staffelpreise aktiv</span>
      <span
        class="inline-flex items-center rounded-full bg-slate-900 border border-slate-700/80 px-2 py-1 text-[11px] text-slate-400"
      >
        Bauteil
      </span>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10 px-2.5 py-1 text-[11px] transition"
        title="Dieses Bauteil löschen"
        @click="$emit('delete')"
      >
        🗑 Löschen
      </button>
    </header>

    <!-- Stammdaten -->
    <section class="border-t border-slate-800 pt-4">
      <h3 class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
        Stammdaten
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Teilenummer</label>
          <input
            v-model="localPart.teilenummer"
            type="text"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="z. B. T-1024"
            @change="emitUpdate"
          />
        </div>
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Zeichnungsnummer</label>
          <input
            v-model="localPart.zeichnungsnummer"
            type="text"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="z. B. 80976"
            @change="emitUpdate"
          />
        </div>
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Artikelname</label>
          <input
            v-model="localPart.artikelname"
            type="text"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="z. B. Buchse Seitenausleger 2"
            @change="emitUpdate"
          />
        </div>
        <div class="flex items-end">
          <label class="flex items-center gap-2 cursor-pointer select-none py-1.5">
            <input
              v-model="localPart.is_serial"
              type="checkbox"
              class="w-3.5 h-3.5 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
              @change="emitUpdate"
            />
            <span class="text-[11px] text-slate-400">Seriennummer vergeben</span>
          </label>
        </div>
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Liefertermin</label>
          <input
            v-model="localPart.delivery_date"
            type="date"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            @click="openDatePicker"
            @change="emitUpdate"
          />
        </div>
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Zeichnungsdatum</label>
          <input
            v-model="localPart.zeichnungsdatum"
            type="date"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            @click="openDatePicker"
            @change="emitUpdate"
          />
        </div>
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Kalenderwoche</label>
          <div class="flex items-center gap-2">
            <select
              v-model="kwSelect"
              class="flex-1 min-w-0 bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              @change="onKwSelect"
            >
              <option value="">KW wählen</option>
              <option v-for="w in 53" :key="w" :value="w">{{ w }}</option>
            </select>
            <span v-if="partWeekNumber != null" class="text-[11px] text-slate-300 whitespace-nowrap">
              KW {{ partWeekNumber }}
            </span>
          </div>
          <p v-if="kwRange" class="text-[10px] text-slate-500">{{ kwRange }}</p>
        </div>
        <div class="space-y-1">
          <label class="flex items-center gap-1.5 text-[11px] text-slate-400">
            Oberfläche
            <span
              v-if="materialSuggestion?.surface"
              class="text-red-500 font-bold text-sm leading-none"
              title="In Zeichnung erkannt, aber noch nicht übernommen"
            >!</span>
          </label>
          <div class="flex gap-2">
            <input
              v-model="localPart.oberflaeche"
              type="text"
              :class="[localPart.oberflaeche ? 'w-24 flex-shrink-0' : 'flex-1', localPart.oberflaeche ? 'text-red-400 font-semibold' : 'text-slate-100']"
              class="min-w-0 bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="z. B. eloxiert, HartCoat"
              title="Oberflächenbeschichtung — rot markiert, da fertigungsrelevant und leicht übersehen"
              @change="emitUpdate"
            />
            <input
              v-if="localPart.oberflaeche"
              v-model="localPart.oberflaechen_info"
              type="text"
              class="flex-1 min-w-0 bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Zusatzinfo (erscheint im PDF), z. B. nur Außenflächen"
              @change="emitUpdate"
            />
            <button
              type="button"
              class="flex-shrink-0 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-100 hover:border-sky-500 transition"
              @click="showSurfacePicker = true"
            >
              Wählen ▾
            </button>
          </div>
        </div>
      </div>
      <div class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Konstrukteur</label>
          <input
            v-model="localPart.konstrukteur_name"
            type="text"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="Name (für QS/Rückverfolgung)"
            @change="emitUpdate"
          />
        </div>
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">E-Mail</label>
          <input
            v-model="localPart.konstrukteur_email"
            type="text"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="z. B. name@kunde.de"
            @change="emitUpdate"
          />
        </div>
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Telefon</label>
          <input
            v-model="localPart.konstrukteur_telefon"
            type="text"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="z. B. 08231 ..."
            @change="emitUpdate"
          />
        </div>
      </div>
      <div class="mt-3 space-y-1">
        <label class="block text-[11px] text-slate-400">Notiz (Bauteil)</label>
        <textarea
          v-model="localPart.notiz"
          rows="2"
          class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 resize-none focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="Hinweise zu diesem Bauteil (Toleranzen, Sonderwünsche, Rücksprache...)"
          @change="emitUpdate"
        />
      </div>
    </section>

    <!-- Bearbeitung & Kosten (bewusst weit oben, vor der Zeichnung — schneller sichtbar) -->
    <section class="border-t border-slate-800 pt-4">
      <h3 class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
        Bearbeitung & Kosten
      </h3>

      <!-- Maschine + Stundensatz -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Maschine</label>
          <select
            v-model="localPart.machine"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            @change="onMaschineChange"
          >
            <option value="">Maschine wählen</option>
            <option v-for="m in MASCHINEN" :key="m">{{ m }}</option>
          </select>
        </div>
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Stundensatz (€/h)</label>
          <input
            v-model.number="localPart.stundensatz"
            type="number"
            min="0"
            step="0.5"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
            @focus="selectAll"
            @input="onStundensatzChange"
          />
        </div>
      </div>

      <!-- Rüstkosten = Rüstzeit × Stundensatz (Ergebnis bleibt direkt überschreibbar) -->
      <div class="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-2 items-end text-xs mt-3">
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Rüstzeit (min)</label>
          <input
            v-model.number="localPart.ruestzeit_min"
            type="number" min="0" step="1"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
            @focus="selectAll" @input="onRuestzeitChange"
          />
        </div>
        <span class="pb-2 text-slate-500">×</span>
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Stundensatz</label>
          <input
            v-model.number="localPart.ruestzeit_stundensatz"
            type="number" min="0" step="0.5"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
            @focus="selectAll" @input="onRuestzeitStundensatzChange"
          />
        </div>
        <span class="pb-2 text-slate-500">=</span>
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Rüstkosten (€)</label>
          <input
            v-model.number="localPart.setup_cost"
            type="number" min="0" step="0.01"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
            @focus="selectAll" @input="emitCostUpdate"
          />
        </div>
      </div>

      <!-- Stückkosten = Stückzeit × Stundensatz -->
      <div class="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-2 items-end text-xs mt-3">
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Stückzeit (min)</label>
          <input
            v-model.number="localPart.stueckzeit_min"
            type="number" min="0" step="1"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
            @focus="selectAll" @input="onStueckzeitChange"
          />
        </div>
        <span class="pb-2 text-slate-500">×</span>
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Stundensatz</label>
          <input
            v-model.number="localPart.stueckzeit_stundensatz"
            type="number" min="0" step="0.5"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
            @focus="selectAll" @input="onStueckzeitStundensatzChange"
          />
        </div>
        <span class="pb-2 text-slate-500">=</span>
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Stückkosten (€/Stk.)</label>
          <input
            v-model.number="localPart.unit_cost"
            type="number" min="0" step="0.01"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
            @focus="selectAll" @input="emitCostUpdate"
          />
        </div>
      </div>

      <!-- Programmierdauer (nur zur zeitlichen Nachverfolgung, fließt nicht in die Kalkulation ein) | Rüstkosten in Stückpreis einrechnen -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-3 items-end">
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Programmierdauer (min)</label>
          <input
            v-model.number="localPart.programmierdauer_min"
            type="number" min="0" step="1"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
            @focus="selectAll" @input="emitCostUpdate"
          />
        </div>
        <label class="flex items-center gap-1.5 cursor-pointer select-none pb-1.5">
          <input
            v-model="localPart.ruestkosten_in_stueckpreis"
            type="checkbox"
            class="w-3.5 h-3.5 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
            @change="emitCostUpdate"
          />
          <span class="text-[10px] text-slate-400">
            {{ localPart.ruestkosten_in_stueckpreis ? 'Rüstkosten in Stückpreis eingerechnet' : 'Rüstkosten in Stückpreis einrechnen (statt eigener Zeile)' }}
          </span>
        </label>
      </div>

      <!-- Messkosten (links) | Sonderkosten + Expresskosten (rechts, Text direkt darunter) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-3">
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Messkosten (€)</label>
          <input
            v-model.number="localPart.messkosten"
            type="number" min="0" step="0.01"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
            @focus="selectAll" @input="emitCostUpdate"
          />
          <label
            v-if="localPart.messkosten > 0"
            class="flex items-center gap-1.5 cursor-pointer select-none"
          >
            <input
              v-model="localPart.messkosten_in_stueckpreis"
              type="checkbox"
              class="w-3.5 h-3.5 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
              @change="emitUpdate"
            />
            <span class="text-[10px] text-slate-400">
              {{ localPart.messkosten_in_stueckpreis ? 'In (Staffel-)Stückpreis eingerechnet' : 'Als eigene Position im PDF' }}
            </span>
          </label>
        </div>
        <div class="space-y-3">
          <div class="space-y-1">
            <label class="block text-[11px] text-slate-400">Sonderkosten (€)</label>
            <input
              v-model.number="localPart.sonderkosten"
              type="number" min="0" step="0.01"
              class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
              @focus="selectAll" @input="emitCostUpdate"
            />
            <input
              v-if="localPart.sonderkosten > 0"
              v-model="localPart.sonder_text"
              type="text"
              class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Text für PDF, z. B. Wärmebehandlung extern"
              @change="emitUpdate"
            />
            <label
              v-if="localPart.sonderkosten > 0"
              class="flex items-center gap-1.5 cursor-pointer select-none"
            >
              <input
                v-model="localPart.sonderkosten_in_stueckpreis"
                type="checkbox"
                class="w-3.5 h-3.5 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
                @change="emitUpdate"
              />
              <span class="text-[10px] text-slate-400">
                {{ localPart.sonderkosten_in_stueckpreis ? 'In (Staffel-)Stückpreis eingerechnet' : 'Als eigene Position im PDF' }}
              </span>
            </label>
          </div>
          <div class="space-y-1">
            <label class="block text-[11px] text-slate-400">Expresskosten (€)</label>
            <input
              v-model.number="localPart.expresskosten"
              type="number" min="0" step="0.01"
              class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
              @focus="selectAll" @input="emitCostUpdate"
            />
            <input
              v-if="localPart.expresskosten > 0"
              v-model="localPart.express_text"
              type="text"
              class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Text für PDF, z. B. Lieferung in 5 Arbeitstagen"
              @change="emitUpdate"
            />
            <label
              v-if="localPart.expresskosten > 0"
              class="flex items-center gap-1.5 cursor-pointer select-none"
            >
              <input
                v-model="localPart.expresskosten_in_stueckpreis"
                type="checkbox"
                class="w-3.5 h-3.5 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
                @change="emitUpdate"
              />
              <span class="text-[10px] text-slate-400">
                {{ localPart.expresskosten_in_stueckpreis ? 'In (Staffel-)Stückpreis eingerechnet' : 'Als eigene Position im PDF' }}
              </span>
            </label>
          </div>
        </div>
      </div>

      <div class="mt-3 text-xs">
        <p class="text-[11px] text-slate-400">
          Kostenübersicht {{ localPart.use_staffelpreise ? '(erste Staffel)' : `(${localPart.stueckzahl || 1} Stk.)` }}
        </p>
        <p class="text-sm font-semibold text-sky-400">
          {{ firstTierPrice }}
        </p>
      </div>
    </section>

    <!-- Staffelpreise -->
    <section class="border-t border-slate-800 pt-4">
      <div class="flex items-center gap-3 mb-2">
        <h3 class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
          Staffelpreise
        </h3>
        <label class="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            v-model="localPart.use_staffelpreise"
            type="checkbox"
            class="w-3.5 h-3.5 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
            @change="emitUpdate"
          />
          <span class="text-[11px] text-slate-400">Staffelpreise verwenden</span>
        </label>
        <button
          v-if="localPart.use_staffelpreise"
          type="button"
          class="text-[11px] text-sky-400 hover:text-sky-300 font-medium"
          title="Füllt den Stückpreis jeder Staffel aus Rüstkosten/Stückkosten/Material/Pauschal (Formel s. u.) — Menge und Extra bleiben unangetastet"
          @click="staffelpreiseNeuBerechnen"
        >
          🔄 Stückpreise neu berechnen
        </button>
      </div>
      <template v-if="localPart.use_staffelpreise">
        <PriceTable
          :price-tiers="safePriceTiers"
          :formula-text="formulaText"
          :extra-label="localPart.staffel_extra_label || 'Extra'"
          @update="onPriceTiersUpdate"
          @update:extra-label="emits('update', { ...props.part, staffel_extra_label: $event })"
        />
      </template>
      <p v-else class="text-[11px] text-slate-500">
        Staffelpreise deaktiviert. Es wird nur der Einzelpreis verwendet.
      </p>
    </section>

    <!-- PDF-Zeichnung -->
    <section class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <h3 class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
          PDF-Zeichnung
        </h3>
        <div v-if="localPart.pdfFile" class="flex items-center gap-3">
          <button
            type="button"
            class="text-xs text-slate-400 hover:text-slate-200 font-medium"
            @click="openPdfInBrowser"
          >
            Im Browser öffnen
          </button>
          <button
            type="button"
            class="text-xs text-sky-400 hover:text-sky-300 font-medium"
            @click="openPdfModal"
          >
            PDF vergrößern
          </button>
        </div>
      </div>
      <div
        class="min-h-[420px] rounded-xl overflow-hidden border border-slate-800 cursor-pointer"
        @click="localPart.pdfFile && openPdfModal()"
      >
        <DrawingViewer
          :initial-file="localPart.pdfFile"
          :markup="pdfMarkup"
          @update:markup="pdfMarkup = $event"
          @loaded="onDrawingLoaded"
          @material-detected="onMaterialDetected"
          @kein-text-gefunden="keinTextGefunden = true"
        />
      </div>

      <p
        v-if="keinTextGefunden"
        class="rounded-lg border border-amber-800/60 bg-amber-950/20 p-3 text-[11px] text-amber-200"
      >
        ⚠️ In dieser PDF wurde kein durchsuchbarer Text gefunden — vermutlich eine gescannte/rasterisierte
        Zeichnung statt einer "echten" Vektor-PDF. Automatische Erkennung (Material, Zustand, Zeichnungsdatum,
        Gewicht) kann hier grundsätzlich nicht funktionieren, unabhängig davon was gesucht wird. Bitte manuell eintragen.
      </p>

      <!-- Material-Vorschlag aus der Zeichnung (Text-Erkennung, rein lokal) -->
      <div
        v-if="materialSuggestion"
        class="rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-3 text-xs flex items-center justify-between gap-3 flex-wrap"
      >
        <div class="text-slate-200">
          <template v-if="materialSuggestion.material">
            <span class="text-emerald-300 font-semibold">Material erkannt:</span>
            {{ materialSuggestion.material?.name || '–' }}
          </template>
          <span v-if="materialSuggestion.condition" class="text-slate-400">· Zustand: {{ materialSuggestion.condition }}</span>
          <span v-if="materialSuggestion.surface" class="text-slate-400">· Oberfläche: {{ materialSuggestion.surface }}<template v-if="materialSuggestion.surfaceColor"> ({{ materialSuggestion.surfaceColor }})</template></span>
          <span v-if="materialSuggestion.mechValues" class="text-slate-400">· Werte: {{ materialSuggestion.mechValues }}</span>
          <span v-if="materialSuggestion.zeichnungsdatum" class="text-slate-400">· Zeichnungsdatum: {{ materialSuggestion.zeichnungsdatum }}</span>
          <span v-if="materialSuggestion.gewicht" class="text-slate-400">· Gewicht laut Zeichnung: {{ materialSuggestion.gewicht }} kg</span>
          <span v-if="materialSuggestion.konstrukteur" class="text-slate-400">
            · Konstrukteur: {{ materialSuggestion.konstrukteur.name || '–' }}<template v-if="materialSuggestion.konstrukteur.email"> ({{ materialSuggestion.konstrukteur.email }})</template>
          </span>
          <span v-if="materialSuggestion.matchedText" class="text-slate-500"> (Fundstelle: „{{ materialSuggestion.matchedText }}")</span>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            class="rounded bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 text-[11px] font-medium transition"
            @click="applyMaterialSuggestion"
          >
            Übernehmen
          </button>
          <button
            type="button"
            class="rounded border border-slate-600 text-slate-300 px-2 py-1 text-[11px] hover:border-slate-400 transition"
            @click="materialSuggestion = null"
          >
            Verwerfen
          </button>
        </div>
      </div>
    </section>


    <!-- Material (links) + 3D-Vorschau (rechts) -->
    <section class="border-t border-slate-800 pt-4">
    <div class="flex flex-col lg:flex-row gap-5">
    <div class="lg:w-[360px] flex-shrink-0">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <h3 class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Material</h3>
          <div class="relative">
            <button
              type="button"
              class="flex items-center gap-1 rounded border border-slate-600 px-1.5 py-0.5 hover:border-sky-500 transition"
              @click="showKlasseMenu = !showKlasseMenu"
            >
              <span
                v-if="localPart.material_class"
                class="inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold text-slate-900"
                :style="{ background: localPart.material_class.color }"
              >{{ localPart.material_class.key }}</span>
              <span class="text-[11px] text-slate-300">{{ localPart.material_class ? localPart.material_class.label : 'Klasse wählen' }}</span>
              <span class="text-slate-500 text-[9px]">▼</span>
            </button>
            <div
              v-if="showKlasseMenu"
              class="absolute z-20 mt-1 w-44 rounded-lg border border-slate-700 bg-slate-900 shadow-lg py-1"
            >
              <button
                v-for="k in MATERIALKLASSEN"
                :key="k.key"
                type="button"
                class="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-slate-800 transition"
                @click="selectKlasse(k)"
              >
                <span
                  class="inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold text-slate-900"
                  :style="{ background: k.color }"
                >{{ k.key }}</span>
                <span class="text-[11px] text-slate-200">{{ k.label }}</span>
              </button>
            </div>
          </div>
        </div>
        <label class="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            v-model="localPart.waz"
            type="checkbox"
            class="w-3.5 h-3.5 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
            @change="emitUpdate"
          />
          <span class="text-[11px] text-slate-300">WAZ – Materialzeugnis</span>
        </label>
      </div>

      <!-- Fertigteil (exakt, aus STEP-Volumen via OCCT — nicht geschätzt) -->
      <div
        v-if="localPart.exakt_volumen_mm3 || volumenWirdBerechnet"
        class="mb-3 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3 text-xs space-y-1"
      >
        <span class="text-[11px] font-semibold text-emerald-300 uppercase tracking-wide">Fertigteil (exakt)</span>
        <p v-if="volumenWirdBerechnet" class="text-slate-400">Volumen wird berechnet…</p>
        <template v-else>
          <p class="text-slate-300">
            Volumen: <span class="text-slate-100 font-medium">{{ (localPart.exakt_volumen_mm3 / 1000).toFixed(2) }} cm³</span>
            <span class="text-slate-500"> · Oberfläche: {{ (localPart.exakt_oberflaeche_mm2 / 100).toFixed(2) }} cm²</span>
          </p>
          <p v-if="fertigteilGewichtKg != null" class="text-slate-300">
            Gewicht Fertigteil: <span class="text-slate-100 font-medium">{{ fertigteilGewichtKg.toFixed(3) }} kg</span>
          </p>
          <p v-else class="text-[10px] text-slate-500">Material wählen, um das Fertigteil-Gewicht zu sehen.</p>
        </template>
      </div>

      <!-- Rohmaterial direkt unter der Überschrift -->
      <div v-if="rohmaterial" class="mb-3 rounded-lg border border-sky-900/50 bg-sky-950/20 p-3 text-xs space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold text-sky-300 uppercase tracking-wide">Rohmaterial aus STEP</span>
          <label class="flex items-center gap-1.5 text-[11px] text-slate-400">
            Aufmaß/Seite (mm)
            <input
              v-model.number="localPart.aufmass"
              type="number" min="0" step="0.5"
              class="w-14 bg-slate-950/80 border border-slate-700/80 rounded px-1.5 py-1 text-center text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              @focus="selectAll" @change="emitUpdate"
            />
          </label>
        </div>
        <p class="text-slate-300">Bauteilmaß: <span class="text-slate-100 font-medium">{{ rohmaterial.mass }}</span></p>
        <div class="grid grid-cols-1 gap-2">
          <div class="rounded bg-slate-900/60 px-2 py-1.5">
            <p class="text-[10px] text-slate-500">Quader-Zuschnitt</p>
            <p class="text-slate-100 font-medium">{{ rohmaterial.quaderExakt }}</p>
            <p class="text-[10px] text-sky-300">aufgerundet: {{ rohmaterial.quaderCeil }}</p>
            <p v-if="rohmaterial.gewQuader" class="text-[10px] text-slate-400">≈ {{ rohmaterial.gewQuader }} kg</p>
            <button
              type="button"
              class="mt-1 text-[10px] text-sky-400 hover:text-sky-300 font-medium"
              @click="uebernehmeRohmaterial('Flach')"
            >
              → in Materialfelder übernehmen
            </button>
          </div>
          <div class="rounded bg-slate-900/60 px-2 py-1.5">
            <p class="text-[10px] text-slate-500">Rundmaterial</p>
            <p class="text-slate-100 font-medium">{{ rohmaterial.rundExakt }}</p>
            <p class="text-[10px] text-sky-300">aufgerundet: {{ rohmaterial.rundCeil }}</p>
            <p v-if="rohmaterial.gewRund" class="text-[10px] text-slate-400">≈ {{ rohmaterial.gewRund }} kg</p>
            <button
              type="button"
              class="mt-1 text-[10px] text-sky-400 hover:text-sky-300 font-medium"
              @click="uebernehmeRohmaterial('Rund')"
            >
              → in Materialfelder übernehmen
            </button>
          </div>
        </div>
        <p class="text-[10px] text-slate-500">Aus achsenparalleler Bounding Box — bei schräg modellierten Teilen bitte prüfen.</p>
      </div>

      <div class="grid grid-cols-1 gap-3 text-xs">
        <!-- Material + Aus Lager + Dropdown (Erkennungs-DB) -->
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Material / Rohmaterial</label>
          <div class="flex gap-2">
            <input
              v-model="localPart.material"
              type="text"
              class="flex-1 min-w-0 bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Material / Rohmaterial"
              @change="emitUpdate"
            />
            <button
              type="button"
              class="flex-shrink-0 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-100 hover:border-sky-500 transition"
              @click="showMaterialClassPicker = true"
            >
              Wählen ▾
            </button>
            <button
              type="button"
              class="flex-shrink-0 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-100 hover:border-sky-500 transition"
              @click="showMaterialModal = true"
            >
              Aus Lager
            </button>
          </div>
          <p v-if="localPart.material_code" class="text-[10px] text-emerald-400">
            {{ localPart.material_code }}
            <span v-if="localPart.material_preis_kg" class="text-slate-500">
              · {{ localPart.material_preis_kg.toFixed(2) }} €/kg · {{ localPart.material_dichte }} g/cm³
            </span>
          </p>
          <label class="flex items-center gap-1.5 cursor-pointer select-none pt-1">
            <input
              v-model="localPart.material_im_pdf"
              type="checkbox"
              class="w-3.5 h-3.5 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
              @change="emitUpdate"
            />
            <span class="text-[10px] text-slate-400">Material (Sorte, Zustand, Oberfläche) im PDF anzeigen</span>
          </label>
        </div>
        <!-- Zustand -->
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Zustand</label>
          <input
            v-model="localPart.zustand"
            type="text"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="z. B. vergütet (+QT), T651, H1025"
            @change="emitUpdate"
          />
        </div>
        <!-- Materialwerte (mechanische Werte aus Zeichnung, informativ) -->
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Materialwerte</label>
          <input
            v-model="localPart.materialwerte"
            type="text"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="z. B. Rm=800-950 MPa, Rp0.2>600 MPa, A5>14%, Z>55%"
            @change="emitUpdate"
          />
        </div>
        <!-- Rohmaterial-Form (Kacheln, wie Lager-Übersicht) -->
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Rohmaterial-Form</label>
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition"
              :class="localPart.material_form !== 'Flach' ? 'bg-sky-500 text-slate-950 border-sky-500' : 'bg-slate-950/80 border-slate-700/80 text-slate-300 hover:border-sky-500'"
              @click="setMaterialForm('Rund')"
            >
              ○ Rund
            </button>
            <button
              type="button"
              class="flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition"
              :class="localPart.material_form === 'Flach' ? 'bg-sky-500 text-slate-950 border-sky-500' : 'bg-slate-950/80 border-slate-700/80 text-slate-300 hover:border-sky-500'"
              @click="setMaterialForm('Flach')"
            >
              ▭ Flach
            </button>
          </div>
        </div>
        <!-- Durchmesser (Rund) -->
        <div v-if="localPart.material_form !== 'Flach'" class="space-y-1">
          <label class="block text-[11px] text-slate-400">Durchmesser (mm)</label>
          <input
            v-model.number="localPart.material_durchmesser"
            type="number"
            min="0"
            step="0.1"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="0"
            @focus="selectAll"
            @input="onLaengeInput"
          />
        </div>
        <!-- Höhe + Breite (Flach) -->
        <template v-else>
          <div class="space-y-1">
            <label class="block text-[11px] text-slate-400">Höhe (mm)</label>
            <input
              v-model.number="localPart.material_hoehe"
              type="number"
              min="0"
              step="0.1"
              class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="0"
              @focus="selectAll"
              @input="onLaengeInput"
            />
          </div>
          <div class="space-y-1">
            <label class="block text-[11px] text-slate-400">Breite (mm)</label>
            <input
              v-model.number="localPart.material_breite"
              type="number"
              min="0"
              step="0.1"
              class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="0"
              @focus="selectAll"
              @input="onLaengeInput"
            />
          </div>
        </template>
        <!-- Länge -->
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Rohlänge (mm)</label>
          <input
            v-model.number="localPart.laenge_mm"
            type="number"
            min="0"
            step="0.1"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="0"
            @focus="selectAll"
            @input="onLaengeInput"
          />
        </div>
        <!-- Gewicht (berechnet) -->
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Gewicht (kg)</label>
          <input
            :value="localPart.gewicht_kg ? localPart.gewicht_kg.toFixed(3) : '–'"
            type="text"
            readonly
            class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-400 text-center cursor-default"
          />
        </div>
        <!-- Materialkosten pro St. -->
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">Materialkosten pro St. (€)</label>
          <input
            v-model.number="localPart.material_cost"
            type="number"
            min="0"
            step="0.01"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
            @focus="selectAll"
            @input="emitCostUpdate"
          />
        </div>
        <!-- Pauschal Materialkosten -->
        <div class="space-y-1">
          <label class="block text-[11px] text-slate-400">
            Pauschal Materialkosten (€)
          </label>
          <input
            v-model.number="localPart.pauschal_material"
            type="number"
            min="0"
            step="0.01"
            class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
            @focus="selectAll"
            @input="emitCostUpdate"
          />
          <label class="flex items-center gap-1.5 cursor-pointer select-none pt-1">
            <input
              v-model="localPart.pauschal_als_zeile"
              type="checkbox"
              class="w-3.5 h-3.5 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
              @change="emitCostUpdate"
            />
            <span class="text-[10px] text-slate-400">
              {{ localPart.pauschal_als_zeile ? 'Als eigene Zeile im PDF' : 'In Stückpreis einrechnen' }}
            </span>
          </label>
        </div>
      </div>
      <p class="text-[11px] text-slate-400 mt-3">
        Gesamt Material:
        <span class="text-slate-100 font-semibold">{{ formatEuro(gesamtMaterial) }}</span>
        <span class="text-slate-500">
          ({{ localPart.stueckzahl || 1 }} St. × {{ formatEuro(localPart.material_cost || 0) }}
          <template v-if="localPart.pauschal_material"> + {{ formatEuro(localPart.pauschal_material) }} pauschal</template>)
        </span>
      </p>
    </div>

    <!-- 3D-Vorschau rechts -->
    <div class="flex-1 min-w-0 flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <h3 class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
          3D-Vorschau (STEP/STL/GLB)
        </h3>
        <div class="flex items-center gap-3">
          <button
            v-if="open3d"
            type="button"
            class="text-xs text-sky-400 hover:text-sky-300 font-medium"
            @click="show3DModal = true"
          >
            3D Viewer öffnen
          </button>
          <button
            type="button"
            class="text-xs text-slate-400 hover:text-slate-200 font-medium"
            @click="open3d = !open3d"
          >
            {{ open3d ? 'Einklappen' : 'Einblenden / STEP laden' }}
          </button>
        </div>
      </div>
      <div
        v-if="open3d"
        class="rounded-xl overflow-hidden border border-slate-800 resize-y w-full"
        style="height: 432px; min-height: 240px;"
        title="Unten rechts ziehen, um den Viewer zu vergrößern"
      >
        <ModelViewer
          :initial-file="localPart.stepFile"
          :material-class="localPart.material_class"
          :oberflaeche="localPart.oberflaeche"
          :aufmass="Number(localPart.aufmass) || 0"
          :flaechen="exakteFlaechen"
          :kanten="exakteKanten"
          :kanten-laden="volumenWirdBerechnet"
          @loaded="onModelLoaded"
          @thumbnail="onModelThumbnail"
          @dimensions="onModelDimensions"
        />
      </div>
      <div
        v-else
        class="rounded-xl border border-dashed border-slate-800 px-3 py-3 text-[11px] text-slate-500"
      >
        Keine 3D-Datei. Wird automatisch angezeigt, sobald eine STEP/STL/GLB hochgeladen wird – oder auf „Einblenden" klicken.
      </div>
    </div>
    </div>
    </section>

    <!-- Modal: PDF groß -->
    <Teleport to="body">
      <div
        v-if="showPdfModal"
        class="fixed inset-0 z-50 flex flex-col bg-black"
      >
        <div class="relative w-full h-full flex flex-col">
          <div class="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
            <span class="text-sm text-slate-300">PDF – {{ localPart.part_name || 'Zeichnung' }}</span>
            <button
              type="button"
              class="text-slate-400 hover:text-white text-2xl leading-none"
              @click="closePdfModal"
            >
              ×
            </button>
          </div>
          <div class="flex-1 min-h-0 bg-slate-950/40">
            <DrawingViewer
              v-if="showPdfModal"
              :initial-file="localPart.pdfFile"
              :zoomable="true"
              :markup="pdfMarkup"
              @update:markup="pdfMarkup = $event"
            />
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal: 3D Viewer groß -->
    <Teleport to="body">
      <div
        v-if="show3DModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        @click.self="show3DModal = false"
      >
        <div class="relative w-full max-w-5xl h-[88vh] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl flex flex-col">
          <div class="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
            <span class="text-sm text-slate-300">3D Viewer – {{ localPart.part_name || 'Bauteil' }}</span>
            <button
              type="button"
              class="text-slate-400 hover:text-white text-2xl leading-none"
              @click="show3DModal = false"
            >
              ×
            </button>
          </div>
          <div class="flex-1 min-h-0">
            <ModelViewer
              v-if="show3DModal"
              :initial-file="localPart.stepFile"
              :material-class="localPart.material_class"
              :oberflaeche="localPart.oberflaeche"
              :flaechen="exakteFlaechen"
              :kanten="exakteKanten"
              :kanten-laden="volumenWirdBerechnet"
              class="h-full w-full"
            />
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal: Material aus Lager wählen -->
    <Teleport to="body">
      <div
        v-if="showMaterialModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        @click.self="showMaterialModal = false"
      >
        <div class="relative w-full max-w-4xl h-[80vh] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl">
          <MaterialFilter
            @select="onMaterialSelect"
            @close="showMaterialModal = false"
          />
        </div>
      </div>
    </Teleport>

    <!-- Modal: Material-Klasse/Werkstoff-Dropdown (Erkennungs-DB, gruppiert nach Klasse) -->
    <Teleport to="body">
      <div
        v-if="showMaterialClassPicker"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        @click.self="showMaterialClassPicker = false"
      >
        <div class="relative w-full max-w-3xl h-[75vh] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl">
          <MaterialClassPicker
            @select="onMaterialClassPicked"
            @close="showMaterialClassPicker = false"
          />
        </div>
      </div>
    </Teleport>

    <!-- Modal: Oberfläche wählen -->
    <Teleport to="body">
      <div
        v-if="showSurfacePicker"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        @click.self="showSurfacePicker = false"
      >
        <div class="relative w-full max-w-md h-[60vh] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl">
          <SurfacePicker
            @select="onSurfacePicked"
            @close="showSurfacePicker = false"
          />
        </div>
      </div>
    </Teleport>
  </article>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { getISOWeek, getMondayOfISOWeek } from '../utils/dateWeek.js';
import DrawingViewer from './DrawingViewer.vue';
import ModelViewer from './ModelViewer.vue';
import PriceTable from './PriceTable.vue';
import MaterialFilter from './MaterialFilter.vue';
import MaterialClassPicker from './MaterialClassPicker.vue';
import SurfacePicker from './SurfacePicker.vue';
import { MATERIAL_CLASSES as MATERIALKLASSEN } from '../utils/materialRecognition.js';
import { MASCHINEN, getStundensatzFuerMaschine, merkeStundensatzFuerMaschine } from '../utils/maschinenStundensatz.js';
import { berechneVolumenUndOberflaeche } from '../utils/occtMeasure.js';
import { analysiereFlaechen } from '../utils/occtFaceMeasure.js';
import { holeAusAnalyseCache, schreibeInAnalyseCache } from '../utils/analyseCache.js';
import { planeAnalyse } from '../utils/analyseQueue.js';

const props = defineProps({
  part: {
    type: Object,
    required: true,
  },
});

const emits = defineEmits(['update', 'delete']);

const show3DModal = ref(false);
const showPdfModal = ref(false);
const showMaterialModal = ref(false);

const localPart = computed(() => props.part);

const formulaText = computed(() => {
  return '"Neu berechnen" füllt: Stückpreis = (Rüstkosten + Pauschal) ÷ Menge + Stückkosten + Material/St. — '
    + 'Mess-/Sonder-/Expresskosten je nach Haken oben separat auf dem PDF oder automatisch mit eingerechnet.';
});

// 3D-Viewer: standardmäßig eingeklappt, automatisch ausklappen sobald STEP geladen
const open3d = ref(false);
watch(
  () => props.part?.stepFile,
  (file) => { if (file) open3d.value = true; },
  { immediate: true },
);

const partWeekNumber = computed(() => getISOWeek(props.part?.delivery_date));

const kwSelect = ref('');
watch(
  () => props.part?.delivery_date,
  (d) => { kwSelect.value = d ? (getISOWeek(d) || '') : ''; },
  { immediate: true },
);

function onKwSelect() {
  if (!kwSelect.value) return;
  const year = props.part.delivery_date
    ? new Date(props.part.delivery_date).getFullYear()
    : new Date().getFullYear();
  const monday = getMondayOfISOWeek(year, Number(kwSelect.value));
  emits('update', { ...props.part, delivery_date: monday });
}

// Tagespanne (Mo–So) der aktuellen Kalenderwoche
const kwRange = computed(() => {
  const w = partWeekNumber.value;
  if (!w) return '';
  const year = props.part.delivery_date
    ? new Date(props.part.delivery_date).getFullYear()
    : new Date().getFullYear();
  const monday = new Date(getMondayOfISOWeek(year, w));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
});

// Nativen Kalender beim Klick ins Datumsfeld öffnen
function openDatePicker(e) {
  if (e.target && typeof e.target.showPicker === 'function') {
    try { e.target.showPicker(); } catch (err) { /* ignore */ }
  }
}

const safePriceTiers = computed(() => {
  const t = props.part?.price_tiers;
  return Array.isArray(t) && t.length ? t : [
    { qty: 5, unit_price: 0, extra_price: 0 },
    { qty: 25, unit_price: 0, extra_price: 0 },
    { qty: 50, unit_price: 0, extra_price: 0 },
    { qty: 100, unit_price: 0, extra_price: 0 },
  ];
});

function formatEuro(value) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

const gesamtMaterial = computed(() => {
  const p = props.part;
  const proSt = Number(p.material_cost) || 0;
  const qty = Math.max(1, Number(p.stueckzahl) || 1);
  const pauschal = Number(p.pauschal_material) || 0;
  return proSt * qty + pauschal;
});

const firstTierPrice = computed(() => {
  const p = props.part;
  if (!p) return '–';
  let unit;
  let qty;
  if (p.use_staffelpreise) {
    // Kleinste Staffel nach Menge (nicht einfach der erste Array-Eintrag) —
    // inkl. "Extra"-Spalte und ggf. eingerechneter Mess-/Sonder-/Express-
    // kosten, damit diese Vorschau zum tatsächlichen PDF passt (siehe
    // buildItemRows() Fall A in quotationPdf.js).
    const tiers = (p.price_tiers || []).filter((t) => Number(t.qty) > 0)
      .slice().sort((a, b) => (Number(a.qty) || 0) - (Number(b.qty) || 0));
    const tier = tiers[0];
    if (!tier) return '–';
    qty = Number(tier.qty) || 0;
    const eingerechneteFixkosten = (p.messkosten_in_stueckpreis ? Number(p.messkosten) || 0 : 0)
      + (p.sonderkosten_in_stueckpreis ? Number(p.sonderkosten) || 0 : 0)
      + (p.expresskosten_in_stueckpreis ? Number(p.expresskosten) || 0 : 0);
    const stueckAnteil = qty > 0 ? eingerechneteFixkosten / qty : 0;
    unit = (Number(tier.unit_price) || 0) + (Number(tier.extra_price) || 0) + stueckAnteil;
    let summe = unit * qty;
    if (!p.messkosten_in_stueckpreis) summe += Number(p.messkosten) || 0;
    if (!p.sonderkosten_in_stueckpreis) summe += Number(p.sonderkosten) || 0;
    if (!p.expresskosten_in_stueckpreis) summe += Number(p.expresskosten) || 0;
    return formatEuro(summe);
  } else {
    qty = Math.max(1, Number(p.stueckzahl) || 1);
    const setup = Number(p.setup_cost) || 0;
    const unitCost = Number(p.unit_cost) || 0;
    const material = Number(p.material_cost) || 0;
    const pauschal = Number(p.pauschal_material) || 0;
    const sonder = Number(p.sonderkosten) || 0;
    const express = Number(p.expresskosten) || 0;
    const mess = Number(p.messkosten) || 0;
    unit = (setup + (unitCost + material) * qty + pauschal + sonder + express + mess) / qty;
  }
  return formatEuro(unit * qty);
});

function selectAll(e) {
  e.target.select();
}

function emitUpdate() {
  emits('update', { ...props.part });
}

function emitCostUpdate() {
  emits('update', {
    ...props.part,
    setup_cost: props.part.setup_cost,
    unit_cost: props.part.unit_cost,
    material_cost: props.part.material_cost,
    sonderkosten: props.part.sonderkosten,
  });
}

// Rüstkosten/Stückkosten = Zeit (min) × eigener Stundensatz je Zeile (€/h) —
// Rüstzeit und Stückzeit können unterschiedlich abgerechnet werden (z. B.
// Rüsten durch günstigere Hilfskraft statt Maschinenstunde). Formel berechnet
// den Wert automatisch vor, das Ergebnisfeld bleibt aber direkt überschreibbar
// (siehe setup_cost/unit_cost-Inputs oben, eigenes @input="emitCostUpdate").
function onRuestzeitChange() {
  const stunden = (Number(props.part.ruestzeit_min) || 0) / 60;
  const kosten = Number((stunden * (Number(props.part.ruestzeit_stundensatz) || 0)).toFixed(2));
  emits('update', { ...props.part, setup_cost: kosten });
}

function onStueckzeitChange() {
  const stunden = (Number(props.part.stueckzeit_min) || 0) / 60;
  const kosten = Number((stunden * (Number(props.part.stueckzeit_stundensatz) || 0)).toFixed(2));
  emits('update', { ...props.part, unit_cost: kosten });
}

function onRuestzeitStundensatzChange() {
  const stunden = (Number(props.part.ruestzeit_min) || 0) / 60;
  const kosten = Number((stunden * (Number(props.part.ruestzeit_stundensatz) || 0)).toFixed(2));
  emits('update', { ...props.part, setup_cost: kosten });
}

function onStueckzeitStundensatzChange() {
  const stunden = (Number(props.part.stueckzeit_min) || 0) / 60;
  const kosten = Number((stunden * (Number(props.part.stueckzeit_stundensatz) || 0)).toFixed(2));
  emits('update', { ...props.part, unit_cost: kosten });
}

// Allgemeiner Stundensatz oben dient als bequemer "Alle setzen"-Schnellzugriff
// — überschreibt beim Ändern auch die beiden zeilenspezifischen Sätze (siehe
// oben) und rechnet beide Kosten neu; danach bleiben Rüstzeit-/Stückzeit-
// Stundensatz aber wieder unabhängig einzeln editierbar.
function onStundensatzChange() {
  merkeStundensatzFuerMaschine(props.part.machine, props.part.stundensatz);
  const rate = Number(props.part.stundensatz) || 0;
  const update = { ...props.part, ruestzeit_stundensatz: rate, stueckzeit_stundensatz: rate };
  if (Number(props.part.ruestzeit_min) > 0) {
    update.setup_cost = Number(((Number(props.part.ruestzeit_min) / 60) * rate).toFixed(2));
  }
  if (Number(props.part.stueckzeit_min) > 0) {
    update.unit_cost = Number(((Number(props.part.stueckzeit_min) / 60) * rate).toFixed(2));
  }
  emits('update', update);
}

// Maschine gewählt → zuletzt für diese Maschine gemerkten Stundensatz vorschlagen
// (überschreibbar). Später ggf. durch echte Maschinen-Stammdaten ersetzbar.
function onMaschineChange() {
  const gemerkt = getStundensatzFuerMaschine(props.part.machine);
  const update = { ...props.part };
  if (gemerkt != null) {
    update.stundensatz = gemerkt;
    update.ruestzeit_stundensatz = gemerkt;
    update.stueckzeit_stundensatz = gemerkt;
    if (Number(props.part.ruestzeit_min) > 0) {
      update.setup_cost = Number(((Number(props.part.ruestzeit_min) / 60) * gemerkt).toFixed(2));
    }
    if (Number(props.part.stueckzeit_min) > 0) {
      update.unit_cost = Number(((Number(props.part.stueckzeit_min) / 60) * gemerkt).toFixed(2));
    }
  }
  emits('update', update);
}

function onPriceTiersUpdate(tiers) {
  emits('update', { ...props.part, price_tiers: tiers });
}

// Explizites "Neu berechnen" statt automatischem Nachrechnen bei jeder
// Kostenfeld-Änderung — ein früherer Auto-Recalc lief bei JEDER Änderung
// (auch beim Tippen in die Staffelpreis-Tabelle selbst) und hat dabei sowohl
// manuell eingetragene Stückpreise als auch die "Extra"-Spalte stillschweigend
// überschrieben. Jetzt: nur auf Knopfdruck, füllt NUR den Stückpreis (aus
// Rüstkosten/Stückkosten/Material/Pauschal — exakt die Formel oben in der
// Kopfzeile), lässt Menge und "Extra" pro Staffel unangetastet. Mess-/Sonder-/
// Expresskosten NICHT hier einrechnen — die laufen über die eigenen Haken
// (siehe oben) und werden in PDF/Kostenübersicht bereits separat pro Staffel
// dazugerechnet; würden sie hier zusätzlich in den Stückpreis gebacken, gäbe
// es eine Doppelzählung.
function staffelpreiseNeuBerechnen() {
  const p = props.part;
  const setup = Number(p.setup_cost) || 0;
  const unitCost = Number(p.unit_cost) || 0;
  const material = Number(p.material_cost) || 0;
  const pauschal = Number(p.pauschal_material) || 0;
  const tiers = (p.price_tiers || []).map((t) => {
    const qty = Math.max(1, Number(t.qty) || 1);
    const stueckpreis = (setup + pauschal) / qty + unitCost + material;
    return { ...t, unit_price: Number(stueckpreis.toFixed(2)) };
  });
  emits('update', { ...props.part, price_tiers: tiers });
}

// Markierungen (Freihand-Striche) auf der PDF-Zeichnung — von hier gehalten,
// nicht in der jeweiligen DrawingViewer-Instanz, damit die kleine Inline-
// Vorschau UND die große Zoom-Ansicht (separate Komponenten-Instanzen)
// dieselben Striche zeigen, auch nachdem die Zoom-Ansicht (v-if) wieder
// geschlossen/zerstört wurde. Rein session-lokal, nicht Teil von localPart
// (nicht in der Datei/beim Speichern enthalten).
const pdfMarkup = ref([]);

function onDrawingLoaded(file) {
  keinTextGefunden.value = false;
  materialSuggestion.value = null;
  // DrawingViewer feuert 'loaded' auch beim automatischen Anzeigen der schon
  // vorhandenen Datei (z.B. beim Öffnen eines gespeicherten Angebots) — nur
  // bei einer WIRKLICH neuen Datei (andere Objekt-Referenz als die aktuell
  // gesetzte) als "geändert" markieren, damit sie beim nächsten Speichern
  // erneut hochgeladen wird; die bloße Bestätigung der bestehenden Datei löst
  // sonst unnötig einen erneuten Upload derselben Datei aus.
  const istNeueDatei = file !== props.part.pdfFile;
  if (istNeueDatei) pdfMarkup.value = [];
  emits('update', {
    ...props.part,
    pdfFile: file,
    _pdfUnveraendert: istNeueDatei ? false : props.part._pdfUnveraendert,
  });
}

// Material-Erkennung aus der Zeichnung (Text-Suche, lokal) → Vorschlag anzeigen
const materialSuggestion = ref(null);
const keinTextGefunden = ref(false);
function onMaterialDetected(result) {
  keinTextGefunden.value = false;
  materialSuggestion.value = result;
}

function applyMaterialSuggestion() {
  const s = materialSuggestion.value;
  if (!s) return;
  const update = { ...props.part };
  if (s.material) {
    const klasse = MATERIALKLASSEN.find((k) => k.key === s.material.klasse);
    update.material = s.material.name;
    update.material_dichte = s.material.dichte;
    if (klasse) {
      update.material_class = { key: klasse.key, label: klasse.label, color: klasse.color, dichte: s.material.dichte };
    }
  }
  // Zustand und Oberfläche bleiben GETRENNTE Felder (unterschiedliche Dinge)
  if (s.condition) update.zustand = s.condition;
  if (s.surface) update.oberflaeche = s.surfaceColor ? `${s.surface} (${s.surfaceColor})` : s.surface;
  if (s.mechValues) update.materialwerte = s.mechValues;
  if (s.zeichnungsdatum) update.zeichnungsdatum = s.zeichnungsdatum;
  if (s.konstrukteur) {
    if (s.konstrukteur.name) update.konstrukteur_name = s.konstrukteur.name;
    if (s.konstrukteur.email) update.konstrukteur_email = s.konstrukteur.email;
    if (s.konstrukteur.telefon) update.konstrukteur_telefon = s.konstrukteur.telefon;
  }
  mitGewichtNeuBerechnet(update);
  // Gewicht laut Zeichnung ist zuverlässiger als die geometrische Schätzung
  // (Bounding-Box/Rohmaterial) — überschreibt diese daher, falls erkannt.
  if (s.gewicht) update.gewicht_kg = s.gewicht;
  emits('update', update);
  materialSuggestion.value = null;
}

// Material aus dem Dropdown (Erkennungs-DB, gruppiert nach Klasse) übernehmen
const showMaterialClassPicker = ref(false);
function onMaterialClassPicked(m) {
  const update = {
    ...props.part,
    material: m.name,
    material_dichte: m.dichte,
    material_class: { key: m.klasse, label: m.label, color: m.color, dichte: m.dichte },
  };
  emits('update', mitGewichtNeuBerechnet(update));
  showMaterialClassPicker.value = false;
}

// Oberfläche aus dem Dropdown übernehmen
const showSurfacePicker = ref(false);
function onSurfacePicked(label) {
  emits('update', { ...props.part, oberflaeche: label });
  showSurfacePicker.value = false;
}

const volumenWirdBerechnet = ref(false);
// Flächen-/Kanten-Liste (exakte Geometrie) NICHT Teil von localPart/Speicherung —
// wird bei jedem STEP-Laden neu berechnet, rein für die Messen-Funktion im Viewer.
const exakteFlaechen = ref([]);
const exakteKanten = ref([]);

async function onModelLoaded(file) {
  // ModelViewer feuert 'loaded' auch beim automatischen Anzeigen der schon
  // vorhandenen Datei (z.B. beim Öffnen eines gespeicherten Angebots) — nur
  // bei einer WIRKLICH neuen Datei (andere Objekt-Referenz) als "geändert"
  // markieren (siehe analoger Kommentar bei onDrawingLoaded oben).
  const istNeueDatei = file !== props.part.stepFile;
  const basis = {
    ...props.part,
    stepFile: file,
    _stepUnveraendert: istNeueDatei ? false : props.part._stepUnveraendert,
  };
  emits('update', basis);
  const name = (file.name || '').toLowerCase();
  if (!name.endsWith('.step') && !name.endsWith('.stp')) {
    exakteFlaechen.value = [];
    exakteKanten.value = [];
    return;
  }
  // Gleiche Datei für dasselbe Bauteil schon einmal analysiert (z.B. weil
  // man zwischendurch zu einem anderen Bauteil und wieder zurück geklickt
  // hat, wodurch PartCard neu gemountet wird) → nicht erneut die teure
  // OCCT-Analyse anstoßen, sondern das Ergebnis aus dem Cache übernehmen.
  const gecached = holeAusAnalyseCache(props.part.id, file);
  if (gecached) {
    exakteFlaechen.value = gecached.flaechen;
    exakteKanten.value = gecached.kanten;
    if (!basis.exakt_volumen_mm3) {
      emits('update', { ...props.part, exakt_volumen_mm3: gecached.volumeMm3, exakt_oberflaeche_mm2: gecached.oberflaecheMm2 });
    }
    return;
  }
  exakteFlaechen.value = [];
  exakteKanten.value = [];
  volumenWirdBerechnet.value = true;
  try {
    let volumeMm3;
    let oberflaecheMm2;
    let geometrie;
    try {
      // Bevorzugt: Hintergrund-Worker (läuft ggf. schon; hier nach vorne gezogen)
      const erg = await planeAnalyse(props.part.id, file, { vorne: true }).analyse;
      ({ volumeMm3, oberflaecheMm2 } = erg);
      geometrie = { flaechen: erg.flaechen, kanten: erg.kanten };
    } catch (workerFehler) {
      // Fallback: wie bisher im Hauptthread
      console.warn('Worker-Analyse fehlgeschlagen, Fallback Hauptthread', workerFehler);
      const leereGeometrie = { flaechen: [], kanten: [] };
      [{ volumeMm3, oberflaecheMm2 }, geometrie] = await Promise.all([
        berechneVolumenUndOberflaeche(file),
        analysiereFlaechen(file).catch((e) => { console.warn('Flächen-Analyse fehlgeschlagen', e); return leereGeometrie; }),
      ]);
      schreibeInAnalyseCache(props.part.id, file, { volumeMm3, oberflaecheMm2, flaechen: geometrie.flaechen, kanten: geometrie.kanten });
    }
    emits('update', { ...props.part, exakt_volumen_mm3: volumeMm3, exakt_oberflaeche_mm2: oberflaecheMm2 });
    exakteFlaechen.value = geometrie.flaechen;
    exakteKanten.value = geometrie.kanten;
  } catch (e) {
    console.warn('Exakte Volumenberechnung fehlgeschlagen', e);
  } finally {
    volumenWirdBerechnet.value = false;
  }
}

// Screenshot des STEP-Modells → als Vorschaubild der Teileliste merken.
// Automatische Aufnahmen (nach dem Laden) überschreiben eine bereits
// vorhandene Vorschau NICHT mehr — einmal geladen (oder manuell per
// "📷 Ansicht" gesetzt), bleibt sie stehen, bis der Nutzer sie selbst ändert.
function onModelThumbnail(dataUrl, manuell) {
  if (!dataUrl) return;
  if (!manuell && props.part.stepThumbnailDataUrl && !props.part._stepThumbVorlaeufig) return;
  emits('update', { ...props.part, stepThumbnailDataUrl: dataUrl, _stepThumbVorlaeufig: false });
}

// Maße aus dem STEP (Bounding Box + echter Drehdurchmesser) übernehmen
function onModelDimensions(dim) {
  if (dim && (dim.x || dim.y || dim.z)) {
    emits('update', {
      ...props.part,
      bbox: { x: dim.x, y: dim.y, z: dim.z, roundD: dim.roundD || 0, roundL: dim.roundL || 0 },
    });
  }
}

// Material-Klassen (ISO P/M/K/N/S/H + O) mit Farbe + Richtdichte — zentral in materialRecognition.js
const showKlasseMenu = ref(false);
function selectKlasse(k) {
  showKlasseMenu.value = false;
  const update = {
    ...props.part,
    material_class: { key: k.key, label: k.label, color: k.color, dichte: k.dichte },
    material_dichte: k.dichte,
  };
  emits('update', mitGewichtNeuBerechnet(update));
}

// Rohmaterial: Quader + Rund (echter Drehdurchmesser), exakt + auf ganze mm aufgerundet
// Exaktes Fertigteil-Gewicht (aus STEP-Volumen via OCCT, NICHT geschätzt) —
// nur berechenbar, sobald Volumen bekannt UND eine Dichte gewählt ist.
const fertigteilGewichtKg = computed(() => {
  const volumenMm3 = props.part?.exakt_volumen_mm3;
  const dichte = props.part?.material_class?.dichte || Number(props.part?.material_dichte) || 0;
  if (!volumenMm3 || !dichte) return null;
  return (volumenMm3 * dichte) / 1e6; // mm³ × g/cm³ → kg
});

const rohmaterial = computed(() => {
  const b = props.part?.bbox;
  if (!b) return null;
  const a = Number(props.part.aufmass) || 0;
  const dims = [b.x, b.y, b.z].sort((x, y) => y - x); // [L, M, S]
  const [L, M, S] = dims;
  const qx = b.x + 2 * a;
  const qy = b.y + 2 * a;
  const qz = b.z + 2 * a;
  const roundD = (b.roundD || Math.max(M, S)) + 2 * a;
  const roundL = (b.roundL || L) + 2 * a;
  const r1 = (v) => Math.round(v * 10) / 10;
  const ce = (v) => Math.ceil(v - 1e-6);
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const dichte = props.part.material_class?.dichte || Number(props.part.material_dichte) || 0;
  const kgQuader = dichte ? r3((qx * qy * qz * dichte) / 1e6) : 0;
  const kgRund = dichte ? r3((Math.PI * (roundD / 2) ** 2 * roundL * dichte) / 1e6) : 0;
  return {
    mass: `${r1(b.x)} × ${r1(b.y)} × ${r1(b.z)} mm`,
    quaderExakt: `${r1(qx)} × ${r1(qy)} × ${r1(qz)} mm`,
    quaderCeil: `${ce(qx)} × ${ce(qy)} × ${ce(qz)} mm`,
    rundExakt: `⌀ ${r1(roundD)} × ${r1(roundL)} mm`,
    rundCeil: `⌀ ${ce(roundD)} × ${ce(roundL)} mm`,
    gewQuader: kgQuader || null,
    gewRund: kgRund || null,
    // Rohe Zahlenwerte (aufgerundet, da das die kaufbare Rohmaterial-Größe ist) für "Übernehmen"
    raw: { quaderBreite: ce(qx), quaderHoehe: ce(qy), quaderLaenge: ce(qz), rundDurchmesser: ce(roundD), rundLaenge: ce(roundL) },
  };
});

// Zeichnung im echten Browser-Tab öffnen (für Markierungen etc.)
function openPdfInBrowser() {
  const file = props.part.pdfFile;
  if (!file) return;
  const url = URL.createObjectURL(file);
  window.open(url, '_blank');
  // URL nach kurzer Zeit freigeben (Tab hat die Datei dann geladen)
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Gewicht aus Geometrie + Dichte (Rund/Vierkant/Flach); dichte in g/cm³, Maße in mm → kg
function gewichtAus(form, durchmesser, laenge_mm, dichte, breite, hoehe) {
  const L = Number(laenge_mm) || 0;
  const rho = Number(dichte) || 0;
  if (!L || !rho) return 0;
  let flaeche_mm2 = 0;
  if (form === 'Flach' && Number(breite) && Number(hoehe)) {
    flaeche_mm2 = Number(breite) * Number(hoehe);
  } else {
    const d = Number(durchmesser) || 0;
    if (!d) return 0;
    flaeche_mm2 = form === 'Vierkant' ? d * d : Math.PI * (d / 2) ** 2;
  }
  // dichte g/cm³ = g pro 1000 mm³ → kg = flaeche*L*dichte / 1e6
  return (flaeche_mm2 * L * rho) / 1e6;
}

// Gewicht (+ Materialkosten) neu berechnen, wenn NUR die Dichte sich ändert
// (Material wird nachträglich gewählt, Maße waren schon vorher eingetragen —
// vorher wurde das Gewicht in diesem Fall nicht aktualisiert).
function mitGewichtNeuBerechnet(update) {
  const dichte = update.material_dichte ?? props.part.material_dichte;
  const gewicht = gewichtAus(
    props.part.material_form,
    props.part.material_durchmesser,
    props.part.laenge_mm,
    dichte,
    props.part.material_breite,
    props.part.material_hoehe,
  );
  update.gewicht_kg = gewicht;
  const preis = Number(props.part.material_preis_kg) || 0;
  if (preis && gewicht) update.material_cost = Number((gewicht * preis).toFixed(2));
  return update;
}

function onLaengeInput() {
  const gewicht = gewichtAus(
    props.part.material_form,
    props.part.material_durchmesser,
    props.part.laenge_mm,
    props.part.material_dichte,
    props.part.material_breite,
    props.part.material_hoehe,
  );
  const preis = Number(props.part.material_preis_kg) || 0;
  const update = { ...props.part, gewicht_kg: gewicht };
  if (preis && gewicht) update.material_cost = Number((gewicht * preis).toFixed(2));
  emits('update', update);
}

function setMaterialForm(form) {
  const update = { ...props.part, material_form: form };
  const gewicht = gewichtAus(
    form, update.material_durchmesser, update.laenge_mm,
    update.material_dichte, update.material_breite, update.material_hoehe,
  );
  update.gewicht_kg = gewicht;
  const preis = Number(update.material_preis_kg) || 0;
  if (preis && gewicht) update.material_cost = Number((gewicht * preis).toFixed(2));
  emits('update', update);
}

// Vorschlag aus STEP-Rohmaterial-Berechnung in die manuellen Materialfelder übernehmen
function uebernehmeRohmaterial(art) {
  const r = rohmaterial.value;
  if (!r) return;
  const update = { ...props.part };
  if (art === 'Rund') {
    update.material_form = 'Rund';
    update.material_durchmesser = r.raw.rundDurchmesser;
    update.laenge_mm = r.raw.rundLaenge;
  } else {
    update.material_form = 'Flach';
    update.material_breite = r.raw.quaderBreite;
    update.material_hoehe = r.raw.quaderHoehe;
    update.laenge_mm = r.raw.quaderLaenge;
  }
  const gewicht = gewichtAus(
    update.material_form, update.material_durchmesser, update.laenge_mm,
    update.material_dichte, update.material_breite, update.material_hoehe,
  );
  update.gewicht_kg = gewicht;
  const preis = Number(update.material_preis_kg) || 0;
  if (preis && gewicht) update.material_cost = Number((gewicht * preis).toFixed(2));
  emits('update', update);
}

function onMaterialSelect(row) {
  const gewicht = gewichtAus(row.form, row.durchmesser, props.part.laenge_mm, row.dichte);
  const update = {
    ...props.part,
    material: `${row.werkstoff} ${row.form} ⌀${row.durchmesser}`,
    material_code: row.code,
    material_dichte: row.dichte,
    material_preis_kg: row.preis || 0,
    material_durchmesser: row.durchmesser,
    material_form: row.form,
    gewicht_kg: gewicht,
  };
  if (row.preis && gewicht) update.material_cost = Number((gewicht * row.preis).toFixed(2));
  emits('update', update);
  showMaterialModal.value = false;
}

function openPdfModal() {
  if (!props.part?.pdfFile) return;
  showPdfModal.value = true;
}

function closePdfModal() {
  showPdfModal.value = false;
}
</script>
