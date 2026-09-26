# STEP-3D-Vorschau: WASM-Datei einrichten (Option A – lokale Datei)

Damit STEP-Dateien in der App als 3D-Modell angezeigt werden, wird die Datei **occt-import-js.wasm** benötigt. Sie wird **nur lokal** in Ihrem Projekt verwendet – es werden keine STEP-Daten ins Internet übertragen.

---

## 1. ZIP heruntergeladen (z. B. Version 23) – was jetzt?

- **ZIP entpacken:** Entpacken Sie die heruntergeladene ZIP-Datei in einen Ordner (z. B. auf den Desktop oder direkt in den Ordner **Angebots UI**).
- **WASM suchen:** Suchen Sie in den entpackten Dateien nach **occt-import-js.wasm**.
  - Oft liegt sie im Unterordner **dist/** (z. B. `occt-import-js-0.0.23/dist/occt-import-js.wasm`).
  - Hinweis: Bei „Source code (zip)“ von GitHub enthält das Paket manchmal **nur Quellcode** und **keine** fertige .wasm-Datei. Dann siehe unten „Wenn keine .wasm in der ZIP ist“.

---

## 2. WASM ins Projekt legen

### Variante A: Skript nutzen (empfohlen)

1. Die entpackte ZIP liegt **im oder unter** dem Projektordner **Angebots UI**.
2. Im Projektordner in der Konsole ausführen:
   ```bash
   node scripts/copy-occt-wasm.js
   ```
   Das Skript sucht **occt-import-js.wasm** an typischen Stellen und kopiert sie nach **public/**.

### Variante B: Manuell

1. Die Datei **occt-import-js.wasm** in den Ordner **public/** des Projekts kopieren.
2. Vollständiger Pfad:  
   `Angebots UI/public/occt-import-js.wasm`

Die App lädt die Datei **nur** von dort – kein Abruf von externen Servern bei der STEP-Vorschau.

---

## Wenn keine .wasm in der ZIP ist

Wenn Sie nur Quellcode (keine **occt-import-js.wasm**) haben:

1. Auf der Release-Seite prüfen, ob es einen **separaten Asset** namens **occt-import-js.wasm** gibt:  
   **https://github.com/kovacsv/occt-import-js/releases**
2. Falls dort eine .wasm-Datei zum Download angeboten wird, diese herunterladen und wie oben in **public/** legen (oder Skript nutzen).
3. Optional (einmalig):  
   **https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/**  
   öffnen – wenn **occt-import-js.wasm** gelistet ist, einmal herunterladen und in **public/** speichern.
4. Wenn ein **Checksummen-Hash** (z. B. SHA-256) angegeben ist, die heruntergeladene Datei damit prüfen.

---

## 3. Prüfen

1. App starten (z. B. `npm run dev` oder Ihre Start-Batch).
2. Eine STEP-Datei (.step / .stp) in der App auswählen oder dem Bauteil zuweisen.
3. Die 3D-Vorschau sollte das Modell anzeigen.  
   Wenn stattdessen eine Meldung erscheint, dass die WASM-Datei fehlt, prüfen Sie, ob **public/occt-import-js.wasm** existiert und der Dateiname exakt so lautet.

---

## Sicherheit & Datenschutz

- Die WASM-Datei wird **nur lokal** in Ihrem Projekt verwendet.
- STEP-Dateien werden **nur im Browser** verarbeitet und **nicht** an Dritte oder Server gesendet.
- Quelle: Open-Source-Projekt **occt-import-js** (OpenCASCADE für den Browser).  
  Repository: https://github.com/kovacsv/occt-import-js
