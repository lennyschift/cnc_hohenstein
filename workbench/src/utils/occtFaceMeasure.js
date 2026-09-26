// Flächen-Analyse einer STEP-Datei über den echten B-Rep-Geometriekern
// (opencascade.js) — für exaktes Messen von Bohrungsdurchmessern/Radien und
// für die exakte Referenzflächen-Wahl bei Rundmaterial (statt der bisherigen
// Schätzung aus dem Dreiecksnetz).
//
// Alle API-Aufrufe wurden interaktiv gegen eine Testform mit bekanntem
// Loch-Radius (5 mm, Box 40×40×20mm mit zentrischer Bohrung) verifiziert:
// TopExp_Explorer_2 findet 7 Flächen (6 Ebenen + 1 Zylinder), die
// Zylinderfläche liefert exakt Radius=5, die Ebenen liefern korrekte Normalen.

import { leseStepDatei } from './occtMeasure.js';

/**
 * Liest eine STEP-Datei ein und analysiert JEDE Fläche: Typ (Ebene/Zylinder/
 * Kegel/Sonstige), bei Zylinder Radius+Achse, bei Ebene die Normale, plus
 * einen Mittelpunkt (für die Zuordnung eines 3D-Klickpunkts zur nächsten Fläche).
 * Gibt eine flache Liste zurück (keine WASM-Objekte — reine Zahlen/Strings,
 * damit sie z.B. problemlos in Vue-reaktive Daten passt).
 */
// Embind-Objekte (new oc.Xyz()) belegen WASM-Speicher, der vom JS-Garbage-
// Collector NICHT automatisch freigegeben wird — bei vielen Objekten in einer
// Schleife (eine Fläche = mehrere Objekte) kann das über eine lange Sitzung
// (mehrere gemessene Bauteile) hinweg die WASM-Heap beschädigen (selbst
// beobachtet beim Testen). Deshalb hier konsequent .delete() aufrufen.
function sicherLoeschen(obj) {
  try { obj?.delete?.(); } catch (e) { /* manche Objekte sind nicht löschbar/schon frei — ignorieren */ }
}

// Flächentypen mit einer periodischen (umlaufenden) Achse — bei ihnen kann das
// STEP-Import-Artefakt "eine Rundfläche auf mehrere B-Rep-Flächen aufgeteilt"
// auftreten (bekannt u.a. aus GibbsCAM: "doppelte Elemente löschen"), nicht nur
// bei Zylindern, sondern genauso bei Verrundungen (Torus) und Kegeln.
function istPeriodischerFlaechenTyp(typ) {
  return typ === 'zylinder' || typ === 'torus' || typ === 'kegel';
}

// Tessellierung der Flächen (für echtes Flächen-Highlighting im Viewer, statt nur
// eines Rings/Punkts) — einmal pro Bauteil über das ganze Shape, danach pro Fläche
// die fertigen Dreiecke auslesen. 0.1mm Liniendeflection = feine, für die Anzeige
// passende Auflösung (nicht die Kern-Messung — die bleibt exakt über BRepAdaptor).
function tesselliereFlaeche(oc, face) {
  let loc = null;
  let triHandle = null;
  try {
    loc = new oc.TopLoc_Location_1();
    triHandle = oc.BRep_Tool.Triangulation(face, loc);
    const tri = triHandle?.get ? triHandle.get() : triHandle;
    if (!tri) return null;
    const trsf = loc.Transformation();
    const nbTri = tri.NbTriangles();
    if (!nbTri) return null;
    const positions = new Float32Array(nbTri * 9);
    let p = 0;
    for (let t = 1; t <= nbTri; t += 1) {
      const triangle = tri.Triangle(t);
      const ids = [triangle.Value(1), triangle.Value(2), triangle.Value(3)];
      sicherLoeschen(triangle);
      for (const id of ids) {
        const lokal = tri.Node(id);
        const weltpunkt = lokal.Transformed(trsf);
        positions[p] = weltpunkt.X(); positions[p + 1] = weltpunkt.Y(); positions[p + 2] = weltpunkt.Z();
        p += 3;
        sicherLoeschen(lokal);
        sicherLoeschen(weltpunkt);
      }
    }
    return positions;
  } catch (e) {
    return null; // Highlight-Mesh optional — Kernmessung (Radius/Normale) bleibt davon unberührt
  } finally {
    sicherLoeschen(triHandle);
    sicherLoeschen(loc);
  }
}

// Kanten extrahieren (Linien/Kreise/Freiform) — ermöglicht Fusion-360-artiges
// Anklicken einzelner Kanten statt nur ganzer Flächen: Kreiskanten sind der
// direkte Weg, um den Radius einer Bohrung oder einer kleinen Verrundung zu
// treffen (eine Kante ist "dünn"/eindeutig, eine schmale Verrundungsfläche
// dagegen schwer präzise zu treffen). Läuft in derselben Explorer-Runde wie
// die Flächen — jede Kante gehört zu genau einer Fläche im STEP, doppelte
// Vorkommen (Kante zwischen zwei Flächen geteilt) werden bewusst nicht
// herausgefiltert: geometrisch identisch, daher ohne Funktionsverlust.
function extrahiereKante(oc, edge, index) {
  const kurve = new oc.BRepAdaptor_Curve_2(edge);
  try {
    const typWert = kurve.GetType().value;
    const T = oc.GeomAbs_CurveType;
    const eintrag = { index };
    if (typWert === T.GeomAbs_Line.value) {
      const p1 = kurve.Value(kurve.FirstParameter());
      const p2 = kurve.Value(kurve.LastParameter());
      eintrag.typ = 'linie';
      eintrag.start = { x: p1.X(), y: p1.Y(), z: p1.Z() };
      eintrag.ende = { x: p2.X(), y: p2.Y(), z: p2.Z() };
      const dx = eintrag.ende.x - eintrag.start.x;
      const dy = eintrag.ende.y - eintrag.start.y;
      const dz = eintrag.ende.z - eintrag.start.z;
      eintrag.laenge = Math.sqrt(dx * dx + dy * dy + dz * dz);
      return eintrag;
    }
    if (typWert === T.GeomAbs_Circle.value) {
      const kreis = kurve.Circle();
      const mitte = kreis.Location();
      const richtung = kreis.Axis().Direction();
      eintrag.typ = 'kreis';
      eintrag.radius = kreis.Radius();
      eintrag.mitte = { x: mitte.X(), y: mitte.Y(), z: mitte.Z() };
      eintrag.achse = { x: richtung.X(), y: richtung.Y(), z: richtung.Z() };
      // WICHTIG: Kreis-Kanten sind oft nur TEIL-Bögen (z.B. Halbkreise), keine
      // vollen Kreise — Center+Radius+Achse allein verraten nicht, welcher
      // Bogen-Abschnitt real ist. Deshalb den echten Parameterbereich abtasten
      // (wie bei Freiform) für die VISUELLE Darstellung; Radius/Mitte bleiben
      // exakt für Messwert-Anzeige und Abstandsberechnung.
      const t0 = kurve.FirstParameter();
      const t1 = kurve.LastParameter();
      const N = 32;
      const punkte = [];
      for (let i = 0; i <= N; i += 1) {
        const t = t0 + ((t1 - t0) * i) / N;
        const p = kurve.Value(t);
        punkte.push(p.X(), p.Y(), p.Z());
      }
      eintrag.punkte = new Float32Array(punkte);
      eintrag.istVollkreis = (t1 - t0) > Math.PI * 2 - 1e-4;
      return eintrag;
    }
    // Freiform (z.B. BSpline-Übergangskante): Polyline aus Kurvenpunkten
    // abtasten — kein exakter Radius/Länge, aber zeigt eine sinnvolle Kontur an.
    eintrag.typ = 'freiform';
    const t0 = kurve.FirstParameter();
    const t1 = kurve.LastParameter();
    const N = 16;
    const punkte = [];
    for (let i = 0; i <= N; i += 1) {
      const t = t0 + ((t1 - t0) * i) / N;
      const p = kurve.Value(t);
      punkte.push(p.X(), p.Y(), p.Z());
    }
    eintrag.punkte = new Float32Array(punkte);
    return eintrag;
  } finally {
    sicherLoeschen(kurve);
  }
}

export async function analysiereFlaechen(file) {
  const { oc, shape } = await leseStepDatei(file);
  const flaechen = [];
  const kanten = [];
  let mesher = null;
  try {
    // Feiner als zuvor (0,03mm/0,15rad) — an gekrümmten Flächen mit größerem
    // Radius (z.B. flache, weite Fasen/Rundungen) waren einzelne Facetten als
    // sichtbares Vieleck-Muster sowie kleine Lücken an Kanten erkennbar.
    mesher = new oc.BRepMesh_IncrementalMesh_2(shape, 0.015, false, 0.08, false);
  } catch (e) {
    // Tessellierung für Highlighting nicht verfügbar — Flächen-Erkennung/Messung läuft trotzdem weiter.
  }
  let kantenIndex = 0;
  const explorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  let index = 0;
  while (explorer.More()) {
    let adaptor = null;
    let props = null;
    try {
      const face = oc.TopoDS.Face_1(explorer.Current());

      adaptor = new oc.BRepAdaptor_Surface_2(face, true);
      const typWert = adaptor.GetType().value;

      props = new oc.GProp_GProps_1();
      oc.BRepGProp.SurfaceProperties_1(face, props, false, false);
      const cm = props.CentreOfMass();
      const mittelpunkt = { x: cm.X(), y: cm.Y(), z: cm.Z() };

      const eintrag = { index, mittelpunkt };
      const T = oc.GeomAbs_SurfaceType;
      if (typWert === T.GeomAbs_Cylinder.value) {
        const zyl = adaptor.Cylinder();
        const richtung = zyl.Axis().Direction();
        const achsenpunkt = zyl.Location();
        eintrag.typ = 'zylinder';
        eintrag.radius = zyl.Radius();
        eintrag.durchmesser = zyl.Radius() * 2;
        eintrag.achse = { x: richtung.X(), y: richtung.Y(), z: richtung.Z() };
        // Ein beliebiger Punkt AUF der Achse (nicht der Flächen-Mittelpunkt!) —
        // nötig, um bei mehreren konzentrischen Zylindern (typisch bei
        // Drehteilen) den senkrechten Abstand von Klickpunkt zur Achse exakt
        // zu berechnen statt nur den (bei engen/konzentrischen Bohrungen
        // leicht falschen) Mittelpunkt-Abstand zu vergleichen.
        eintrag.achsenpunkt = { x: achsenpunkt.X(), y: achsenpunkt.Y(), z: achsenpunkt.Z() };
      } else if (typWert === T.GeomAbs_Plane.value) {
        const ebene = adaptor.Plane();
        const normale = ebene.Axis().Direction();
        eintrag.typ = 'ebene';
        eintrag.normale = { x: normale.X(), y: normale.Y(), z: normale.Z() };
      } else if (typWert === T.GeomAbs_Cone.value) {
        // Kegelflächen (z.B. Fasen/Senkungen): Radius ändert sich entlang der
        // Achse, deshalb Spitze (Apex) + Halbwinkel statt eines festen Radius
        // speichern — daraus lässt sich der Abstand zu JEDEM Punkt auf der
        // Kegel-Mantelfläche exakt berechnen (nötig, damit Fasen überhaupt
        // zuverlässig anklickbar sind statt nur über die grobe Mittelpunkt-
        // Näherung zu konkurrieren, die gegen benachbarte Flächen fast immer verliert).
        const kegel = adaptor.Cone();
        const richtung = kegel.Axis().Direction();
        const spitze = kegel.Apex();
        eintrag.typ = 'kegel';
        eintrag.achse = { x: richtung.X(), y: richtung.Y(), z: richtung.Z() };
        eintrag.achsenpunkt = { x: spitze.X(), y: spitze.Y(), z: spitze.Z() }; // Kegelspitze
        eintrag.halbwinkelGrad = (kegel.SemiAngle() * 180) / Math.PI;
        eintrag.radius = kegel.RefRadius(); // grobe Referenzgröße, variiert entlang der Achse
      } else if (typWert === T.GeomAbs_Sphere.value) {
        eintrag.typ = 'kugel';
      } else if (typWert === T.GeomAbs_Torus.value) {
        // Verrundungen (Fillets) in Dreh-/Fräskonturen: der Verrundungsradius
        // ist der kleine ("Minor") Torus-Radius — der große ("Major") ist der
        // Abstand der Rundungs-Mittellinie zur Rotationsachse, nicht der gesuchte Radius.
        // Achse+Mittelpunkt werden zusätzlich gebraucht, um bei kleinen Verrundungen
        // den exakten Abstand zur gekrümmten Oberfläche zu berechnen (statt nur zum
        // groben Flächen-Mittelpunkt) — sonst "gewinnt" beim Klicken oft die
        // benachbarte große Fläche statt der schmalen Verrundung.
        const torus = adaptor.Torus();
        const richtung = torus.Axis().Direction();
        const achsenpunkt = torus.Location();
        eintrag.typ = 'torus';
        eintrag.radius = torus.MinorRadius();
        eintrag.majorRadius = torus.MajorRadius();
        eintrag.achse = { x: richtung.X(), y: richtung.Y(), z: richtung.Z() };
        eintrag.achsenpunkt = { x: achsenpunkt.X(), y: achsenpunkt.Y(), z: achsenpunkt.Z() };
      } else {
        eintrag.typ = 'freiform';
      }
      if (mesher) {
        const dreiecke = tesselliereFlaeche(oc, face);
        if (dreiecke) eintrag.dreiecke = dreiecke;
      }
      flaechen.push(eintrag);

      // Kanten DIESER Fläche extrahieren (NACH der Klassifizierung oben, damit
      // wir jeder Kante ihre Herkunftsfläche mitgeben können — siehe Filter
      // weiter unten). Nahtkanten (Naht-/"Seam"-Kanten periodischer Flächen wie
      // Zylinder/Kegel/Torus, ein rein topologisches Konstrukt zum "Aufschneiden"
      // der Fläche zu einem Parameterrechteck, OCCT braucht sie intern, sie sind
      // aber KEIN echtes Bauteil-Merkmal) werden über BRep_Tool.IsClosed(edge,
      // face) erkannt und direkt ausgefiltert.
      const kantenExplorer = new oc.TopExp_Explorer_2(face, oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
      while (kantenExplorer.More()) {
        try {
          const edge = oc.TopoDS.Edge_1(kantenExplorer.Current());
          let istNaht = false;
          try { istNaht = oc.BRep_Tool.IsClosed_2(edge, face); } catch (e) { istNaht = false; }
          if (!istNaht) {
            const kantenEintrag = extrahiereKante(oc, edge, kantenIndex);
            if (kantenEintrag) {
              kantenEintrag.herkunftTyp = eintrag.typ;
              kantenEintrag.herkunftRadius = eintrag.radius;
              kanten.push(kantenEintrag);
            }
          }
        } catch (e) {
          // Einzelne Kante übersprungen — Rest läuft weiter.
        }
        kantenIndex += 1;
        kantenExplorer.Next();
      }
      sicherLoeschen(kantenExplorer);
    } catch (e) {
      // Einzelne Fläche übersprungen (z.B. ungewöhnliche Freiform-Geometrie) — Rest läuft weiter.
    } finally {
      sicherLoeschen(props);
      sicherLoeschen(adaptor);
    }
    index += 1;
    explorer.Next();
  }
  sicherLoeschen(explorer);
  sicherLoeschen(mesher);

  // Duplikat-Kanten herausfiltern: eine gerade Linie, die auf ZWEI koaxialen
  // Zylinderflächen mit gleichem Radius liegt (Start/Ende identisch), ist keine
  // echte Bauteilkante, sondern die interne Grenze zwischen zwei B-Rep-Flächen,
  // die (STEP-Import-Artefakt, siehe auch GibbsCAM "doppelte Elemente löschen")
  // eigentlich EINE durchgängige Rundfläche darstellen — sonst erscheint dort
  // sichtbar eine Trennlinie/ein Schatten-Sprung, obwohl es geometrisch "eine
  // Bohrung" ist. Eine Kante zwischen UNTERSCHIEDLICHEN Flächentypen (z.B.
  // Zylinder+Ebene, etwa eine Nutwand) bleibt davon unberührt — echte Kante.
  const tol = 1e-3;
  const punkteGleich = (a, b) => Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol && Math.abs(a.z - b.z) < tol;
  // Winkelbereich einer Kreis-Kante (lokale u/v-Basis um Mitte+Achse) — um
  // eine ECHTE Duplikat-Kante (dieselbe kleine Naht-Kreiskante, z.B. am Rand
  // einer geteilten Verrundung/Fase) von zwei nur teilweise überlappenden
  // Bogen-Segmenten (z.B. Halbkreise, die zusammen einen echten Vollkreis
  // ergeben — die sollen NICHT gelöscht werden) zu unterscheiden.
  // Winkel aller Punkte einer Kreis-Kante um (mitte, achse), normalisiert auf
  // [0, 2π) — NIE mit rohem atan2()-min/max weiterrechnen: dessen Sprungstelle
  // bei ±180° hätte einen Bogen, der zufällig genau darüber läuft, als riesige
  // (falsche) Spanne erscheinen lassen und je nach Bauteil-Ausrichtung
  // unvorhersehbar falsche Duplikat-Erkennung ausgelöst.
  function kantenWinkel(k) {
    const achse = k.achse;
    const helper = Math.abs(achse.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
    const norm = (a) => { const l = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l }; };
    const u = norm(cross(achse, helper));
    const v = norm(cross(achse, u));
    const winkel = [];
    for (let i = 0; i < k.punkte.length; i += 3) {
      const rx = k.punkte[i] - k.mitte.x;
      const ry = k.punkte[i + 1] - k.mitte.y;
      const rz = k.punkte[i + 2] - k.mitte.z;
      let w = Math.atan2(rx * v.x + ry * v.y + rz * v.z, rx * u.x + ry * u.y + rz * u.z);
      if (w < 0) w += 2 * Math.PI;
      winkel.push(w);
    }
    return winkel;
  }

  // Größte Lücke zwischen (zyklisch sortierten) Winkeln finden — die
  // Abdeckung ist alles ANDERE als diese Lücke. Robust unabhängig davon, wo
  // die Bögen relativ zur ±180°-Grenze liegen.
  function winkelAbdeckung(winkelListe) {
    if (winkelListe.length === 0) return 0;
    const sortiert = [...winkelListe].sort((a, b) => a - b);
    let groessteLuecke = 0;
    for (let i = 0; i < sortiert.length; i += 1) {
      const naechstes = i + 1 < sortiert.length ? sortiert[i + 1] : sortiert[0] + 2 * Math.PI;
      const luecke = naechstes - sortiert[i];
      if (luecke > groessteLuecke) groessteLuecke = luecke;
    }
    return 2 * Math.PI - groessteLuecke;
  }
  const auszuschliessen = new Set();
  for (let i = 0; i < kanten.length; i += 1) {
    const a = kanten[i];
    if (auszuschliessen.has(i)) continue;
    if (a.typ !== 'linie' && a.typ !== 'kreis') continue;
    if (!istPeriodischerFlaechenTyp(a.herkunftTyp)) continue;
    for (let j = i + 1; j < kanten.length; j += 1) {
      const b = kanten[j];
      if (auszuschliessen.has(j) || b.typ !== a.typ || !istPeriodischerFlaechenTyp(b.herkunftTyp)) continue;
      // Toleranz zusätzlich absolut gedeckelt (nicht nur relativ zum Radius) —
      // bei größeren Radien wurden sonst teils mehrere Zehntelmillimeter
      // toleriert, was bei mehreren gleich großen, eng benachbarten Merkmalen
      // (z.B. Nutenreihe) fälschlich echte, getrennte Kanten als "Duplikat"
      // zusammengelegt hat und sie dadurch aus der Kantenliste entfernte.
      if (Math.abs(a.herkunftRadius - b.herkunftRadius) >= Math.min(Math.max(a.herkunftRadius, 1) * 0.01, 0.02)) continue;
      let gleich;
      if (a.typ === 'linie') {
        gleich = (punkteGleich(a.start, b.start) && punkteGleich(a.ende, b.ende))
          || (punkteGleich(a.start, b.ende) && punkteGleich(a.ende, b.start));
      } else {
        // Kreis-Kante: nur als Duplikat werten, wenn Mitte+Radius passen UND
        // das Zusammenlegen beider Punktmengen die Winkel-Abdeckung kaum
        // vergrößert (beide decken im Wesentlichen denselben Bereich ab —
        // dieselbe Kante, zweimal extrahiert). Zwei echte komplementäre
        // Bogen-Hälften eines Vollkreis-Randes würden die Abdeckung dagegen
        // deutlich erhöhen und bleiben so unberührt.
        const dx = a.mitte.x - b.mitte.x;
        const dy = a.mitte.y - b.mitte.y;
        const dz = a.mitte.z - b.mitte.z;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) >= Math.min(Math.max(a.radius, 1) * 0.02, 0.04)) continue;
        const dot = a.achse.x * b.achse.x + a.achse.y * b.achse.y + a.achse.z * b.achse.z;
        if (Math.abs(dot) < 0.999) continue;
        const wa = kantenWinkel(a);
        const wb = kantenWinkel(b);
        const abdeckungA = winkelAbdeckung(wa);
        const abdeckungZusammen = winkelAbdeckung(wa.concat(wb));
        gleich = abdeckungA <= 0.01 || abdeckungZusammen < abdeckungA * 1.3;
      }
      if (!gleich) continue;
      auszuschliessen.add(i);
      auszuschliessen.add(j);
      break;
    }
  }
  const gefilterteKanten = kanten
    .filter((_, i) => !auszuschliessen.has(i))
    .map(({ herkunftTyp, herkunftRadius, ...rest }) => rest);

  return { flaechen, kanten: gefilterteKanten };
}

/**
 * Abstand eines 3D-Punkts zur ECHTEN Oberfläche einer Fläche (nicht zu ihrem
 * Mittelpunkt!). Wichtig bei Drehteilen: mehrere konzentrische Zylinder
 * (verschiedene Durchmesser auf derselben Achse) haben oft sehr nah
 * beieinanderliegende Mittelpunkte — dann würde eine reine Mittelpunkt-
 * Abstandsmessung leicht die falsche (benachbarte) Fläche statt der
 * tatsächlich angeklickten zurückgeben.
 */
export function abstandZurFlaeche(f, punkt) {
  if (f.typ === 'ebene') {
    const dx = punkt.x - f.mittelpunkt.x;
    const dy = punkt.y - f.mittelpunkt.y;
    const dz = punkt.z - f.mittelpunkt.z;
    return Math.abs(dx * f.normale.x + dy * f.normale.y + dz * f.normale.z);
  }
  if (f.typ === 'zylinder' && f.achsenpunkt) {
    // Senkrechter Abstand des Punkts zur Achsen-GERADEN (Kreuzprodukt-Methode),
    // dann Differenz zum Radius = Abstand zur Zylinder-Mantelfläche.
    const px = punkt.x - f.achsenpunkt.x;
    const py = punkt.y - f.achsenpunkt.y;
    const pz = punkt.z - f.achsenpunkt.z;
    const { x: ax, y: ay, z: az } = f.achse;
    const cx = py * az - pz * ay;
    const cy = pz * ax - px * az;
    const cz = px * ay - py * ax;
    const radialAbstand = Math.sqrt(cx * cx + cy * cy + cz * cz); // |Achse| ist 1 (Einheitsvektor)
    return Math.abs(radialAbstand - f.radius);
  }
  if (f.typ === 'torus' && f.achsenpunkt && f.achse && f.majorRadius != null) {
    // Zerlegung in Achsposition (z) + radialen Abstand von der Achse (r), dann
    // Abstand des (r,z)-Punkts zum Mittenkreis (Major-Radius) des Torus —
    // Differenz zum Minor-Radius = Abstand zur gekrümmten Verrundungsfläche.
    // Ohne diese Analytik "gewinnt" bei kleinen Verrundungen sonst leicht die
    // benachbarte große Fläche (reine Mittelpunkt-Näherung war zu ungenau).
    const px = punkt.x - f.achsenpunkt.x;
    const py = punkt.y - f.achsenpunkt.y;
    const pz = punkt.z - f.achsenpunkt.z;
    const { x: ax, y: ay, z: az } = f.achse;
    const z = px * ax + py * ay + pz * az;
    const cx = py * az - pz * ay;
    const cy = pz * ax - px * az;
    const cz = px * ay - py * ax;
    const radialAbstand = Math.sqrt(cx * cx + cy * cy + cz * cz);
    const d = Math.sqrt((radialAbstand - f.majorRadius) ** 2 + z * z);
    return Math.abs(d - f.radius);
  }
  if (f.typ === 'kegel' && f.achsenpunkt && f.achse && f.halbwinkelGrad != null) {
    // f.achsenpunkt ist hier die KEGELSPITZE (Apex). Zerlegung in Achsposition
    // (t, Abstand von der Spitze entlang der Achse) + radialen Abstand (r) von
    // der Achse, dann Vergleich mit dem an dieser Achsposition ERWARTETEN
    // Kegelradius (t·tan(Halbwinkel)) — die Differenz, auf die Mantelfläche
    // projiziert (·cos(Halbwinkel)), ist der senkrechte Abstand zur Kegelfläche.
    const px = punkt.x - f.achsenpunkt.x;
    const py = punkt.y - f.achsenpunkt.y;
    const pz = punkt.z - f.achsenpunkt.z;
    const { x: ax, y: ay, z: az } = f.achse;
    const t = px * ax + py * ay + pz * az;
    const cx = py * az - pz * ay;
    const cy = pz * ax - px * az;
    const cz = px * ay - py * ax;
    const radialAbstand = Math.sqrt(cx * cx + cy * cy + cz * cz);
    const halbwinkelRad = (f.halbwinkelGrad * Math.PI) / 180;
    const erwarteterRadius = t * Math.tan(halbwinkelRad);
    return Math.abs((radialAbstand - erwarteterRadius) * Math.cos(halbwinkelRad));
  }
  // Für Kugel/Freiform (noch) keine exakte Analytik — Mittelpunkt-Näherung als Fallback.
  const dx = f.mittelpunkt.x - punkt.x;
  const dy = f.mittelpunkt.y - punkt.y;
  const dz = f.mittelpunkt.z - punkt.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Findet die Fläche, deren tatsächliche Oberfläche dem 3D-Punkt am nächsten liegt. */
export function naechsteFlaeche(flaechen, punkt) {
  let beste = null;
  let besterAbstand = Infinity;
  for (const f of flaechen) {
    const d = abstandZurFlaeche(f, punkt);
    if (d < besterAbstand) { besterAbstand = d; beste = f; }
  }
  return beste;
}

/** Abstand eines 3D-Punkts zur ECHTEN Kante (Linie/Kreis exakt, Freiform genähert). */
export function abstandZurKante(k, punkt) {
  if (k.typ === 'linie') {
    const { start: s, ende: e } = k;
    const dx = e.x - s.x, dy = e.y - s.y, dz = e.z - s.z;
    const laenge2 = dx * dx + dy * dy + dz * dz;
    let t = laenge2 > 0
      ? ((punkt.x - s.x) * dx + (punkt.y - s.y) * dy + (punkt.z - s.z) * dz) / laenge2
      : 0;
    t = Math.max(0, Math.min(1, t));
    const px = s.x + t * dx, py = s.y + t * dy, pz = s.z + t * dz;
    return Math.sqrt((punkt.x - px) ** 2 + (punkt.y - py) ** 2 + (punkt.z - pz) ** 2);
  }
  if (k.typ === 'kreis') {
    const vx = punkt.x - k.mitte.x, vy = punkt.y - k.mitte.y, vz = punkt.z - k.mitte.z;
    const { x: ax, y: ay, z: az } = k.achse;
    const dPerp = vx * ax + vy * ay + vz * az;
    const px = vx - dPerp * ax, py = vy - dPerp * ay, pz = vz - dPerp * az;
    const rAbstand = Math.sqrt(px * px + py * py + pz * pz);
    return Math.sqrt((rAbstand - k.radius) ** 2 + dPerp * dPerp);
  }
  // Freiform: nächster der abgetasteten Polyline-Punkte (Näherung, ausreichend zum Anwählen).
  let bester = Infinity;
  const pts = k.punkte || [];
  for (let i = 0; i < pts.length; i += 3) {
    const d = Math.sqrt((punkt.x - pts[i]) ** 2 + (punkt.y - pts[i + 1]) ** 2 + (punkt.z - pts[i + 2]) ** 2);
    if (d < bester) bester = d;
  }
  return bester;
}

/** Findet die Kante, die dem 3D-Punkt am nächsten liegt. */
export function naechsteKante(kanten, punkt) {
  let beste = null;
  let besterAbstand = Infinity;
  for (const k of kanten) {
    const d = abstandZurKante(k, punkt);
    if (d < besterAbstand) { besterAbstand = d; beste = k; }
  }
  return beste;
}
