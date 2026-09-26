<template>
  <div class="min-h-screen flex flex-col bg-slate-950" :class="{ 'bright-labels': uiBright }">
    <div class="max-w-[1920px] w-full mx-auto px-4 py-4 space-y-4">
      <!-- Einstellungsleiste -->
      <div class="flex justify-end items-center gap-2 -mb-1 flex-wrap">
        <button
          type="button"
          class="rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-2 py-1 text-[11px] text-emerald-300 hover:border-emerald-500 transition"
          title="Alle gespeicherten Angebote ansehen"
          @click="showHistorie = true"
        >
          📋 Angebote ({{ historie.length }})
        </button>
        <button
          type="button"
          class="rounded-lg border border-indigo-800/60 bg-indigo-950/30 px-2 py-1 text-[11px] text-indigo-300 hover:border-indigo-500 transition"
          title="Neue Anfrage-E-Mails prüfen (lokale Mail-Bridge muss laufen)"
          @click="oeffnePosteingang"
        >
          📬 Posteingang
        </button>
        <button
          v-if="nasUnterstuetzt"
          type="button"
          class="rounded-lg border px-2 py-1 text-[11px] transition"
          :class="nasVerbunden ? 'border-teal-700/60 bg-teal-950/30 text-teal-300 hover:border-teal-500' : (nasBrauchtBestaetigung ? 'border-amber-700/60 bg-amber-950/30 text-amber-300 hover:border-amber-500' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-500')"
          :title="nasVerbunden ? `Verbunden mit NAS-Ordner „${nasOrdnerNameAnzeige}“ — Angebote werden dort für alle PCs gemeinsam gespeichert` : (nasBrauchtBestaetigung ? `Zugriff auf „${nasOrdnerNameAnzeige}“ muss neu bestätigt werden (z.B. nach ein paar Tagen) — hier klicken, kein neuer Ordner-Dialog nötig` : 'NAS-Ordner verbinden, damit mehrere PCs dieselben Angebote sehen')"
          @click="onNasVerbinden"
        >
          {{ nasVerbunden ? `📁 NAS: ${nasOrdnerNameAnzeige}` : (nasBrauchtBestaetigung ? `🔒 NAS neu bestätigen: ${nasOrdnerNameAnzeige}` : '📁 NAS-Ordner verbinden') }}
        </button>
        <span class="text-[10px] text-slate-500">Eigene Daten (nur dieser PC):</span>
        <button
          type="button"
          class="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:border-sky-500 transition"
          title="Eigene Materialien + Oberflächen als JSON-Datei sichern"
          @click="exportMaterialienJson"
        >
          ⬇ Materialien
        </button>
        <label class="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:border-sky-500 transition cursor-pointer">
          ⬆ Materialien
          <input type="file" accept="application/json" class="hidden" @change="onImportMaterialien" />
        </label>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-300 hover:border-sky-500 transition"
          @click="uiBright = !uiBright"
        >
          ⚙ Beschriftungen: {{ uiBright ? 'Hell' : 'Normal' }}
        </button>
      </div>

      <RFQHeader
        :rfq="rfq"
        :kunden="kunden"
        :bild-im-pdf="bildImPdf"
        :speichern-laeuft="speichernLaeuft"
        @update:bildImPdf="bildImPdf = $event"
        @save="onSave"
        @create-erpnext-quotation="onCreateQuotation"
        @preview-pdf="onPreviewPdf"
        @send-email="onSendEmail"
        @kunden-changed="reloadKunden"
      />

      <!-- E-Mail + Notizen -->
      <section class="bg-slate-900/80 border border-slate-800 rounded-xl p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="space-y-1">
          <h2 class="ui-label text-xs font-semibold tracking-wide text-slate-300 uppercase">
            Anfrage-E-Mail
          </h2>
          <textarea
            v-model="rfq_email_text"
            rows="3"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 resize-none focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="E-Mail-Text der Anfrage einfügen..."
          />
        </div>
        <div class="space-y-1">
          <h2 class="ui-label text-xs font-semibold tracking-wide text-slate-300 uppercase">
            Notiz zum Angebot (intern)
          </h2>
          <textarea
            v-model="angebot_notiz"
            rows="3"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 resize-none focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="Interne Infos / Hinweise..."
          />
        </div>
        <div class="space-y-1">
          <h2 class="ui-label text-xs font-semibold tracking-wide text-emerald-300 uppercase">
            Angebotsinfo (im PDF unter der Tabelle)
          </h2>
          <textarea
            v-model="angebot_info"
            rows="3"
            class="w-full bg-slate-950 border border-emerald-800/60 rounded-lg px-3 py-2 text-xs text-slate-100 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="z. B. Sonderkonditionen ..."
          />
        </div>
      </section>

      <!-- Globale Standardwerte für neu angelegte Bauteile -->
      <section class="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
        <button
          type="button"
          class="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-300 uppercase w-full text-left"
          @click="showGlobalDefaults = !showGlobalDefaults"
        >
          <span class="text-slate-500">{{ showGlobalDefaults ? '▾' : '▸' }}</span>
          🌐 Globale Standardwerte für neue Bauteile
          <span class="ml-auto text-[10px] normal-case font-normal text-slate-500">
            gilt nur als Vorbelegung beim Anlegen — vorhandene Teile bleiben unverändert, jedes Feld bleibt am Teil überschreibbar
          </span>
        </button>
        <div v-if="showGlobalDefaults" class="mt-3 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="space-y-1">
            <p class="text-[10px] text-slate-500 uppercase tracking-wide">Material</p>
            <button
              type="button"
              class="w-full flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-left hover:border-sky-500 transition"
              @click="showGlobalMaterialPicker = true"
            >
              <span
                v-if="globalDefaults.material_class"
                class="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-slate-900 flex-shrink-0"
                :style="{ background: globalDefaults.material_class.color }"
              >{{ globalDefaults.material_class.key }}</span>
              <span class="truncate flex-1 text-slate-200">{{ globalDefaults.material || 'Kein Standard – Werkstoff wählen' }}</span>
              <span
                v-if="globalDefaults.material"
                class="text-slate-500 hover:text-slate-200 flex-shrink-0"
                @click.stop="clearGlobalMaterial"
              >×</span>
            </button>
          </div>
          <div class="space-y-1">
            <p class="text-[10px] text-slate-500 uppercase tracking-wide">Maschine / Stundensatz</p>
            <div class="flex gap-2">
              <select
                v-model="globalDefaults.machine"
                class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
              >
                <option value="">Maschine wählen</option>
                <option v-for="m in MASCHINEN" :key="m" :value="m">{{ m }}</option>
              </select>
              <input
                v-model.number="globalDefaults.stundensatz"
                type="number"
                min="0"
                step="1"
                placeholder="€/h"
                class="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center text-slate-200"
              />
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-[10px] text-slate-500 uppercase tracking-wide">Stückzahl / Bearbeitungszeit</p>
            <div class="flex gap-2">
              <input
                v-model.number="globalDefaults.stueckzahl"
                type="number"
                min="0"
                step="1"
                placeholder="Stk."
                title="Stückzahl"
                class="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center text-slate-200"
              />
              <input
                v-model.number="globalDefaults.stueckzeit_min"
                type="number"
                min="0"
                step="0.1"
                placeholder="min"
                title="Bearbeitungszeit / Stückzeit (min)"
                class="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center text-slate-200"
              />
            </div>
          </div>
          <div class="space-y-1">
            <label class="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                v-model="globalDefaults.use_staffelpreise"
                type="checkbox"
                class="w-3.5 h-3.5 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
              />
              <span class="text-[10px] text-slate-500 uppercase tracking-wide">Staffelpreise als Standard</span>
            </label>
            <div v-if="globalDefaults.use_staffelpreise" class="grid grid-cols-4 gap-1">
              <div v-for="(tier, i) in globalDefaults.price_tiers" :key="i" class="flex flex-col gap-0.5">
                <input
                  v-model.number="tier.qty"
                  type="number"
                  min="1"
                  title="Menge ab"
                  class="bg-slate-950 border border-slate-700 rounded px-1 py-1 text-[10px] text-center text-slate-200"
                />
                <input
                  v-model.number="tier.unit_price"
                  type="number"
                  min="0"
                  step="0.01"
                  title="Preis/Stk (€)"
                  class="bg-slate-950 border border-slate-700 rounded px-1 py-1 text-[10px] text-center text-slate-200"
                />
              </div>
            </div>
          </div>
        </div>
        <div v-if="showGlobalDefaults" class="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg bg-amber-600/20 border border-amber-600/50 px-3 py-1.5 text-[11px] font-medium text-amber-300 hover:bg-amber-600/30 transition"
            :disabled="!parts.length"
            @click="wendeGlobaleWerteAufAlleTeileAn"
          >
            ↻ Auf alle bestehenden Bauteile anwenden
          </button>
          <span class="text-[10px] text-slate-500">falls du die globalen Werte erst nachträglich gesetzt hast</span>
        </div>
      </section>

      <!-- Tabs links | Mitte Bauteil-Details | rechts Übersicht -->
      <div class="flex gap-4 min-h-[400px]">
        <aside class="w-72 flex-shrink-0">
          <div
            class="sticky top-4 bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2 max-h-[calc(100vh-32px)] overflow-y-auto"
            @dragover.prevent
            @drop.prevent="onDropFiles"
          >
            <p class="ui-label text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Bauteile &amp; Angebot</p>
            <button
              type="button"
              class="flex items-center gap-2 w-full rounded-lg border border-dashed border-slate-600 px-3 py-2 text-left text-xs text-slate-400 hover:border-sky-500 hover:text-sky-300 transition"
              @click="addEmptyPart"
            >
              <span class="text-base">+</span> Teil hinzufügen
            </button>
            <label
              class="flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-2 py-1.5 text-[11px] font-medium text-slate-100 border border-slate-700 hover:border-sky-500 cursor-pointer transition"
              title="PDF/STEP importieren – pro PDF wird ein Bauteil angelegt"
            >
              📎 Dateien importieren
              <input
                type="file"
                class="hidden"
                multiple
                accept=".pdf,application/pdf,.step,.stp,.stl,.glb,.gltf"
                @change="onFilePick"
              />
            </label>
            <p class="text-[10px] text-slate-500 text-center">oder Dateien hierher ziehen</p>

            <p
              v-if="!parts.length"
              class="rounded-lg border border-dashed border-slate-700 bg-slate-900/50 px-3 py-6 text-center text-[11px] text-slate-500"
            >
              Noch keine Bauteile. Datei importieren oder „+ Teil hinzufügen".
            </p>

            <article
              v-for="(part, idx) in parts"
              :key="part.id"
              draggable="true"
              class="rounded-lg border overflow-hidden cursor-pointer transition"
              :class="[
                idx === activePartIndex ? 'border-sky-500 ring-1 ring-sky-500/40' : 'border-slate-800 hover:border-slate-600',
                dragIndex === idx ? 'opacity-40' : '',
                dragOverIndex === idx && dragIndex !== idx ? 'border-sky-400 border-dashed' : '',
              ]"
              @click="activePartIndex = idx"
              @dragstart="onPartDragStart(idx, $event)"
              @dragover.prevent="dragOverIndex = idx"
              @drop.stop.prevent="onPartDrop(idx)"
              @dragend="onPartDragEnd"
            >
              <div class="w-full h-24 bg-white flex items-center justify-center overflow-hidden relative">
                <img
                  v-if="part.stepThumbnailDataUrl || part.thumbnailDataUrl"
                  :src="part.stepThumbnailDataUrl || part.thumbnailDataUrl"
                  alt=""
                  class="w-full h-full object-contain"
                />
                <span v-else class="text-xs text-slate-400 font-medium">{{ (part.part_name || '?').slice(0, 2) }}</span>
                <span
                  v-if="part.material_class"
                  class="absolute top-1 left-1 inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold text-slate-900 shadow"
                  :style="{ background: part.material_class.color }"
                  :title="part.material_class.label"
                >{{ part.material_class.key }}</span>
                <span class="absolute bottom-1 right-2 text-lg font-semibold text-slate-400 leading-none">
                  {{ part.use_staffelpreise ? 'Staffel' : (part.stueckzahl || 1) + '×' }}
                </span>
              </div>
              <div class="p-2.5 text-xs" :class="idx === activePartIndex ? 'bg-sky-500/10' : 'bg-slate-900/80'">
                <p class="text-sm font-semibold text-slate-50 truncate">
                  <template v-if="part.teilenummer">{{ part.teilenummer }}<template v-if="(part.artikelname || part.part_name) && (part.artikelname || part.part_name) !== part.teilenummer"> · </template></template><template v-if="(part.artikelname || part.part_name) !== part.teilenummer">{{ part.artikelname || part.part_name || 'Unbenannt' }}</template>
                </p>
                <p v-if="part.zeichnungsnummer" class="text-[11px] text-slate-400 truncate mt-0.5">
                  Zeichn.-Nr. {{ part.zeichnungsnummer }}
                </p>

                <!-- Preis-Aufschlüsselung (Logik wie zuvor in der rechten Übersicht) -->
                <div class="mt-2 space-y-0.5 text-[11px] border-t border-slate-800 pt-2">
                  <template v-if="!part.use_staffelpreise">
                    <div class="flex justify-between">
                      <span class="text-slate-300">{{ part.stueckzahl || 1 }} × {{ formatCurrency(stueckPreisOf(part)) }}</span>
                      <span class="text-slate-200">{{ formatCurrency(baseBetrag(part)) }}</span>
                    </div>
                    <div v-if="part.setup_cost > 0 && !part.ruestkosten_in_stueckpreis" class="flex justify-between text-slate-400">
                      <span>↳ Rüstkosten</span><span>+ {{ formatCurrency(part.setup_cost) }}</span>
                    </div>
                    <div v-if="part.messkosten > 0 && !part.messkosten_in_stueckpreis" class="flex justify-between text-slate-400">
                      <span>↳ Messkosten</span><span>+ {{ formatCurrency(part.messkosten) }}</span>
                    </div>
                    <div v-if="part.expresskosten > 0 && !part.expresskosten_in_stueckpreis" class="flex justify-between text-slate-400">
                      <span>↳ Expresszuschlag</span><span>+ {{ formatCurrency(part.expresskosten) }}</span>
                    </div>
                    <div v-if="part.sonderkosten > 0 && !part.sonderkosten_in_stueckpreis" class="flex justify-between text-slate-400">
                      <span>↳ Sonderkosten</span><span>+ {{ formatCurrency(part.sonderkosten) }}</span>
                    </div>
                    <div v-if="part.pauschal_material > 0 && part.pauschal_als_zeile" class="flex justify-between text-slate-400">
                      <span>↳ Materialpauschale</span><span>+ {{ formatCurrency(part.pauschal_material) }}</span>
                    </div>
                  </template>
                  <template v-else>
                    <div class="text-slate-300 font-medium">Staffelpreise:</div>
                    <div
                      v-for="(t, ti) in [...(part.price_tiers || [])].sort((a, b) => (Number(a.qty)||0) - (Number(b.qty)||0))"
                      :key="ti"
                      class="flex justify-between text-slate-400"
                    >
                      <span>↳ ab {{ t.qty }} St.</span>
                      <span>{{ formatCurrency((Number(t.unit_price)||0) + (Number(t.extra_price)||0)) }}/St.</span>
                    </div>
                    <div v-if="part.messkosten > 0 && !part.messkosten_in_stueckpreis" class="flex justify-between text-slate-400">
                      <span>↳ Messkosten</span><span>+ {{ formatCurrency(part.messkosten) }}</span>
                    </div>
                    <div v-if="part.expresskosten > 0 && !part.expresskosten_in_stueckpreis" class="flex justify-between text-slate-400">
                      <span>↳ Expresszuschlag</span><span>+ {{ formatCurrency(part.expresskosten) }}</span>
                    </div>
                    <div v-if="part.sonderkosten > 0 && !part.sonderkosten_in_stueckpreis" class="flex justify-between text-slate-400">
                      <span>↳ Sonderkosten</span><span>+ {{ formatCurrency(part.sonderkosten) }}</span>
                    </div>
                  </template>
                </div>
                <p class="text-sky-400 font-semibold mt-2 flex justify-between border-t border-slate-800 pt-2">
                  <span>{{ part.use_staffelpreise ? 'Summe (kl. Staffel)' : 'Summe Position' }}</span>
                  <span>{{ formatCurrency(getPartTotal(part)) }}</span>
                </p>
              </div>
            </article>

            <div v-if="parts.length" class="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs">
              <p class="flex justify-between text-slate-100 font-semibold">
                <span>Gesamt netto</span><span>{{ formatCurrency(angebotNetto) }}</span>
              </p>
            </div>
          </div>
        </aside>

        <main class="flex-1 min-w-[520px] rounded-xl border border-slate-700 bg-slate-900/90 p-4 overflow-auto">
          <template v-if="parts.length > 0 && currentPart">
            <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">
              Bauteil: {{ currentPart.part_name || 'Unbenannt' }}
            </h2>
            <ErrorBoundary>
              <PartCard
                :key="currentPart.id"
                :part="currentPart"
                @update="(payload) => updatePartById(currentPart.id, payload)"
                @delete="deletePartById(currentPart.id)"
              />
            </ErrorBoundary>
          </template>
          <p v-else-if="parts.length > 0" class="text-slate-500 text-sm py-4">
            Links ein Bauteil anklicken.
          </p>
          <p v-else class="text-slate-500 text-sm py-4">
            Dateien oben ablegen oder „+ Teil hinzufügen".
          </p>
        </main>

      </div>
    </div>

    <!-- Angebotshistorie -->
    <Teleport to="body">
      <div
        v-if="showHistorie"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        @click.self="showHistorie = false"
      >
        <div class="relative w-full max-w-4xl h-[80vh] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl flex flex-col">
          <div class="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <span class="text-sm text-slate-200 font-medium">Angebotshistorie</span>
              <div class="flex gap-1 ml-3">
                <button
                  v-for="f in [{k:'alle',l:'Alle'},{k:'offen',l:'Offen'},{k:STATUS.NEU,l:'Neu'},{k:STATUS.IN_BEARBEITUNG,l:'In Bearbeitung'},{k:STATUS.FERTIG,l:'Fertig'}]"
                  :key="f.k"
                  type="button"
                  class="px-2 py-1 rounded text-[11px] border transition"
                  :class="historieFilter === f.k ? 'bg-sky-500 text-slate-950 border-sky-500' : 'border-slate-700 text-slate-300 hover:border-sky-500'"
                  @click="historieFilter = f.k"
                >{{ f.l }}</button>
              </div>
            </div>
            <button type="button" class="text-slate-400 hover:text-white text-2xl leading-none" @click="showHistorie = false">×</button>
          </div>
          <div class="flex-1 overflow-y-auto p-3 space-y-2">
            <p v-if="!historieGefiltert.length" class="text-center text-slate-500 text-sm py-10">Keine gespeicherten Angebote in dieser Ansicht.</p>
            <article
              v-for="e in historieGefiltert"
              :key="e.id"
              class="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs flex items-center justify-between gap-3 flex-wrap"
            >
              <div class="cursor-pointer flex-1 min-w-[200px]" @click="ladeAusHistorie(e)">
                <p class="text-slate-100 font-medium">{{ e.rfq_number || '(ohne Nr.)' }} · {{ e.kunde }}</p>
                <p class="text-slate-500 mt-0.5">{{ e.teileAnzahl }} Teile · {{ formatCurrency(e.gesamtNetto) }} netto · zuletzt: {{ new Date(e.aktualisiert).toLocaleString('de-DE') }}</p>
              </div>
              <select
                :value="e.status"
                class="bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                @change="aendereStatus(e, $event.target.value)"
              >
                <option :value="STATUS.NEU">Neu</option>
                <option :value="STATUS.IN_BEARBEITUNG">In Bearbeitung</option>
                <option :value="STATUS.FERTIG">Angebot erstellt</option>
              </select>
            </article>
          </div>
          <div class="px-4 py-2 border-t border-slate-800 text-[10px] text-slate-500">
            <template v-if="nasVerbunden">📁 Gespeichert im NAS-Ordner „{{ nasOrdnerNameAnzeige }}" (inkl. PDF/STEP-Dateien) — für alle PCs sichtbar, die denselben Ordner verbinden.</template>
            <template v-else>Lokal gespeichert (nur dieser PC/Browser, inkl. PDF/STEP-Dateien) — für mehrere PCs oben „📁 NAS-Ordner verbinden" klicken.</template>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Posteingang: E-Mail-Anfragen über die lokale Mail-Bridge prüfen -->
    <Teleport to="body">
      <div
        v-if="showPosteingang"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        @click.self="showPosteingang = false"
      >
        <div class="relative w-full max-w-2xl max-h-[85vh] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl flex flex-col">
          <div class="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
            <span class="text-sm text-slate-200 font-medium">📬 Posteingang — Anfrage-E-Mails</span>
            <button type="button" class="text-slate-400 hover:text-white text-2xl leading-none" @click="showPosteingang = false">×</button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            <p class="text-[11px] text-slate-500">
              Dazu muss das Fenster <code class="text-slate-300">start_mail_bridge.bat</code> auf diesem PC
              geöffnet sein. Nichts wird automatisch übernommen — du wählst unten gezielt aus.
            </p>

            <div class="flex items-center gap-2">
              <input
                v-model="bridgeTokenInput"
                :type="tokenSichtbar ? 'text' : 'password'"
                placeholder="Zugriffs-Token aus dem Bridge-Fenster einfügen"
                class="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                @change="onTokenChange"
              />
              <button
                type="button"
                class="rounded-lg border border-slate-700 px-2 py-1.5 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition"
                title="Token ein-/ausblenden, um mit dem Bridge-Fenster zu vergleichen"
                @click="tokenSichtbar = !tokenSichtbar"
              >
                {{ tokenSichtbar ? '🙈' : '👁' }}
              </button>
            </div>
            <p v-if="bridgeTokenInput" class="text-[10px] text-slate-500">
              Endet auf „…{{ bridgeTokenInput.slice(-6) }}" — mit der Konsole des Bridge-Fensters vergleichen, falls „unauthorized" kommt.
            </p>

            <div class="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                class="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="posteingangLaedt"
                @click="onPruefeNeueAnfragen"
              >
                🔍 Neue Anfragen prüfen
              </button>
              <button
                type="button"
                class="rounded-lg border border-slate-700 px-2 py-1.5 text-[11px] text-slate-300 hover:border-sky-500 transition"
                title="Nur prüfen, ob die Bridge läuft (ohne Token/E-Mail-Zugriff)"
                @click="onVerbindungTesten"
              >
                🔌 Verbindung testen
              </button>
              <span v-if="verbindungStatus" :class="verbindungOk ? 'text-emerald-400' : 'text-rose-400'">{{ verbindungStatus }}</span>
              <span v-if="posteingangLaedt" class="text-slate-400">Prüfe …</span>
              <span v-if="posteingangFehler" class="text-rose-400">{{ posteingangFehler }}</span>
            </div>

            <p v-if="posteingangGeprueft && !gefundeneMails.length && !posteingangFehler" class="text-slate-500 py-4 text-center">
              Keine passenden neuen E-Mails gefunden (Whitelist + Betreff-Filter aus dem Mail-Skript).
            </p>

            <div v-if="gefundeneMails.length" class="space-y-2">
              <label
                v-for="m in gefundeneMails"
                :key="m.num"
                class="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 cursor-pointer hover:border-sky-600"
              >
                <input type="checkbox" class="mt-0.5" v-model="ausgewaehlteNums" :value="m.num" />
                <div class="flex-1 min-w-0">
                  <p class="text-slate-100 font-medium truncate">{{ m.betreff || '(ohne Betreff)' }}</p>
                  <p class="text-slate-500">{{ m.von }} · {{ m.datum }}</p>
                  <p v-if="m.anhaenge?.length" class="text-slate-400 mt-1">
                    📎 {{ m.anhaenge.join(', ') }}
                  </p>
                </div>
              </label>

              <button
                type="button"
                class="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="!ausgewaehlteNums.length || importLaedt"
                @click="onImportiereAusgewaehlte"
              >
                {{ importLaedt ? 'Importiere …' : `✅ Ausgewählte importieren (${ausgewaehlteNums.length})` }}
              </button>
            </div>
          </div>

          <div class="px-4 py-2 border-t border-slate-800 text-[10px] text-slate-500">
            Läuft ausschließlich lokal (127.0.0.1). Es werden nur Dateien übernommen, die als PDF/STEP/TIF
            erkannt wurden — jede Position musst du danach noch prüfen, bevor du das Angebot verschickst.
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal: globaler Standard-Werkstoff wählen -->
    <Teleport to="body">
      <div
        v-if="showGlobalMaterialPicker"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        @click.self="showGlobalMaterialPicker = false"
      >
        <div class="relative w-full max-w-3xl h-[75vh] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl">
          <MaterialClassPicker
            @select="onGlobalMaterialPicked"
            @close="showGlobalMaterialPicker = false"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, markRaw } from 'vue';
import RFQHeader from './components/RFQHeader.vue';
import PartCard from './components/PartCard.vue';
import ErrorBoundary from './components/ErrorBoundary.vue';
import MaterialClassPicker from './components/MaterialClassPicker.vue';
import { getPdfThumbnail } from './utils/pdfThumbnail.js';
import { planeAnalyse, setzeAnalyseCallback, setzeMeshCallback } from './utils/analyseQueue.js';
import { renderMeshThumbnail } from './utils/stepThumbnail.js';
import { openQuotationPrint } from './utils/quotationPdf.js';
import { exportMaterialienJson, importMaterialienJson } from './utils/materialRecognition.js';
import { MASCHINEN } from './utils/maschinenStundensatz.js';
import { getHistorie, speichereAngebot, ladeGespeicherteDateien, setzeStatus, STATUS, uebertrageLokaleAngeboteAufNas } from './utils/angebotsHistorie.js';
import { getToken, setToken, holeVorschau, importiereAusgewaehlte, base64ZuDatei, pruefeVerbindung } from './utils/mailBridge.js';
import { getNextAngebotsNummer } from './utils/counters.js';
import { nasVerfuegbar, waehleNasOrdner, holeVerbundenenOrdner, nasStatus, bestaetigeBerechtigung } from './utils/nasStorage.js';

const rfq = reactive({
  customer_name: 'Bosch Rexroth',
  rfq_number: '',
  email_source: 'sales@kunde.de',
  date: '',
  lieferanten_nr: '',
  ansprechpartner_name: '',
  kundenliefertermin: 'Nach Absprache',
  gueltigkeit_wochen: 4,
});

// Globale Standardwerte für NEU angelegte Bauteile (Material, Maschine/
// Stundensatz, Staffelpreise) — gilt nur als Vorbelegung beim Anlegen eines
// Teils (siehe createEmptyPart), ändert NICHT rückwirkend bereits vorhandene
// Bauteile, und jedes Feld bleibt am Bauteil selbst normal überschreibbar.
// Wird mit dem Angebot gespeichert/geladen (siehe onSave/ladeAusHistorie).
const globalDefaults = reactive({
  material: '',
  material_dichte: 0,
  material_class: null,
  machine: '',
  stundensatz: 0,
  stueckzahl: 0,
  stueckzeit_min: 0,
  use_staffelpreise: false,
  price_tiers: [
    { qty: 5, unit_price: 0 },
    { qty: 25, unit_price: 0 },
    { qty: 50, unit_price: 0 },
    { qty: 100, unit_price: 0 },
  ],
});
const showGlobalDefaults = ref(true);
const showGlobalMaterialPicker = ref(false);
function onGlobalMaterialPicked(m) {
  globalDefaults.material = m.name;
  globalDefaults.material_dichte = m.dichte;
  globalDefaults.material_class = { key: m.klasse, label: m.label, color: m.color, dichte: m.dichte };
  showGlobalMaterialPicker.value = false;
}
function clearGlobalMaterial() {
  globalDefaults.material = '';
  globalDefaults.material_dichte = 0;
  globalDefaults.material_class = null;
}

// Gewicht aus Form/Maßen/Dichte — dieselbe Formel wie in PartCard.vue, hier
// nur gebraucht, um beim nachträglichen Anwenden der globalen Werte auf
// bestehende Teile (die schon Maße eingetragen haben) das Gewicht korrekt
// mit der neuen Dichte neu zu berechnen.
function gewichtAusGlobal(form, durchmesser, laenge_mm, dichte, breite, hoehe) {
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
  return (flaeche_mm2 * L * rho) / 1e6;
}

// "Nachtrag"-Button in den globalen Standardwerten: überträgt die aktuell
// gesetzten globalen Werte auf ALLE bereits bestehenden Bauteile (statt nur
// auf neu angelegte) — für den Fall, dass die globalen Werte erst gesetzt
// wurden, nachdem schon Teile angelegt waren.
function wendeGlobaleWerteAufAlleTeileAn() {
  if (!parts.value.length) return;
  const ok = window.confirm(
    'Globale Standardwerte auf ALLE bestehenden Bauteile anwenden?\n\n' +
    'Material, Maschine/Stundensatz, Stückzahl/Bearbeitungszeit und Staffelpreise werden in jedem Bauteil überschrieben.',
  );
  if (!ok) return;
  parts.value = parts.value.map((part) => {
    const update = { ...part };
    if (globalDefaults.material) {
      update.material = globalDefaults.material;
      update.material_dichte = globalDefaults.material_dichte;
      update.material_class = { ...globalDefaults.material_class };
      update.gewicht_kg = gewichtAusGlobal(
        part.material_form, part.material_durchmesser, part.laenge_mm,
        globalDefaults.material_dichte, part.material_breite, part.material_hoehe,
      );
      const preis = Number(part.material_preis_kg) || 0;
      if (preis && update.gewicht_kg) update.material_cost = Number((update.gewicht_kg * preis).toFixed(2));
    }
    if (globalDefaults.machine) update.machine = globalDefaults.machine;
    if (globalDefaults.stundensatz) update.stundensatz = globalDefaults.stundensatz;
    if (globalDefaults.stueckzahl) update.stueckzahl = globalDefaults.stueckzahl;
    if (globalDefaults.stueckzeit_min) {
      update.stueckzeit_min = globalDefaults.stueckzeit_min;
      update.unit_cost = Number(((globalDefaults.stueckzeit_min / 60) * (update.stundensatz || 0)).toFixed(2));
    }
    if (globalDefaults.use_staffelpreise) {
      update.use_staffelpreise = true;
      update.price_tiers = globalDefaults.price_tiers.map((t) => ({ ...t }));
    }
    return update;
  });
}

// Kundenliste: live aus ERPNext (Customer/Address/Contact), siehe
// cnc_hohenstein/cnc_hohenstein/api.py get_kunden(). Kein lokaler Fallback
// mehr noetig - ERPNext ist jetzt die alleinige Quelle.
const kunden = ref([]);
function reloadKunden() {
  fetch('/api/method/cnc_hohenstein.api.get_kunden')
    .then((r) => (r.ok ? r.json() : { message: [] }))
    .then((data) => { kunden.value = Array.isArray(data.message) ? data.message : []; })
    .catch(() => { kunden.value = []; });
}
reloadKunden();

function onImportMaterialien(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  importMaterialienJson(file).catch((e) => alert('Import fehlgeschlagen: ' + e.message));
}

const rfq_email_text = ref('');
const angebot_notiz = ref('');
const angebot_info = ref('');

// UI-Einstellung: hellere Beschriftungen (vom Nutzer selbst umschaltbar, gespeichert)
const uiBright = ref(localStorage.getItem('uiBright') !== 'false');
watch(uiBright, (v) => localStorage.setItem('uiBright', v ? 'true' : 'false'));

// Option: 3D-Bild des Bauteils in der Angebots-PDF (Beschreibungsspalte) zeigen
const bildImPdf = ref(localStorage.getItem('bildImPdf') === 'true');
watch(bildImPdf, (v) => localStorage.setItem('bildImPdf', v ? 'true' : 'false'));
const parts = ref([]);
const activePartIndex = ref(0);

// Bauteile per Drag & Drop sortieren
const dragIndex = ref(-1);
const dragOverIndex = ref(-1);
function onPartDragStart(idx, e) {
  dragIndex.value = idx;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(idx)); } catch (_) { /* ignore */ }
  }
}
function onPartDrop(idx) {
  const from = dragIndex.value;
  dragOverIndex.value = -1;
  if (from < 0 || from === idx) { dragIndex.value = -1; return; }
  const list = [...parts.value];
  const [moved] = list.splice(from, 1);
  list.splice(idx, 0, moved);
  parts.value = list;
  activePartIndex.value = idx; // Auswahl folgt dem verschobenen Teil
  dragIndex.value = -1;
}
function onPartDragEnd() {
  dragIndex.value = -1;
  dragOverIndex.value = -1;
}

const currentPart = computed(() => {
  const list = parts.value;
  if (!list || list.length === 0) return null;
  const idx = Math.max(0, Math.min(activePartIndex.value, list.length - 1));
  return list[idx] ?? null;
});

watch(
  () => parts.value.length,
  (len, vorher) => {
    if (len > 0 && (activePartIndex.value < 0 || activePartIndex.value >= len)) {
      activePartIndex.value = len - 1;
    }
    // Erstes Bauteil eines neuen, noch nummernlosen Angebots → automatisch eine
    // fortlaufende Angebotsnummer vergeben (statt "Nr. vergeben" klicken zu müssen).
    if ((vorher || 0) === 0 && len > 0 && !rfq.rfq_number) {
      rfq.rfq_number = getNextAngebotsNummer();
    }
  },
);

function createEmptyPart(name = 'Neues Bauteil') {
  return {
    id: crypto.randomUUID(),
    part_name: name,
    teilenummer: '',
    zeichnungsnummer: '',
    artikelname: '',
    is_serial: false,
    notiz: '',
    stueckzahl: globalDefaults.stueckzahl || 1,
    // Ab hier: Felder, die aus den globalen Standardwerten vorbelegt werden
    // (siehe globalDefaults oben) — bleiben am einzelnen Bauteil ganz normal
    // überschreibbar, das ist nur die Startbelegung beim Anlegen.
    material: globalDefaults.material || '',
    material_im_pdf: false,
    oberflaeche: '',
    oberflaechen_info: '',
    zustand: '',
    materialwerte: '',
    // Aus der Zeichnung erkannter Konstrukteur/Ansprechpartner (Schriftfeld) —
    // Name wird später beim Item für QS-Rückverfolgung/Datenhochladen gebraucht.
    konstrukteur_name: '',
    konstrukteur_email: '',
    konstrukteur_telefon: '',
    material_code: '',
    material_dichte: globalDefaults.material_dichte || 0,
    material_preis_kg: 0,
    material_durchmesser: 0,
    material_breite: 0,
    material_hoehe: 0,
    material_form: 'Rund',
    laenge_mm: 0,
    gewicht_kg: 0,
    pauschal_material: 0,
    pauschal_als_zeile: false,
    bbox: null,
    exakt_volumen_mm3: 0,
    exakt_oberflaeche_mm2: 0,
    aufmass: 0,
    waz: false,
    material_class: globalDefaults.material_class ? { ...globalDefaults.material_class } : null,
    machine: globalDefaults.machine || '',
    stundensatz: globalDefaults.stundensatz || 0,
    // Eigene Stundensätze für Rüstzeit/Stückzeit — starten gleich dem
    // allgemeinen Stundensatz oben, sind aber danach frei einzeln editierbar
    // (z. B. wenn Rüsten von einer günstigeren Hilfskraft statt der Maschine
    // abgerechnet werden soll).
    ruestzeit_stundensatz: globalDefaults.stundensatz || 0,
    stueckzeit_stundensatz: globalDefaults.stundensatz || 0,
    ruestzeit_min: 0,
    setup_cost: 0,
    // Rüstkosten normalerweise als eigene Zeile im Angebot; wenn aktiv, wird
    // stattdessen (Rüstkosten ÷ Stückzahl) in den Stückpreis eingerechnet —
    // dann erscheint nur noch EIN kombinierter Stückpreis (wie bei "Pauschal
    // Materialkosten in Stückpreis einrechnen").
    ruestkosten_in_stueckpreis: false,
    programmierdauer_min: 0,
    stueckzeit_min: globalDefaults.stueckzeit_min || 0,
    unit_cost: globalDefaults.stueckzeit_min
      ? Number(((globalDefaults.stueckzeit_min / 60) * (globalDefaults.stundensatz || 0)).toFixed(2))
      : 0,
    material_cost: 0,
    sonderkosten: 0,
    sonder_text: '',
    expresskosten: 0,
    express_text: '',
    messkosten: 0,
    // Analog zu ruestkosten_in_stueckpreis: wenn aktiv, wird diese Kostenart
    // ÷ Stückzahl (bzw. bei Staffelpreisen ÷ jeweilige Staffel-Menge) in den
    // (Staffel-)Stückpreis eingerechnet statt als eigene ↳-Zeile im PDF zu
    // erscheinen.
    messkosten_in_stueckpreis: false,
    sonderkosten_in_stueckpreis: false,
    expresskosten_in_stueckpreis: false,
    // Beschriftung der zusätzlichen Spalte in der Staffelpreis-Tabelle (siehe
    // PriceTable.vue) — frei editierbar, z. B. für extern kalkulierte Zuschläge.
    staffel_extra_label: 'Extra',
    use_staffelpreise: globalDefaults.use_staffelpreise,
    price_tiers: globalDefaults.use_staffelpreise
      ? globalDefaults.price_tiers.map((t) => ({ ...t }))
      : [
        { qty: 5, unit_price: 0, extra_price: 0 },
        { qty: 25, unit_price: 0, extra_price: 0 },
        { qty: 50, unit_price: 0, extra_price: 0 },
        { qty: 100, unit_price: 0, extra_price: 0 },
      ],
    pdfFile: null,
    stepFile: null,
    // Verhindert, dass PDF/STEP bei JEDEM Speichern erneut auf die NAS
    // geschrieben werden, obwohl sich die Datei seit dem letzten Speichern
    // gar nicht geändert hat (war die Ursache für "dauert ~1 Minute" bei
    // vielen/großen STEP-Dateien) — siehe onSave() und angebotsHistorie.js.
    _pdfUnveraendert: false,
    _stepUnveraendert: false,
    thumbnailDataUrl: '',
    stepThumbnailDataUrl: '',
    delivery_date: '',
    zeichnungsdatum: '',
  };
}

function normalizeForMatch(name) {
  return name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/^(step|stp|pdf|3d)[_\-.\s]+/i, '')
    .replace(/[_\-.\s]+/g, ' ')
    .trim();
}

function filenameSimilarity(a, b) {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;

  const tokensA = a.split(' ');
  const tokensB = b.split(' ');
  const common = tokensA.filter((t) => tokensB.includes(t));
  const tokenScore = common.length / Math.max(tokensA.length, tokensB.length);
  if (tokenScore > 0.5) return tokenScore;

  let prefixLen = 0;
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) prefixLen++;
    else break;
  }
  return minLen > 0 ? prefixLen / Math.max(a.length, b.length) : 0;
}

// Nummer immer ohne Leerzeichen
function stripSpaces(s) {
  return String(s || '').replace(/\s+/g, '');
}

// Nur Buchstaben/Ziffern, klein — zum robusten Vergleich einer Teilenummer
// gegen einen Dateinamen, unabhängig von Unterstrichen/Leerzeichen/Bindestrichen.
function stripAlnum(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Dateityp-Marker ("step", "stp", "pdf", ...) am Anfang oder Ende des
// Dateinamens (z. B. "step_8f8 123 145 Schraube", "Schraube_pdf") entfernen —
// sie gehören weder zur Teilenummer noch zum Artikelnamen.
function bereinigeDateiname(base) {
  const marker = '(?:step|stp|pdf|stl|glb|gltf|3d|zeichnung|dra|drw|drawing)';
  return String(base || '')
    .replace(new RegExp(`^(?:${marker}[\\s_\\-.]+)+`, 'i'), '')
    .replace(new RegExp(`(?:[\\s_\\-.]+${marker})+$`, 'i'), '')
    .trim();
}

function parseFilename(filename) {
  const base = bereinigeDateiname((filename || 'Bauteil').replace(/\.[^.]+$/, '').trim()) || 'Bauteil';
  let zeichnungsnummer = '';

  // Explizite Trennung mit "__": links = Nummer, rechts = Name
  if (base.includes('__')) {
    const [left, ...rest] = base.split('__');
    return {
      nummer: stripSpaces(left.replace(/_/g, '')),
      name: rest.join(' ').replace(/_/g, ' ').trim() || base,
      zeichnungsnummer,
    };
  }

  // Segmente an "_" trennen; ab einem Dokumenttyp-Kürzel ("dra", "drw", ...)
  // wird alles verworfen (z. B. "216394_10246082_dra_0" → Endung für "drawing").
  const ENDUNG = /^(dra|drw|drawing|zeichnung|pdf|step|stp|stl|glb|gltf|3d)$/i;
  let segs = base.split('_').map((x) => x.trim()).filter(Boolean);
  const schnitt = segs.findIndex((x, i) => i > 0 && ENDUNG.test(x));
  if (schnitt > 0) segs = segs.slice(0, schnitt);

  // FTA-Regel: beginnt der Name mit FTA…, ist das die Zeichnungsnummer
  if (segs.length && /^FTA/i.test(segs[0])) {
    zeichnungsnummer = stripSpaces(segs.shift());
  }

  // Erstes Segment: führende Wörter MIT Ziffer = Teilenummer ("8f8 123 145"),
  // der Rest = Name. Ohne Ziffer keine Teilenummer raten.
  let nummer = '';
  const nameTeile = [];
  const ersteWoerter = (segs.shift() || '').split(/\s+/).filter(Boolean);
  if (ersteWoerter.some((w) => /\d/.test(w))) {
    let i = 0;
    while (i < ersteWoerter.length && /\d/.test(ersteWoerter[i])) { nummer += ersteWoerter[i]; i += 1; }
    nameTeile.push(...ersteWoerter.slice(i));
  } else {
    nameTeile.push(...ersteWoerter);
  }

  // Weitere Segmente: 1–3 Zeichen (mit Ziffer, oder max. 2 Buchstaben) = Teil der
  // Teilenummer; länger und mit Ziffer = Zeichnungsnummer; sonst = Name.
  for (const seg of segs) {
    const kompakt = stripSpaces(seg);
    const kurz = kompakt.length <= 3 && (/\d/.test(kompakt) || (/^[A-Za-zÄÖÜäöü]+$/.test(kompakt) && kompakt.length <= 2));
    if (nummer && !nameTeile.length && kurz) nummer += kompakt;
    else if (nummer && !nameTeile.length && !zeichnungsnummer && kompakt.length > 3 && /\d/.test(kompakt) && !/\s/.test(seg)) zeichnungsnummer = kompakt;
    else nameTeile.push(seg.replace(/\s+/g, ' '));
  }

  const name = nameTeile.join(' ').trim();
  return { nummer: stripSpaces(nummer), name: name || (nummer ? '' : base), zeichnungsnummer };
}

async function createPartFromPdf(file) {
  const parsed = parseFilename(file.name);
  const part = {
    ...createEmptyPart(parsed.name || parsed.nummer || 'Bauteil'),
    teilenummer: parsed.nummer,
    zeichnungsnummer: parsed.zeichnungsnummer || '',
    artikelname: parsed.name,
    pdfFile: markRaw(file),
  };
  parts.value = [...parts.value, part];
  try {
    part.thumbnailDataUrl = await getPdfThumbnail(file, 80);
  } catch (e) {
    console.warn('Thumbnail fehlgeschlagen', e);
  }
}

function matchModelToPart(file) {
  const normModel = normalizeForMatch(bereinigeDateiname(file.name.replace(/\.[^.]+$/, '')));
  const list = parts.value;

  // ZUERST: exakte Teilenummer im Dateinamen suchen. Wichtig bei Teilen, die
  // sich nur durch ein Revisions-/Varianten-Suffix wie "_A"/"_B" unterscheiden
  // (siehe parseFilename: dieses Suffix landet in der Teilenummer, NICHT im
  // Namen) — dann ist der Artikelname für beide Teile identisch, und ein
  // reiner Namens-Abgleich (unten) kann die STEP-Dateien nicht mehr richtig
  // zuordnen. Nur eindeutige Treffer (genau EIN passendes Teil) übernehmen.
  const dateiKompakt = stripAlnum(bereinigeDateiname(file.name.replace(/\.(step|stp|stl|glb|gltf)$/i, '')));
  const nummerTreffer = list
    .map((p, i) => i)
    .filter((i) => !list[i].stepFile && list[i].teilenummer
      && dateiKompakt.includes(stripAlnum(list[i].teilenummer)));
  if (nummerTreffer.length === 1) {
    const idx = nummerTreffer[0];
    list[idx].stepFile = markRaw(file);
    parts.value = [...list];
    return idx;
  }

  let bestIdx = -1;
  let bestScore = 0;

  for (let i = 0; i < list.length; i++) {
    if (list[i].stepFile) continue;
    const normPart = normalizeForMatch(list[i].part_name);
    const score = filenameSimilarity(normPart, normModel);
    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestIdx = i;
    }
  }

  if (bestIdx >= 0) {
    list[bestIdx].stepFile = markRaw(file);
    parts.value = [...list];
    return bestIdx;
  }
  const parsed = parseFilename(file.name);
  const part = {
    ...createEmptyPart(parsed.name || parsed.nummer || '3D-Bauteil'),
    teilenummer: parsed.nummer,
    zeichnungsnummer: parsed.zeichnungsnummer || '',
    artikelname: parsed.name,
    stepFile: markRaw(file),
  };
  parts.value = [...parts.value, part];
  return parts.value.length - 1;
}

function processDroppedFiles(allFiles) {
  const pdfs = allFiles.filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
  const models = allFiles.filter((f) => /\.(step|stp|stl|glb|gltf)$/i.test(f.name));

  pdfs.forEach((file) => createPartFromPdf(file));
  let lastIdx = parts.value.length - 1;
  models.forEach((file) => {
    lastIdx = matchModelToPart(file);
  });

  if (pdfs.length || models.length) {
    activePartIndex.value = Math.max(0, lastIdx);
  }
}

// Aus der E-Mail-Tabelle erkannte Positionen (Teilenummer/Name/Menge/Termine,
// siehe tabellen_erkennung.py) direkt als Bauteile anlegen — zuverlässiger als
// aus dem PDF-Dateinamen zu raten, weil die Menge dort nie enthalten ist.
// Mitgelieferte Dateien werden per Teilenummer im Dateinamen zugeordnet;
// Dateien ohne Treffer laufen durch die normale Dateiname-Logik.
function erstelleTeileAusPositionen(positionen, dateien) {
  const neueParts = positionen.map((pos) => {
    const part = createEmptyPart(pos.name || pos.teilenummer || 'Bauteil');
    part.teilenummer = pos.teilenummer || '';
    part.artikelname = pos.name || '';
    part.stueckzahl = pos.menge || 1;
    if (pos.liefertermin) part.delivery_date = pos.liefertermin;
    if (pos.zeichnungsdatum) part.zeichnungsdatum = pos.zeichnungsdatum;
    return part;
  });

  const restDateien = [];
  dateien.forEach((file) => {
    const normFile = normalizeForMatch(file.name);
    const treffer = neueParts.find(
      (p) => p.teilenummer && normFile.includes(normalizeForMatch(p.teilenummer)),
    );
    if (!treffer) {
      restDateien.push(file);
      return;
    }
    if (/\.pdf$/i.test(file.name)) {
      treffer.pdfFile = markRaw(file);
      getPdfThumbnail(file, 80)
        .then((dataUrl) => { treffer.thumbnailDataUrl = dataUrl; })
        .catch(() => {});
    } else if (/\.(step|stp|stl|glb|gltf)$/i.test(file.name)) {
      treffer.stepFile = markRaw(file);
    } else {
      restDateien.push(file);
    }
  });

  parts.value = [...parts.value, ...neueParts];
  activePartIndex.value = parts.value.length - Math.max(1, neueParts.length);
  if (restDateien.length) processDroppedFiles(restDateien);
}

function onDropFiles(event) {
  // Nur echte Datei-Drops verarbeiten (interne Sortier-Drops haben keine files)
  const files = Array.from(event.dataTransfer?.files || []);
  if (!files.length) return;
  processDroppedFiles(files);
}

function onFilePick(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  processDroppedFiles(files);
}

function addEmptyPart() {
  parts.value = [...parts.value, createEmptyPart('Neues Bauteil')];
  activePartIndex.value = parts.value.length - 1;
}

function deletePart(index) {
  const list = [...parts.value];
  list.splice(index, 1);
  parts.value = list;
  if (activePartIndex.value >= list.length) {
    activePartIndex.value = Math.max(0, list.length - 1);
  }
}

// Löscht/aktualisiert über die Bauteil-ID statt über activePartIndex — WICHTIG
// seit PartCard in <KeepAlive> steckt (siehe App.vue-Template): Läuft dort
// gerade noch eine asynchrone STEP-Analyse (Volumen/Vorschaubild) für ein
// Bauteil, das der Nutzer inzwischen verlassen hat, würde ein auf
// activePartIndex basierender Handler das Ergebnis auf das FALSCHE (inzwischen
// aktive) Bauteil schreiben — genau das hat "überschreibt jedes Teil mit
// einem anderen" verursacht. Die ID wird beim Erzeugen des Handlers (Klick-
// Zeitpunkt bzw. Render der Vorlage) als reiner Wert eingefangen, bleibt also
// auch dann korrekt, wenn activePartIndex sich später ändert.
function deletePartById(id) {
  const index = parts.value.findIndex((p) => p.id === id);
  if (index < 0) return;
  deletePart(index);
}

// Basis-Stückpreis jeder Staffel automatisch aus Rüstkosten/Stückkosten/
// Material/Pauschal nachziehen, SOBALD sich eines dieser Kostenfelder ändert
// — wie früher gewohnt. WICHTIG (Unterschied zur alten, kaputten Version):
// triggert NUR bei diesen konkreten Kostenfeldern, NICHT wenn 'price_tiers'
// selbst im Update steckt (das war der eigentliche Bug: jede Änderung AN der
// Staffelpreis-Tabelle — auch eine Menge oder ein Extra-Wert — hat sofort
// wieder sich selbst überschrieben). Menge und "Extra" pro Staffel bleiben
// hier immer unangetastet.
const STAFFEL_KOSTEN_KEYS = ['setup_cost', 'unit_cost', 'material_cost', 'pauschal_material'];
function staffelStueckpreiseAktualisieren(part) {
  if (!part.use_staffelpreise || !Array.isArray(part.price_tiers)) return;
  const setup = Number(part.setup_cost) || 0;
  const unitCost = Number(part.unit_cost) || 0;
  const material = Number(part.material_cost) || 0;
  const pauschal = Number(part.pauschal_material) || 0;
  part.price_tiers = part.price_tiers.map((t) => {
    const qty = Math.max(1, Number(t.qty) || 1);
    const stueckpreis = (setup + pauschal) / qty + unitCost + material;
    return { ...t, unit_price: Number(stueckpreis.toFixed(2)) };
  });
}

function updatePartById(id, updated) {
  const list = parts.value;
  const part = list.find((p) => p.id === id);
  if (!part) return;
  if (updated.pdfFile instanceof File) updated.pdfFile = markRaw(updated.pdfFile);
  if (updated.stepFile instanceof File) updated.stepFile = markRaw(updated.stepFile);
  Object.assign(part, updated);
  if (updated.pdfFile && !updated.thumbnailDataUrl) {
    getPdfThumbnail(updated.pdfFile, 80)
      .then((dataUrl) => { part.thumbnailDataUrl = dataUrl; })
      .catch(() => {});
  }
  if (STAFFEL_KOSTEN_KEYS.some((k) => k in updated)) {
    staffelStueckpreiseAktualisieren(part);
  }
  parts.value = [...list];
}

// STEP-Dateien aller Bauteile im Hintergrund verarbeiten (Anzeige-Netz +
// Volumen/Flächen/Kanten in einem Web Worker) — nicht erst beim Anklicken.
watch(
  () => parts.value.map((p) => p.stepFile),
  () => {
    for (const p of parts.value) {
      if (p.stepFile && /\.(step|stp)$/i.test(p.stepFile.name || '')) planeAnalyse(p.id, p.stepFile);
    }
  },
  { flush: 'post', immediate: true },
);
setzeAnalyseCallback((partId, file, erg) => {
  const p = parts.value.find((x) => x.id === partId);
  if (p && p.stepFile === file && !p.exakt_volumen_mm3) {
    updatePartById(partId, { exakt_volumen_mm3: erg.volumeMm3, exakt_oberflaeche_mm2: erg.oberflaecheMm2 });
  }
});

// Vorschaubild sofort aus dem Hintergrund-Netz erzeugen (vorläufig — der Viewer
// ersetzt es später durch sein eigenes, wenn das Bauteil geöffnet wird).
setzeMeshCallback((partId, file, meshes) => {
  const p = parts.value.find((x) => x.id === partId);
  if (!p || p.stepFile !== file || p.stepThumbnailDataUrl) return;
  try {
    const url = renderMeshThumbnail(meshes);
    if (url) updatePartById(partId, { stepThumbnailDataUrl: url, _stepThumbVorlaeufig: true });
  } catch (e) {
    console.warn('Hintergrund-Vorschaubild fehlgeschlagen', e);
  }
});

function priceForQty(part, qty) {
  const q = Math.max(1, Number(qty) || 1);
  const setup = Number(part.setup_cost) || 0;
  const unitCost = Number(part.unit_cost) || 0;
  const materialProSt = Number(part.material_cost) || 0;
  const pauschal = Number(part.pauschal_material) || 0;
  const sonder = Number(part.sonderkosten) || 0;
  const express = Number(part.expresskosten) || 0;
  const mess = Number(part.messkosten) || 0;
  const total = setup + (unitCost + materialProSt) * q + pauschal + sonder + express + mess;
  return { unit: total / q, total };
}

// Kleinste Staffel (nach Menge sortiert) + deren Gesamtbetrag — inkl. "Extra"-
// Spalte und ggf. eingerechneter Mess-/Sonder-/Expresskosten. Muss dieselbe
// Rechnung wie buildItemRows() (Fall A) in quotationPdf.js ergeben, sonst
// weicht die Vorschau hier vom tatsächlichen Angebots-PDF ab.
function kleinsteStaffel(part) {
  const tiers = (part.price_tiers || [])
    .filter((t) => Number(t.qty) > 0)
    .map((t) => ({ qty: Number(t.qty), unit: Number(t.unit_price) || 0, extra: Number(t.extra_price) || 0 }))
    .sort((a, b) => a.qty - b.qty);
  const kleinste = tiers[0];
  if (!kleinste) return null;
  const eingerechneteFixkosten = (part.messkosten_in_stueckpreis ? Number(part.messkosten) || 0 : 0)
    + (part.sonderkosten_in_stueckpreis ? Number(part.sonderkosten) || 0 : 0)
    + (part.expresskosten_in_stueckpreis ? Number(part.expresskosten) || 0 : 0);
  const stueckAnteil = kleinste.qty > 0 ? eingerechneteFixkosten / kleinste.qty : 0;
  const effektiverStueckpreis = kleinste.unit + kleinste.extra + stueckAnteil;
  return { ...kleinste, effektiverStueckpreis, gesamt: effektiverStueckpreis * kleinste.qty };
}

function getPartTotal(part) {
  if (part.use_staffelpreise) {
    const kleinste = kleinsteStaffel(part);
    if (!kleinste) return 0;
    let summe = kleinste.gesamt;
    if (!part.messkosten_in_stueckpreis) summe += Number(part.messkosten) || 0;
    if (!part.sonderkosten_in_stueckpreis) summe += Number(part.sonderkosten) || 0;
    if (!part.expresskosten_in_stueckpreis) summe += Number(part.expresskosten) || 0;
    return summe;
  }
  return priceForQty(part, part.stueckzahl).total;
}

// Gesamt-Netto aller Positionen (für die linke Übersicht)
const angebotNetto = computed(() =>
  parts.value.reduce((sum, p) => sum + getPartTotal(p), 0),
);

// Tatsächlicher Stückpreis (pro Stück, ohne Einmalkosten)
function stueckPreisOf(part) {
  const menge = Math.max(1, Number(part.stueckzahl) || 1);
  return baseBetrag(part) / menge;
}

// Reiner Stück-Anteil (ohne Einmalkosten) × Menge — für die Übersichts-Aufschlüsselung.
// Ist "Rüstkosten in Stückpreis einrechnen" aktiv, zählen die Rüstkosten
// (÷ Menge) mit in diesen Anteil, statt separat als Rüstkosten-Zeile zu
// erscheinen — analog zu "Pauschal Materialkosten in Stückpreis einrechnen".
function baseBetrag(part) {
  const menge = Math.max(1, Number(part.stueckzahl) || 1);
  const pauschal = Number(part.pauschal_material) || 0;
  const setup = Number(part.setup_cost) || 0;
  const mess = Number(part.messkosten) || 0;
  const sonder = Number(part.sonderkosten) || 0;
  const express = Number(part.expresskosten) || 0;
  const stueck = (Number(part.unit_cost) || 0) + (Number(part.material_cost) || 0)
    + (part.pauschal_als_zeile ? 0 : pauschal / menge)
    + (part.ruestkosten_in_stueckpreis ? setup / menge : 0)
    + (part.messkosten_in_stueckpreis ? mess / menge : 0)
    + (part.sonderkosten_in_stueckpreis ? sonder / menge : 0)
    + (part.expresskosten_in_stueckpreis ? express / menge : 0);
  return stueck * menge;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

// Übergibt die kompletten Bauteil-Objekte (inkl. pdfFile/stepFile) — die
// Trennung "was ist JSON-fähig / was gehört in IndexedDB" übernimmt
// speichereAngebot() selbst, siehe utils/angebotsHistorie.js.
const speichernLaeuft = ref(false);
async function onSave() {
  if (speichernLaeuft.value) return; // Doppelklick/Mehrfachauslösung ignorieren
  speichernLaeuft.value = true;
  try {
    const eintrag = await speichereAngebot({
      rfq,
      parts: parts.value,
      angebot_notiz: angebot_notiz.value,
      angebot_info: angebot_info.value,
      globalDefaults: JSON.parse(JSON.stringify(globalDefaults)),
      gesamtNetto: angebotNetto.value,
    });
    rfq.erstellt = eintrag.erstellt;
    rfq.aktualisiert = eintrag.aktualisiert;
  } catch (e) {
    console.error('Angebot konnte nicht gespeichert werden', e);
    alert('Angebot konnte nicht gespeichert werden: ' + e.message
      + (nasVerbunden.value ? '' : '\n\nFalls der NAS-Ordner betroffen ist: oben auf den NAS-Button klicken, um die Verbindung zu erneuern.'));
    return;
  } finally {
    speichernLaeuft.value = false;
  }
  refreshHistorie();
}

// --- Angebotshistorie (localStorage oder NAS-Ordner, siehe utils/angebotsHistorie.js) ---
const showHistorie = ref(false);
const historieFilter = ref('alle');
const historie = ref([]);
async function refreshHistorie() {
  try {
    historie.value = await getHistorie();
  } catch (e) {
    console.error('Angebotshistorie konnte nicht geladen werden', e);
    alert('Angebotshistorie konnte nicht geladen werden: ' + e.message);
  }
}
refreshHistorie();

// --- NAS-Ordner-Verbindung (mehrere PCs sehen dieselben Angebote) ---
const nasUnterstuetzt = ref(nasVerfuegbar());
const nasVerbunden = ref(false);
const nasBrauchtBestaetigung = ref(false);
const nasOrdnerNameAnzeige = ref('');
async function pruefeNasVerbindung() {
  const status = await nasStatus();
  nasVerbunden.value = status.verbunden;
  nasBrauchtBestaetigung.value = status.brauchtBestaetigung;
  nasOrdnerNameAnzeige.value = status.name || '';
}
pruefeNasVerbindung();

async function onNasVerbinden() {
  // Bereits verbunden, Berechtigung ist nur abgelaufen (z.B. neuer Tag) ->
  // nur erneut bestätigen (braucht Klick, aber KEINEN neuen Ordner-Dialog).
  if (nasBrauchtBestaetigung.value && !nasVerbunden.value) {
    try {
      const ordner = await bestaetigeBerechtigung();
      if (ordner) {
        await pruefeNasVerbindung();
        await refreshHistorie();
      } else {
        alert('Berechtigung wurde nicht erteilt.');
      }
    } catch (e) {
      alert('Bestätigen fehlgeschlagen: ' + e.message);
    }
    return;
  }
  try {
    // Direkt das frisch ausgewählte Handle verwenden (nicht erneut aus dem
    // Speicher laden) — unmittelbar danach kann eine erneute Berechtigungs-
    // abfrage auf dem wiederhergestellten Handle fälschlich "prompt" statt
    // "granted" liefern und dadurch alles verstecken.
    const ordner = await waehleNasOrdner();
    nasVerbunden.value = true;
    nasBrauchtBestaetigung.value = false;
    nasOrdnerNameAnzeige.value = ordner.name;

    const lokaleAnzahl = getHistorieLokalCount();
    if (lokaleAnzahl > 0 && confirm(`${lokaleAnzahl} bisher nur lokal gespeicherte Angebote gefunden. Jetzt auf den NAS-Ordner übertragen, damit sie für alle PCs sichtbar werden?`)) {
      const anzahl = await uebertrageLokaleAngeboteAufNas(ordner);
      alert(`${anzahl} Angebot(e) übertragen.`);
    }
    await refreshHistorie();
  } catch (e) {
    if (e?.name !== 'AbortError') alert('NAS-Ordner konnte nicht verbunden werden: ' + e.message);
  }
}

function getHistorieLokalCount() {
  try {
    const raw = localStorage.getItem('angebotsHistorie');
    return raw ? JSON.parse(raw).length : 0;
  } catch (e) {
    return 0;
  }
}

const historieGefiltert = computed(() => {
  if (historieFilter.value === 'alle') return historie.value;
  if (historieFilter.value === 'offen') return historie.value.filter((e) => e.status !== STATUS.FERTIG);
  return historie.value.filter((e) => e.status === historieFilter.value);
});

async function ladeAusHistorie(eintrag) {
  const snap = eintrag.snapshot;
  if (!snap) return;
  Object.assign(rfq, snap.rfq);
  rfq.erstellt = eintrag.erstellt;
  rfq.aktualisiert = eintrag.aktualisiert;
  // PDF/STEP-Dateien wurden getrennt in IndexedDB/NAS gesichert (Schlüssel =
  // part.id zum Speicherzeitpunkt) — deshalb die ID aus dem Snapshot BEIBEHALTEN
  // statt neu zu würfeln. Eine zufällige neue ID hier hätte beim nächsten
  // Speichern dazu geführt, dass die (unverändert gebliebene, siehe unten)
  // Datei unter der ALTEN ID auf dem Speicher liegen bleibt, während das neue
  // JSON-Snapshot bereits auf eine andere ID zeigt — beim übernächsten Öffnen
  // wäre die Datei dann nicht mehr auffindbar gewesen (STEP "verschwindet").
  const dateien = await ladeGespeicherteDateien(eintrag);
  parts.value = await Promise.all((snap.parts || []).map(async (p) => {
    const part = { ...createEmptyPart(), ...p, id: p.id || crypto.randomUUID() };
    const gefunden = dateien[p.id];
    // Frisch aus dem Speicher geladene Dateien sind bereits korrekt auf der
    // NAS/in IndexedDB — als "unverändert" markieren, damit ein Speichern
    // NACH kleinen weiteren Änderungen sie nicht unnötig neu schreibt (siehe
    // onSave()/angebotsHistorie.js). Nur ein NEUES manuelles Auswählen einer
    // Datei setzt das später wieder zurück (siehe PartCard.vue).
    if (gefunden?.pdfFile) {
      part.pdfFile = markRaw(gefunden.pdfFile);
      part._pdfUnveraendert = true;
      try { part.thumbnailDataUrl = await getPdfThumbnail(gefunden.pdfFile, 80); } catch (e) { /* ignore */ }
    } else {
      part._pdfUnveraendert = false;
    }
    if (gefunden?.stepFile) {
      part.stepFile = markRaw(gefunden.stepFile);
      part._stepUnveraendert = true;
    } else {
      part._stepUnveraendert = false;
    }
    return part;
  }));
  angebot_notiz.value = snap.angebot_notiz || '';
  angebot_info.value = snap.angebot_info || '';
  if (snap.globalDefaults) Object.assign(globalDefaults, snap.globalDefaults);
  activePartIndex.value = 0;
  showHistorie.value = false;
}

async function aendereStatus(eintrag, status) {
  await setzeStatus(eintrag.id, status);
  refreshHistorie();
}

function onCreateQuotation() {
  console.log('ERPNext-Angebot erzeugen – Platzhalter');
}

function onPreviewPdf() {
  openQuotationPrint(rfq, parts.value, angebot_notiz.value, angebot_info.value, {
    showImages: bildImPdf.value,
  });
}

function onSendEmail() {
  console.log('Per E-Mail senden – Platzhalter (AW: auf Anfrage, PDF im Anhang)');
}

// --- Posteingang: E-Mail-Anfragen über die lokale Mail-Bridge (siehe mail_bridge.py) ---
// Ablauf (bewusst zweistufig, nichts automatisch): 1) Vorschau abrufen (liest nur
// Kopfzeilen, speichert nichts) 2) Nutzer wählt aus 3) erst dann werden Anhänge
// geholt — und selbst dann werden nur Bauteil-ENTWÜRFE angelegt, kein Versand o.Ä.
const showPosteingang = ref(false);
const bridgeTokenInput = ref('');
const posteingangLaedt = ref(false);
const posteingangFehler = ref('');
const posteingangGeprueft = ref(false);
const gefundeneMails = ref([]);
const ausgewaehlteNums = ref([]);
const importLaedt = ref(false);
const tokenSichtbar = ref(false);
const verbindungStatus = ref('');
const verbindungOk = ref(false);

function oeffnePosteingang() {
  bridgeTokenInput.value = getToken();
  posteingangFehler.value = '';
  posteingangGeprueft.value = false;
  gefundeneMails.value = [];
  ausgewaehlteNums.value = [];
  verbindungStatus.value = '';
  showPosteingang.value = true;
}

async function onVerbindungTesten() {
  verbindungStatus.value = 'Teste …';
  try {
    await pruefeVerbindung();
    verbindungOk.value = true;
    verbindungStatus.value = '✓ Bridge erreichbar (unabhängig vom Token)';
  } catch (e) {
    verbindungOk.value = false;
    verbindungStatus.value = 'Bridge nicht erreichbar — läuft start_mail_bridge.bat?';
  }
}

function onTokenChange() {
  setToken(bridgeTokenInput.value);
}

async function onPruefeNeueAnfragen() {
  setToken(bridgeTokenInput.value);
  posteingangFehler.value = '';
  posteingangLaedt.value = true;
  ausgewaehlteNums.value = [];
  try {
    gefundeneMails.value = await holeVorschau(2);
  } catch (e) {
    posteingangFehler.value = 'Mail-Bridge nicht erreichbar oder Token falsch: ' + e.message;
    gefundeneMails.value = [];
  } finally {
    posteingangLaedt.value = false;
    posteingangGeprueft.value = true;
  }
}

async function onImportiereAusgewaehlte() {
  importLaedt.value = true;
  posteingangFehler.value = '';
  try {
    const anfragen = await importiereAusgewaehlte(ausgewaehlteNums.value);
    anfragen.forEach((a) => {
      const dateien = (a.dateien || []).map((d) => base64ZuDatei(d.name, d.base64));
      if (a.positionen && a.positionen.length) {
        // Tabelle in der E-Mail gefunden (Teilenummer/Name/Menge/Termine) —
        // zuverlässiger als aus dem Dateinamen zu raten
        erstelleTeileAusPositionen(a.positionen, dateien);
      } else {
        processDroppedFiles(dateien);
      }
    });
    showPosteingang.value = false;
  } catch (e) {
    posteingangFehler.value = 'Import fehlgeschlagen: ' + e.message;
  } finally {
    importLaedt.value = false;
  }
}
</script>
