// =========================
// PROJECT-TREE.JS  (v3 — PNG-Baum)
// Verantwortlich NUR für:
//   - PNG-Baumvariante je Projekt zuweisen → getOrAssignTreeVariant(project)
//   - Großen Detailbaum rendern → updateDetailTreeElements(project)
//     (PNG-Baum in #proj-detail-tree, dieselbe Variante wie im Projektwald,
//     plus Äpfel/Blüten-Deko für erledigte Kern-/Extraaufgaben)
//
// Schnittstelle nach außen:
//   getOrAssignTreeVariant(project)    → 1..TREE_PNG_COUNT
//   updateDetailTreeElements(project)
// =========================

// =========================
// HILFSFUNKTIONEN
// =========================
function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function idToSeed(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function escapeXml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// =========================
// BAUM-VARIANTE (PNG)
// Jedes Projekt bekommt bei der ersten Anzeige dauerhaft eine von
// TREE_PNG_COUNT PNG-Baumvarianten (img/tree_<n>.png / tree_<n>_fall.png)
// zugewiesen und in project.treeVariant gespeichert — einmalig ausgewürfelt,
// nie neu. Dieselbe Variante wird sowohl im Projektwald (buildForestTree() in
// forest.js) als auch in der Detailansicht (updateDetailTreeElements() unten)
// verwendet, damit ein Projekt überall denselben Baum zeigt. Fehlt eine
// PNG-Datei, fällt der <img>-onerror-Handler automatisch auf Variante 1
// zurück — neue Varianten lassen sich also einfach durch Ablegen weiterer
// PNGs ergänzen, ohne Code zu ändern.
// =========================
const TREE_PNG_COUNT = 5;

function getOrAssignTreeVariant(project) {
  if (project.treeVariant >= 1 && project.treeVariant <= TREE_PNG_COUNT) return project.treeVariant;
  const rng = seededRand(idToSeed(project.id) + 911);
  project.treeVariant = Math.floor(rng() * TREE_PNG_COUNT) + 1;
  if (typeof saveProjects === 'function') saveProjects();
  return project.treeVariant;
}

// =========================
// APFEL-/BLÜTEN-DEKO (Detailbaum)
// Feste Positionen (in % der Bildfläche) innerhalb der Baumkrone, an denen
// Äpfel (erledigte Kernaufgaben) bzw. Blüten (erledigte Extraaufgaben) auf
// dem PNG-Baum "sitzen". Rein dekorativ — die eigentliche Aufgabenliste
// (Klicken, Abhaken, Details) läuft weiterhin über die Äste-Kacheln
// (#proj-detail-tiles, renderDetailTiles() in forest.js). Reicht die Anzahl
// erledigter Aufgaben über die Slotzahl hinaus, wird gedeckelt (Deko, kein
// 1:1-Protokoll).
//
// Positionen werden nicht fest vorgegeben, sondern innerhalb einer Ellipse
// zufällig gestreut, die die Baumkrone aller 5 PNG-Varianten sicher trifft
// (Krone sitzt bei allen Varianten grob mittig oben, Stamm/Boden im unteren
// Drittel — die Ellipse bleibt bewusst konservativ innerhalb der
// Blattmasse). Seed = Projekt-ID + fester Salt, damit die Streuung pro
// Projekt stabil bleibt (kein Neu-Würfeln bei jedem Re-Render) und Apfel
// bzw. Blüte jeweils ihr eigenes, unabhängiges Muster bekommen.
// =========================
const CANOPY_ELLIPSE = { cx: 50, cy: 34, rx: 38, ry: 28 };
const DECOR_MAX = 8;

function generateCanopySlots(project, saltOffset, count) {
  const rng = seededRand(idToSeed(project.id) + saltOffset);
  const { cx, cy, rx, ry } = CANOPY_ELLIPSE;
  const slots = [];
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const r     = Math.sqrt(rng()) * 0.85; // gleichverteilt in der Fläche, mit Rand zur Kronenkante
    slots.push({ x: cx + Math.cos(angle) * rx * r, y: cy + Math.sin(angle) * ry * r });
  }
  return slots;
}

// =========================
// DETAILBAUM (PNG + Deko) AKTUALISIEREN
// =========================
function updateDetailTreeElements(p) {
  const treeContainer = document.getElementById('proj-detail-tree');
  if (!treeContainer) return;

  const variant     = getOrAssignTreeVariant(p);
  const season      = p.archived ? '_fall' : '';
  const primarySrc  = `img/tree_${variant}${season}.png`;
  const fallbackSrc = `img/tree_1${season}.png`;

  const allTasks  = [...(p.tasks || []), ...(p.subprojects || []).flatMap(sp => sp.tasks || [])];
  const coreDone   = Math.min(allTasks.filter(t => t.done && !t.isExtra).length, DECOR_MAX);
  const extraDone  = Math.min(allTasks.filter(t => t.done &&  t.isExtra).length, DECOR_MAX);

  const decor = [
    ...generateCanopySlots(p, 401, coreDone).map(s => ({ ...s, glyph: '🍎' })),
    ...generateCanopySlots(p, 907, extraDone).map(s => ({ ...s, glyph: '🌸' })),
  ].map(s => `<span class="pdt-tree-decor-item" style="left:${s.x}%;top:${s.y}%;">${s.glyph}</span>`).join('');

  treeContainer.innerHTML = `
    <div class="pdt-tree-wrap">
      <img class="pdt-tree-img" src="${primarySrc}" alt="${escapeXml(p.name)}" draggable="false"
           onerror="if(!this.src.endsWith('${fallbackSrc}')) this.src='${fallbackSrc}';" />
      <div class="pdt-tree-decor">${decor}</div>
    </div>
  `;
  // Fortschritt (Prozent/Balken/Zähler) wird NICHT hier geschrieben — alleinige
  // Quelle ist renderProjectDetail() in forest.js via getProjectStats(), damit es
  // nur einen Berechnungsweg gibt und Zahlen nie auseinanderlaufen können.
}
