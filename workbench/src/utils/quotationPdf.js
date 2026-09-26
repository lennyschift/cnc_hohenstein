// ============================================================
//  Angebots-PDF — komplett lokal im Browser, ohne ERPNext.
//  Orientiert am ERPNext-Beispiel + Briefpapier-Vorlage.
//  Echtes Briefpapier (Kopf/Fuß als Grafik), A4, druckfertig.
// ============================================================

const BASIS = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
const KOPF_PFAD = `${BASIS}briefkopf.jpg`;
const FUSS_PFAD = `${BASIS}brieffuss.jpg`;

// Standardtexte / Konditionen (zentral anpassbar)
export const FIRMA = {
  mwst_satz: 19,                       // Prozent
  preise_hinweis: 'Preise nur gültig im Gesamtpaket.',
  gueltigkeit_wochen: 4,
  abschlusssatz: 'Über eine Auftragserteilung würden wir uns freuen und verbleiben',
  signatur: 'MFG Andrea Hohenstein',
};

// --- Formatierung -----------------------------------------------------------
function betrag(value) {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0);
}
function zahl(value, dezimal = 0) {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: dezimal, maximumFractionDigits: dezimal }).format(Number(value) || 0);
}
function datumDE(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE');
}
function escapeHtml(text) {
  return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function nl2br(text) { return escapeHtml(text).replace(/\n/g, '<br>'); }

// --- Beschreibungstext für eine Position ------------------------------------
function noSpace(s) {
  return escapeHtml(String(s || '').replace(/\s+/g, ''));
}

function beschreibungHtml(part) {
  const beschr = [];
  if (part.notiz) beschr.push(escapeHtml(part.notiz));
  if (part.zeichnungsnummer) beschr.push(`Zeichnungsnr.: ${noSpace(part.zeichnungsnummer)}`);
  // Material im PDF: NUR wenn explizit angehakt, UND nur Sorte + Zustand
  // (bewusst NICHT Durchmesser/Maße, NICHT Gewicht — das ist interne Kalkulationsinfo).
  if (part.material_im_pdf) {
    if (part.material) beschr.push(`Material: ${escapeHtml(part.material)}`);
    if (part.zustand) beschr.push(`Zustand: ${escapeHtml(part.zustand)}`);
  }
  // Oberfläche (+ Zusatzinfo) IMMER in der Beschreibung, unabhängig vom
  // Material-Haken — ist meist eine Fertigungsanweisung, keine interne Info.
  if (part.oberflaeche) {
    beschr.push(`Oberfläche: ${escapeHtml(part.oberflaeche)}${part.oberflaechen_info ? ' – ' + escapeHtml(part.oberflaechen_info) : ''}`);
  }
  if (part.is_serial) beschr.push('inkl. Seriennummern-Vergabe');
  // WAZ, Gewicht, Materialwerte, Rohmaterial-Maße sind interne Kalkulationsinfo → NICHT in der Kunden-PDF.
  return beschr.length ? beschr.join('<br>') : '';
}

// Kleines Bauteilbild für die Beschreibungsspalte (3D-Screenshot bevorzugt, sonst PDF-Vorschau)
function bildHtml(part, showImages) {
  if (!showImages) return '';
  const src = part.stepThumbnailDataUrl || part.thumbnailDataUrl;
  if (!src) return '';
  return `<img src="${src}" alt="" style="max-width:26mm;max-height:22mm;display:block;margin-bottom:3px;" />`;
}

// --- Staffel: passende Stufe zur Stückzahl ----------------------------------
function tiersSorted(part) {
  return (part.price_tiers || []).filter((t) => Number(t.qty) > 0)
    .map((t) => ({ qty: Number(t.qty), unit: Number(t.unit_price) || 0, extra: Number(t.extra_price) || 0 }))
    .sort((a, b) => a.qty - b.qty);
}

// --- Eine Bauteil-Zeile (Haupt + ↳-Unterzeilen) -----------------------------
function buildItemRows(part, pos, showImages) {
  const menge = Math.max(1, Number(part.stueckzahl) || 1);
  const bild = bildHtml(part, showImages);
  const teilenr = noSpace(part.teilenummer);
  const bezeichnung = escapeHtml(part.artikelname || part.part_name || 'Bauteil');
  const beschr = beschreibungHtml(part);

  // ===== Fall A: Staffelpreise — alle Kosten in Stückpreise, Stufen als Zeilen =====
  if (part.use_staffelpreise) {
    const tiers = tiersSorted(part);
    // Mess-/Sonder-/Expresskosten, die laut Haken "in (Staffel-)Stückpreis
    // eingerechnet" statt als eigene Position erscheinen sollen — werden PRO
    // STAFFEL durch deren jeweilige Menge geteilt (analog zu ruestkosten_in_
    // stueckpreis in Fall B) und dem Stückpreis dieser Stufe zugeschlagen.
    const eingerechneteFixkosten = (part.messkosten_in_stueckpreis ? Number(part.messkosten) || 0 : 0)
      + (part.sonderkosten_in_stueckpreis ? Number(part.sonderkosten) || 0 : 0)
      + (part.expresskosten_in_stueckpreis ? Number(part.expresskosten) || 0 : 0);

    const berechneteTiers = tiers.map((t) => {
      const stueckAnteil = t.qty > 0 ? eingerechneteFixkosten / t.qty : 0;
      // "Extra"-Spalte (siehe PriceTable.vue) wird direkt zum Stückpreis addiert.
      const effektiverStueckpreis = t.unit + t.extra + stueckAnteil;
      return { ...t, effektiverStueckpreis, gesamt: effektiverStueckpreis * t.qty };
    });

    // Kleinste Staffel als Betrag in den Gesamtbetrag einrechnen (qty × Stückpreis)
    const kleinste = berechneteTiers[0];
    let summe = kleinste ? kleinste.gesamt : 0;

    let rows = `
      <tr class="main-row">
        <td class="pos">${pos}</td>
        <td class="tnr">${teilenr}</td>
        <td class="art"><strong>${bezeichnung}</strong></td>
        <td class="desc">${bild}${beschr}</td>
        <td class="center nowrap"></td>
        <td class="right nowrap"></td>
        <td class="right nowrap"></td>
      </tr>
      <tr class="staffel-head">
        <td></td>
        <td colspan="3">Staffelpreise:</td>
        <td></td><td></td><td></td>
      </tr>`;
    berechneteTiers.forEach((t, i) => {
      const last = i === berechneteTiers.length - 1 ? ' sub-last' : '';
      rows += `
        <tr class="sub-row${last}">
          <td></td>
          <td colspan="3" class="sub-label"><span class="arrow">&#8627;</span> ab ${zahl(t.qty)} Stück</td>
          <td class="center nowrap">${zahl(t.qty)}</td>
          <td class="right nowrap">${betrag(t.effektiverStueckpreis)}</td>
          <td class="right nowrap">${betrag(t.gesamt)}</td>
        </tr>`;
    });

    // Kosten, die NICHT eingerechnet sind, erscheinen als eigene (einmalige,
    // nicht pro Staffel wiederholte) Position — wie in Fall B.
    const subs = [];
    const add = (label, value, eingerechnet, text) => {
      const v = Number(value) || 0;
      if (v <= 0 || eingerechnet) return;
      summe += v;
      subs.push({ label, value: v, text: text || '' });
    };
    add('Messkosten', part.messkosten, part.messkosten_in_stueckpreis);
    add('Expresszuschlag', part.expresskosten, part.expresskosten_in_stueckpreis, part.express_text);
    add('Sonderkosten', part.sonderkosten, part.sonderkosten_in_stueckpreis, part.sonder_text);
    subs.forEach((s) => {
      const textHtml = s.text ? `<div class="sub-text">${nl2br(s.text)}</div>` : '';
      rows += `
        <tr class="sub-row">
          <td></td>
          <td colspan="3" class="sub-label"><span class="arrow">&#8627;</span> ${escapeHtml(s.label)}${textHtml}</td>
          <td></td>
          <td></td>
          <td class="right nowrap">+ ${betrag(s.value)}</td>
        </tr>`;
    });

    return { html: rows, summe };
  }

  // ===== Fall B: Festpreis — Einmalkosten als ↳-Zeilen =====
  const pauschalAlsZeile = !!part.pauschal_als_zeile;
  const pauschal = Number(part.pauschal_material) || 0;
  const ruestkostenEingerechnet = !!part.ruestkosten_in_stueckpreis;
  const setupKosten = Number(part.setup_cost) || 0;
  const messEingerechnet = !!part.messkosten_in_stueckpreis;
  const sonderEingerechnet = !!part.sonderkosten_in_stueckpreis;
  const expressEingerechnet = !!part.expresskosten_in_stueckpreis;
  // Stückpreis: Stückkosten + Material/St. (+ Pauschale/Stück, falls NICHT eigene
  // Zeile) (+ Rüst-/Mess-/Sonder-/Expresskosten/Stück, jeweils falls "in
  // Stückpreis einrechnen" aktiv statt als eigene ↳-Zeile)
  const stueckPreis = (Number(part.unit_cost) || 0) + (Number(part.material_cost) || 0)
    + (pauschalAlsZeile ? 0 : pauschal / menge)
    + (ruestkostenEingerechnet ? setupKosten / menge : 0)
    + (messEingerechnet ? (Number(part.messkosten) || 0) / menge : 0)
    + (sonderEingerechnet ? (Number(part.sonderkosten) || 0) / menge : 0)
    + (expressEingerechnet ? (Number(part.expresskosten) || 0) / menge : 0);
  const hauptBetrag = stueckPreis * menge;

  let rows = `
    <tr class="main-row">
      <td class="pos">${pos}</td>
      <td class="tnr">${teilenr}</td>
      <td class="art"><strong>${bezeichnung}</strong></td>
      <td class="desc">${bild}${beschr}</td>
      <td class="center nowrap">${zahl(menge)}</td>
      <td class="right nowrap">${betrag(stueckPreis)}</td>
      <td class="right nowrap">${betrag(hauptBetrag)}</td>
    </tr>`;

  let summe = hauptBetrag;
  const subs = [];
  const add = (label, value, text) => {
    const v = Number(value) || 0;
    if (v <= 0) return;
    summe += v;
    subs.push({ label, value: v, text: text || '' });
  };
  if (!ruestkostenEingerechnet) add('Rüstkosten', part.setup_cost);
  if (!messEingerechnet) add('Messkosten', part.messkosten);
  if (!expressEingerechnet) add('Expresszuschlag', part.expresskosten, part.express_text);
  if (!sonderEingerechnet) add('Sonderkosten', part.sonderkosten, part.sonder_text);
  if (pauschalAlsZeile) add('Materialpauschale', pauschal);

  subs.forEach((s) => {
    const textHtml = s.text ? `<div class="sub-text">${nl2br(s.text)}</div>` : '';
    rows += `
      <tr class="sub-row">
        <td></td>
        <td colspan="3" class="sub-label"><span class="arrow">&#8627;</span> ${escapeHtml(s.label)}${textHtml}</td>
        <td></td>
        <td></td>
        <td class="right nowrap">+ ${betrag(s.value)}</td>
      </tr>`;
  });
  // Positionssumme (Strich + zusammengerechneter Betrag) nur wenn Kostenpositionen vorhanden
  if (subs.length) {
    rows += `
      <tr class="sub-row pos-summe sub-last">
        <td></td>
        <td colspan="3"></td>
        <td></td>
        <td></td>
        <td class="right nowrap"><span class="pos-sum">${betrag(summe)}</span></td>
      </tr>`;
  }
  return { html: rows, summe };
}

// --- Vollständiges HTML-Dokument --------------------------------------------
function buildHtml(rfq, parts, angebotNotiz, angebotInfo, kopfSrc, fussSrc, showImages) {
  let rowsHtml = '';
  let nettoSumme = 0;
  parts.forEach((part, i) => {
    const { html, summe } = buildItemRows(part, i + 1, showImages);
    rowsHtml += html;
    nettoSumme += summe;
  });

  const mwstBetrag = nettoSumme * (FIRMA.mwst_satz / 100);
  const bruttoSumme = nettoSumme + mwstBetrag;
  const angebotsNr = rfq.rfq_number || '—';
  const heute = new Date().toLocaleDateString('de-DE');
  const lieferzeit = (rfq.kundenliefertermin && rfq.kundenliefertermin.trim()) || 'nach Absprache';

  const kopfHtml = kopfSrc ? `<div class="brief-head"><img src="${kopfSrc}" alt=""></div>` : '';
  const fussHtml = fussSrc ? `<div class="brief-foot"><img src="${fussSrc}" alt=""></div>` : '';
  const infoHtml = angebotInfo ? `<div class="angebot-info">INFO: ${nl2br(angebotInfo)}</div>` : '';

  // Empfänger: erste Zeile = Firma, danach Ansprechpartner (eigene Zeile), danach restliche Adresse
  const kundeZeilen = (rfq.customer_name || 'Kunde').split('\n');
  const firmaZeile = kundeZeilen[0] || 'Kunde';
  const restZeilen = kundeZeilen.slice(1).map((z) => escapeHtml(z)).join('<br>');
  const empfaengerHtml = `
    <div class="kunde">${escapeHtml(firmaZeile)}</div>
    ${rfq.ansprechpartner_name ? `<div class="kontakt-zeile">${escapeHtml(rfq.ansprechpartner_name)}</div>` : ''}
    ${restZeilen ? `<div class="kunde-rest">${restZeilen}</div>` : ''}
  `;
  // Interne Notiz (angebotNotiz) wird BEWUSST NICHT in der Kunden-PDF ausgegeben.

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Angebot ${escapeHtml(angebotsNr)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, 'Segoe UI', Helvetica, sans-serif; color:#000; font-size:11px; }

  /* ===== A4 + mehrseitig: Kopf/Fuß wiederholen sich auf JEDER Seite (thead/tfoot) ===== */
  .sheet { width: 210mm; background: #fff; }
  @media screen {
    body { background: #525659; }
    .sheet { margin: 14px auto; min-height: 297mm; box-shadow: 0 0 10px rgba(0,0,0,.5); }
    /* Inhalt füllt die Seite → Fußzeile klebt unten (nur Vorschau; Druck nutzt tfoot) */
    .content { min-height: 230mm; }
  }
  @media print {
    @page { size: A4; margin: 0; }
    .sheet { width: auto; margin: 0; box-shadow: none; }
    .no-print { display: none !important; }
  }
  table.report { width: 100%; border-collapse: collapse; }
  table.report > thead { display: table-header-group; }
  table.report > tfoot { display: table-footer-group; }
  table.report > tbody > tr > td { padding: 0; vertical-align: top; }

  /* Briefpapier (in Kopf-/Fußbereich) — 7,5 mm zum Papierrand, 16 mm seitlich */
  .brief-head { padding: 7.5mm 16mm 0 16mm; }
  .brief-foot { padding: 0 16mm 7.5mm 16mm; }
  .brief-head img, .brief-foot img { width: 100%; display: block; }

  /* keine Waisen-Zeilen: ganze Blöcke zusammenhalten */
  .items tr.main-row, .items tr.sub-row, .items tr.staffel-head { page-break-inside: avoid; }
  .abschluss { page-break-inside: avoid; }

  .content { flex: 1 0 auto; padding: 0 16mm; }

  /* Kopf: Kunde links, Meta rechts */
  .kopf-grid { display:flex; justify-content:space-between; align-items:flex-start; margin-top:10mm; gap:10mm; }
  .empfaenger { font-size:12.5px; line-height:1.45; }
  .empfaenger .kunde { font-weight:600; }
  .empfaenger .kontakt-zeile { font-weight:400; margin-top:1px; }
  .empfaenger .kunde-rest { margin-top:2px; }
  .kopf-rechts table { border-collapse:collapse; font-size:12.5px; margin-left:auto; }
  .kopf-rechts td { padding:2px 0; }
  .kopf-rechts td.k { color:#111; padding-right:14px; white-space:nowrap; }
  .kopf-rechts td.v { text-align:right; white-space:nowrap; min-width:26mm; color:#000; font-weight:600; }

  /* Titelzeile: ANGEBOT links, AN-Nr fett rechts auf gleicher Höhe */
  .titel-grid { display:flex; justify-content:space-between; align-items:baseline; margin-top:8mm; }
  .titel-grid .titel { font-size:26px; font-weight:700; }
  .titel-grid .an-nr { font-size:15px; color:#000; }
  .titel-grid .an-nr span { font-weight:700; font-size:18px; }

  .intro { margin-top:7mm; font-size:11.5px; }

  /* ===== Positionstabelle ===== */
  .items { width:100%; border-collapse:collapse; font-size:11.5px; table-layout:fixed; margin-top:5mm; border:2.6px solid #000; }
  .items thead { display:table-header-group; }
  .items th, .items td { border:1.2px solid #7d858f; padding:6px 7px; vertical-align:top; }
  .items thead th { background:#e7ebef; font-weight:700; font-size:12.5px; text-align:left; white-space:nowrap; color:#000; }
  .items tbody td { background:#fff; }
  .right { text-align:right; } .center { text-align:center; } .nowrap { white-space:nowrap !important; }

  .items col.c-pos   { width:11mm; }
  .items col.c-tnr   { width:28mm; }
  .items col.c-menge { width:14mm; }
  .items col.c-preis { width:30mm; }
  .items col.c-betr  { width:25mm; }

  /* In allen Textspalten umbrechen statt abschneiden */
  .items td.pos { text-align:center; }
  .items td.tnr, .items td.art, .items td.desc {
    white-space:normal; overflow-wrap:anywhere; word-break:break-word;
  }

  .items tr.main-row td { border-bottom:0; }
  .items tr.sub-row td { border-top:0; border-bottom:0; padding-top:2px; padding-bottom:2px; font-size:11px; line-height:1.3; }
  .items tr.sub-row.sub-last td { border-bottom:1.4px solid #7d858f; }
  .items tr.staffel-head td { border-top:0; border-bottom:0; padding-top:3px; padding-bottom:1px; font-weight:700; font-size:11px; }
  .items .sub-label { color:#000; }
  .items .arrow { display:inline-block; margin:0 5px 0 8px; color:#555; }
  .items .sub-text { color:#333; font-size:10px; margin:1px 0 0 22px; white-space:normal; overflow-wrap:anywhere; word-break:break-word; }
  .items tr.pos-summe td { padding-top:2px; padding-bottom:4px; }
  .items .pos-sum { display:inline-block; border-top:1.4px solid #000; padding-top:2px; font-weight:700; min-width:18mm; }

  /* ===== Abschluss: Info links, Summen rechts ===== */
  .abschluss { display:flex; justify-content:space-between; align-items:flex-start; gap:10mm; margin-top:6mm; }
  .abschluss-links { font-size:11.5px; line-height:1.55; max-width:110mm; }
  .angebot-info { font-size:13.5px; font-weight:700; line-height:1.45; margin-bottom:4mm; white-space:normal; }
  .liefer-zeile { display:flex; gap:6px; }
  .liefer-zeile .lab { min-width:34mm; }
  .signatur { margin-top:4mm; }

  .summen table { border-collapse:collapse; margin-left:auto; font-size:13px; }
  .summen td { padding:3px 6px; }
  .summen td.k { text-align:left; color:#000; white-space:nowrap; font-weight:600; }
  .summen td.e { text-align:left; color:#555; padding:0 8px; }
  .summen td.v { text-align:right; white-space:nowrap; min-width:26mm; }
  .summen tr.brutto td { font-weight:700; font-size:14.5px; border-top:1.5px solid #000; }
  .staffel-note { font-size:9px; color:#666; margin-top:3mm; max-width:60mm; text-align:right; margin-left:auto; }

  .kondi { margin-top:6mm; font-size:10px; color:#333; line-height:1.5; }

  .no-print { position:fixed; top:10px; right:10px; z-index:1000; background:#0ea5e9; color:#fff; border:none; padding:10px 16px; border-radius:6px; font-size:13px; cursor:pointer; }
</style>
</head>
<body>
  <button class="no-print" onclick="window.print()">📄 Als PDF speichern / Drucken</button>

  <div class="sheet">
    <table class="report">
      <thead><tr><td>${kopfHtml}</td></tr></thead>
      <tfoot><tr><td>${fussHtml}</td></tr></tfoot>
      <tbody><tr><td>
    <div class="content">
      <div class="kopf-grid">
        <div class="empfaenger">
          ${empfaengerHtml}
        </div>
        <div class="kopf-rechts">
          <table>
            <tr><td class="k">Datum:</td><td class="v">${heute}</td></tr>
            ${rfq.lieferanten_nr ? `<tr><td class="k">Lieferanten-Nr.:</td><td class="v">${escapeHtml(rfq.lieferanten_nr)}</td></tr>` : ''}
          </table>
        </div>
      </div>
      <div class="titel-grid">
        <div class="titel">ANGEBOT</div>
        <div class="an-nr">AN-Nr.: <span>${escapeHtml(angebotsNr)}</span></div>
      </div>

      <div class="intro">
        Sehr geehrte Damen und Herren,<br>
        wir bedanken uns für Ihre Anfrage und unterbreiten Ihnen folgendes Angebot:
      </div>

      <table class="items">
        <colgroup>
          <col class="c-pos"><col class="c-tnr"><col><col><col class="c-menge"><col class="c-preis"><col class="c-betr">
        </colgroup>
        <thead><tr>
          <th class="center">Pos</th><th>Teilenummer</th><th>Artikelbezeichnung</th><th>Beschreibung</th>
          <th class="center">Menge</th><th class="right">Stückpreis (EUR)</th><th class="right">Betrag (EUR)</th>
        </tr></thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="7" class="center" style="padding:12px;color:#888;">Keine Positionen</td></tr>'}
        </tbody>
      </table>

      <div class="abschluss">
        <div class="abschluss-links">
          ${infoHtml}
          <div>${escapeHtml(FIRMA.preise_hinweis)}</div>
          <div class="liefer-zeile"><span class="lab">Lieferzeit:</span><span>${escapeHtml(lieferzeit)}</span></div>
          <div class="liefer-zeile"><span class="lab">Angebotsgültigkeit:</span><span>${zahl(rfq.gueltigkeit_wochen || FIRMA.gueltigkeit_wochen)} Wochen</span></div>
          <div style="margin-top:3mm;">${escapeHtml(FIRMA.abschlusssatz)}</div>
          <div class="signatur">${escapeHtml(FIRMA.signatur)}</div>
        </div>
        <div class="summen">
          <table>
            <tr><td class="k">Summe</td><td class="e">EUR</td><td class="v">${betrag(nettoSumme)}</td></tr>
            <tr><td class="k">${zahl(FIRMA.mwst_satz)} % Ust.</td><td class="e">EUR</td><td class="v">${betrag(mwstBetrag)}</td></tr>
            <tr class="brutto"><td class="k">Gesamtbetrag</td><td class="e">EUR</td><td class="v">${betrag(bruttoSumme)}</td></tr>
          </table>
        </div>
      </div>
    </div>
      </td></tr></tbody>
    </table>
  </div>
</body>
</html>`;
}

// --- Briefpapier laden, weiße Seitenränder abschneiden, zentriert einbetten -
// Behebt außermittige Vorlagen: Inhalt wird auf seine echte Breite beschnitten
// und später per CSS mittig platziert.
function loadLetterhead(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let left = c.width, right = 0;
        for (let x = 0; x < c.width; x++) {
          let has = false;
          for (let y = 0; y < c.height; y += 3) {
            const i = (y * c.width + x) * 4;
            if (d[i] < 235 || d[i + 1] < 235 || d[i + 2] < 235) { has = true; break; }
          }
          if (has) { if (x < left) left = x; if (x > right) right = x; }
        }
        if (right <= left) { resolve(img.src); return; } // nichts erkannt → original
        const pad = 4; // kleiner Sicherheitsrand
        const sx = Math.max(0, left - pad);
        const sw = Math.min(c.width - sx, right - left + 1 + pad * 2);
        const out = document.createElement('canvas');
        out.width = sw; out.height = c.height;
        out.getContext('2d').drawImage(c, sx, 0, sw, c.height, 0, 0, sw, c.height);
        resolve(out.toDataURL('image/jpeg', 0.92));
      } catch (e) {
        resolve(img.src);
      }
    };
    img.onerror = () => resolve('');
    img.src = path;
  });
}

/**
 * Öffnet das Angebot als druckfertiges A4-HTML in neuem Tab.
 * Haupt-App bleibt voll bedienbar (eigener Tab).
 */
export function openQuotationPrint(rfq, parts, angebotNotiz = '', angebotInfo = '', options = {}) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Bitte Pop-ups für diese Seite erlauben, damit die Angebots-PDF geöffnet werden kann.');
    return;
  }
  win.document.write('<p style="font-family:sans-serif;padding:24px;color:#555">Angebot wird vorbereitet…</p>');
  Promise.all([loadLetterhead(KOPF_PFAD), loadLetterhead(FUSS_PFAD)]).then(([kopf, fuss]) => {
    const html = buildHtml(rfq, parts || [], angebotNotiz, angebotInfo, kopf, fuss, !!options.showImages);
    win.document.open();
    win.document.write(html);
    win.document.close();
  });
}
