// =========================
// PROJEKTWALD — forest.js
// =========================

// Wald-Übersicht: Tab/Such/Prioritäts-Filter — reiner Anzeigefilter,
// beeinflusst weder Archivstatus noch Projektdaten. Bewusst nicht in DB
// persistiert (Ansichtsfilter, kein Projektzustand).
let forestFilterTab      = 'all';   // 'all' | 'active' | 'archived'
let forestSearchQuery    = '';
let forestPriorityFilter = '';      // '' | 'Niedrig' | 'Mittel' | 'Hoch'
// Aktuelle Waldseite (0-basiert) — max. FOREST_SLOTS.length Projekte pro
// Seite, ebenfalls reiner Anzeigezustand, nicht persistiert. Wird bei jeder
// Änderung der gefilterten Liste (Tab/Suche/Priorität) auf 0 zurückgesetzt.
let forestPage = 0;

// =================================================
// BAUMRENDERING -> ausgelagert in project-tree.js
// Verfuegbare Funktionen:
//   updateDetailTreeElements(project)  -> rendert den PNG-Baum + Äpfel/Blüten
//                                          in #proj-detail-tree
//   getOrAssignTreeVariant(project)    -> 1..TREE_PNG_COUNT, dieselbe Variante
//                                          wie im Projektwald (buildForestTree())
// Sowohl der kleine Waldbaum als auch der große Detailbaum sind PNGs
// (img/tree_<n>.png / tree_<n>_fall.png) — keine generierte SVG-Baumstruktur
// mehr.
// =================================================


// =========================
// WALD-POSITIONEN (fest vordefinierte Tiefenebenen, nach Skizze)
// Erst Position, dann Größe: jedes Projekt wird zuerst einer festen Reihe
// (Tiefenebene) zugeordnet; Reihe -> Y-Position + horizontaler Baumabstand
// innerhalb der Reihe; daraus abgeleitet erst die Skalierung. Keine
// Zufallspositionen — die Reihen sind bewusst als feste, deterministische
// Perspektivebenen angelegt (hinten klein & eng, vorne groß & weit
// auseinander), damit die Waldansicht kontrolliert/konsistent bleibt.
// =========================
const FOREST_ROW_COUNTS = [3, 4, 3, 4]; // hinterste -> vorderste Reihe

function generateForestSlots(rowCounts) {
  // minY/maxY sind die Top-Kante des jeweils *größten* (untersten) bzw.
  // *kleinsten* (obersten) Baums. #project-forest hat overflow:hidden, daher
  // muss maxY so gewählt sein, dass Bild + Karte der untersten (größten,
  // am stärksten skalierten) Reihe noch komplett vor dem unteren Rand/der
  // Legende endet.
  const minY = 18, maxY = 66;
  const rows = rowCounts.length;

  // Je Tiefe (0 = hinterste Reihe, 1 = vorderste Reihe):
  //  - scale: kleinste -> größte Baumgröße
  //  - gap:   Abstand zwischen benachbarten Baummitten einer Reihe, in %
  //           Containerbreite. Wächst linear mit der Tiefe -> die vorderste
  //           Reihe wird NICHT gleichmäßig über die volle Breite verteilt,
  //           sondern bekommt bewusst die größten Lücken (viel sichtbare
  //           Landschaft zwischen den Vordergrundbäumen), während hintere
  //           Reihen enger zusammenrücken.
  const SCALE_MIN = 0.75, SCALE_MAX = 1.5;
  // GAP_MIN etwas größer als zuvor (an die um 10% größeren Bäume angepasst).
  // GAP_MAX ist NICHT einfach proportional mitgewachsen: bei 4 Bäumen in der
  // vordersten (größten) Reihe würde das den äußersten Baum über den Rand
  // von #project-forest hinausschieben (abgeschnitten). 27 ist der größte
  // Wert, bei dem der äußerste Vordergrundbaum bei aktueller Skalierung noch
  // vollständig im Container sichtbar bleibt.
  const GAP_MIN    = 22, GAP_MAX   = 27;
  const CENTER_X   = 50;

  const slots = [];
  rowCounts.forEach((count, rowIdx) => {
    const depth = rows === 1 ? 1 : rowIdx / (rows - 1);
    const y     = rows === 1 ? minY : minY + rowIdx * (maxY - minY) / (rows - 1);
    const scale = SCALE_MIN + depth * (SCALE_MAX - SCALE_MIN);
    const gap   = GAP_MIN   + depth * (GAP_MAX   - GAP_MIN);

    // Reihe um die Mitte zentrieren, Bäume im festen Abstand `gap` daneben
    // aufreihen -> ergibt zusammen mit dem wachsenden Abstand von selbst
    // das versetzte (Quincunx-artige) Muster der Skizze, ganz ohne Zufall.
    const rowSpan = (count - 1) * gap;
    const startX  = CENTER_X - rowSpan / 2;
    for (let col = 0; col < count; col++) {
      const x = startX + col * gap;
      slots.push({ x, y, depth, scale });
    }
  });
  return slots;
}

const FOREST_SLOTS = generateForestSlots(FOREST_ROW_COUNTS);

// =========================
// FILTER / TABS / SUCHE
// =========================
function getFilteredForestProjects() {
  return projects.filter(p => {
    if (forestFilterTab === 'active'   && p.archived)  return false;
    if (forestFilterTab === 'archived' && !p.archived) return false;
    if (forestPriorityFilter && (p.priority || 'Mittel') !== forestPriorityFilter) return false;
    if (forestSearchQuery && !p.name.toLowerCase().includes(forestSearchQuery)) return false;
    return true;
  });
}

function updateForestTabCounts() {
  const elAll      = document.getElementById('forest-tab-count-all');
  const elActive   = document.getElementById('forest-tab-count-active');
  const elArchived = document.getElementById('forest-tab-count-archived');
  if (elAll)      elAll.textContent      = `(${projects.length})`;
  if (elActive)   elActive.textContent   = `(${projects.filter(p => !p.archived).length})`;
  if (elArchived) elArchived.textContent = `(${projects.filter(p =>  p.archived).length})`;
}

function setForestTab(tab) {
  forestFilterTab = tab;
  forestPage = 0;
  ['all', 'active', 'archived'].forEach(t => {
    const btn = document.getElementById(`forest-tab-${t}`);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  renderForest();
}

document.getElementById('forest-tab-all')?.addEventListener('click', () => setForestTab('all'));
document.getElementById('forest-tab-active')?.addEventListener('click', () => setForestTab('active'));
document.getElementById('forest-tab-archived')?.addEventListener('click', () => setForestTab('archived'));

document.getElementById('forest-search-input')?.addEventListener('input', e => {
  forestSearchQuery = e.target.value.trim().toLowerCase();
  forestPage = 0;
  renderForest();
});

document.getElementById('forest-filter-btn')?.addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('forest-filter-panel')?.classList.toggle('hidden');
});
document.addEventListener('click', e => {
  const panel = document.getElementById('forest-filter-panel');
  const btn   = document.getElementById('forest-filter-btn');
  if (panel && !panel.classList.contains('hidden') && !panel.contains(e.target) && e.target !== btn) {
    panel.classList.add('hidden');
  }
});
document.querySelectorAll('#forest-filter-panel [data-prio]').forEach(btn => {
  btn.addEventListener('click', () => {
    forestPriorityFilter = btn.dataset.prio;
    forestPage = 0;
    document.querySelectorAll('#forest-filter-panel [data-prio]').forEach(b => b.classList.toggle('active', b === btn));
    renderForest();
  });
});

// =========================
// WALDBAUM-KARTE (PNG-Baum + Projektkarte)
// =========================
function buildForestTree(project, slot, containerWidth) {
  const stats      = getProjectStats(project);
  const totalTasks = stats.coreTasks.length + stats.subTotal;
  const doneTasks  = stats.coreDone + stats.subDone;
  const pct        = totalTasks === 0 ? 0 : Math.round(doneTasks / totalTasks * 100);
  const isDone     = !!project.archived;
  const variant    = getOrAssignTreeVariant(project);
  const season     = isDone ? '_fall' : '';
  const primarySrc  = `img/tree_${variant}${season}.png`;
  const fallbackSrc = `img/tree_1${season}.png`;

  const wrap = document.createElement('div');
  wrap.className = 'forest-tree-wrap' + (isDone ? ' archived' : '');
  // Baumgröße relativ zur tatsächlichen Container-Breite (nicht fix in px) —
  // #project-forest kann je nach Viewport-Höhe schrumpfen (siehe projects.css),
  // die Bäume sollen dabei proportional mitschrumpfen statt zu überlappen.
  const widthPx = Math.round(containerWidth * 0.1132 * slot.scale);
  wrap.style.cssText = `left:${slot.x}%;top:${slot.y}%;width:${widthPx}px;z-index:${10 + Math.round(slot.depth * 40)};`;

  const img = document.createElement('img');
  img.className = 'forest-tree-img';
  img.src = primarySrc;
  img.alt = project.name;
  img.draggable = false;
  img.addEventListener('error', () => {
    if (!img.src.endsWith(fallbackSrc)) img.src = fallbackSrc;
  }, { once: true });

  const dot = document.createElement('span');
  dot.className = 'forest-tree-dot';
  dot.style.background = isDone ? '#d97706' : '#16a34a';

  const nameEl = document.createElement('span');
  nameEl.className = 'forest-tree-name';
  nameEl.textContent = project.name;

  const topRow = document.createElement('div');
  topRow.className = 'forest-tree-card-top';
  topRow.append(dot, nameEl);

  const bar = document.createElement('div');
  bar.className = 'forest-tree-bar';
  const fill = document.createElement('div');
  fill.className = 'forest-tree-bar-fill';
  fill.style.width = pct + '%';
  if (isDone) fill.style.background = '#d97706';
  bar.appendChild(fill);

  const pctLabel = document.createElement('span');
  pctLabel.className = 'forest-tree-pct';
  pctLabel.textContent = `${pct}%`;

  const progressRow = document.createElement('div');
  progressRow.className = 'forest-tree-progress';
  progressRow.append(bar, pctLabel);

  const card = document.createElement('div');
  card.className = 'forest-tree-card';
  card.append(topRow, progressRow);

  const subCount = (project.subprojects || []).length;
  const hoverInfo = document.createElement('div');
  hoverInfo.className = 'forest-tree-hover-info';
  hoverInfo.innerHTML = `
    <strong>${escapeXml(project.name)}</strong>
    <span>${doneTasks} / ${totalTasks} Aufgaben · ${pct}%</span>
    <span>${subCount} Unterprojekt${subCount === 1 ? '' : 'e'}</span>
  `;

  wrap.append(img, card, hoverInfo);
  wrap.addEventListener('click', () => openProjectDetail(project.id));

  return wrap;
}

// =========================
// WALD RENDERN
// Rendert NUR in #forest-trees-layer — Hintergrundbild, Overlay-Header
// (Titel/Tabs/Suche/Filter) und Legende sind statisches HTML und bleiben
// beim Neurendern unangetastet stehen.
// =========================
function renderForest() {
  const container = document.getElementById('project-forest');
  const layer     = document.getElementById('forest-trees-layer');
  if (!container || !layer) return;
  layer.innerHTML = '';

  updateForestTabCounts();

  if (projects.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'forest-empty';
    empty.innerHTML = 'Dein Wald ist noch leer.<br><button type="button" class="forest-empty-add-btn" id="forest-empty-add-btn">+ Neues Projekt</button>';
    layer.appendChild(empty);
    document.getElementById('forest-empty-add-btn')?.addEventListener('click', () => openProjectModal());
    renderForestPager(0);
    return;
  }

  const filtered = getFilteredForestProjects();
  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'forest-empty';
    empty.textContent = 'Keine Projekte gefunden.';
    layer.appendChild(empty);
    renderForestPager(0);
    return;
  }

  // Max. FOREST_SLOTS.length Bäume gleichzeitig sichtbar — feste Anordnung/
  // Größe pro Slot bleibt dadurch immer gleich, unabhängig von der
  // Gesamtprojektzahl. Überzählige Projekte landen auf weiteren Waldseiten
  // statt (wie früher) optisch überlappend in dieselbe Anordnung gequetscht
  // zu werden.
  const pageSize   = FOREST_SLOTS.length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (forestPage >= totalPages) forestPage = totalPages - 1;
  if (forestPage < 0) forestPage = 0;

  const pageItems = filtered.slice(forestPage * pageSize, forestPage * pageSize + pageSize);
  const containerWidth = container.clientWidth || 1200;
  pageItems.forEach((project, i) => {
    layer.appendChild(buildForestTree(project, FOREST_SLOTS[i], containerWidth));
  });

  renderForestPager(totalPages);
}

// =========================
// WALD-SEITEN-NAVIGATION (max. 14 Bäume/Seite)
// Dezente Pfeile an den Rändern (nur sichtbar, wenn es eine weitere/vorige
// Seite gibt) + Punkt-Indikatoren, damit man auch bei mehr als 14 Projekten
// weiß, wie viele Waldstücke es gibt und auf welchem man gerade steht —
// ohne dass daraus eine klassische Seitenzahl-/Tabellen-Paginierung wird.
// =========================
function renderForestPager(totalPages) {
  const prevBtn = document.getElementById('forest-page-prev');
  const nextBtn = document.getElementById('forest-page-next');
  const dotsEl  = document.getElementById('forest-page-dots');
  if (!prevBtn || !nextBtn || !dotsEl) return;

  prevBtn.style.display = (totalPages > 1 && forestPage > 0) ? '' : 'none';
  nextBtn.style.display = (totalPages > 1 && forestPage < totalPages - 1) ? '' : 'none';

  dotsEl.innerHTML = '';
  if (totalPages > 1) {
    for (let i = 0; i < totalPages; i++) {
      const dot = document.createElement('span');
      dot.className = 'forest-page-dot' + (i === forestPage ? ' active' : '');
      dotsEl.appendChild(dot);
    }
  }
}

function goForestPage(dir) {
  forestPage += dir;
  const layer = document.getElementById('forest-trees-layer');
  const bg    = document.querySelector('.forest-bg-img');
  if (layer) {
    layer.classList.add('forest-page-transition');
    // Kleiner Landschafts-Schwenk (dasselbe Bild, nur minimal verschoben) —
    // soll das Gefühl "weiter nach links/rechts schauen" erzeugen, ohne ein
    // eigenes zweites Hintergrundbild pro Waldseite zu brauchen.
    if (bg) bg.style.transform = `translateX(${dir > 0 ? '-1.5%' : '1.5%'})`;
    setTimeout(() => {
      renderForest();
      layer.classList.remove('forest-page-transition');
      if (bg) bg.style.transform = '';
    }, 180);
  } else {
    renderForest();
  }
}

document.getElementById('forest-page-prev')?.addEventListener('click', () => goForestPage(-1));
document.getElementById('forest-page-next')?.addEventListener('click', () => goForestPage(1));

// =========================
// TOGGLE LOGIK
// Projektwald ist die einzige Übersichtsansicht — diese Funktion aktiviert
// sie (nach dem Schließen der Detailseite, oder einmalig beim Laden).
// =========================
function switchToForestView() {
  document.getElementById('project-forest-wrap').style.display = '';
  document.getElementById('view-project-detail').style.display = 'none';
  document.getElementById('forest-toolbar').style.display      = '';
  document.getElementById('project-dash-content').classList.add('forest-active');
  renderForest();
}

switchToForestView();

// =========================
// DETAILANSICHT
// =========================
let currentDetailProject = null;
let detailSubLayer = 0;

function openProjectDetail(projectId) {
  currentDetailProject = projects.find(p => p.id === projectId);
  if (!currentDetailProject) return;
  detailSubLayer = 0;

  const dc = document.querySelector('#view-projects .dash-content');
  // forest-active bringt eine feste height:calc(100vh-44px)+overflow:hidden
  // mit (siehe .dash-content.forest-active in projects.css) — die darf beim
  // Wechsel in die Detailansicht nicht mehr aktiv sein, sonst wird
  // #view-project-detail auf diese Höhe geklemmt (leerer Streifen unten,
  // wenn der Inhalt kürzer ist, oder Abschneiden, wenn er länger ist).
  if (dc) { dc.classList.remove('forest-active'); dc.classList.add('pdt-active'); }
  document.getElementById('forest-toolbar').style.display = 'none';

  document.getElementById('project-forest-wrap').style.display = 'none';
  document.getElementById('view-project-detail').style.display = '';

  renderProjectDetail();
}

function closeProjectDetail() {
  const dc = document.querySelector('#view-projects .dash-content');
  if (dc) dc.classList.remove('pdt-active');

  document.getElementById('view-project-detail').style.display = 'none';
  currentDetailProject = null;
  switchToForestView();
}

function renderProjectDetail() {
  const p = currentDetailProject;
  if (!p) return;

  document.getElementById('proj-detail-name').textContent   = p.name;
  document.getElementById('proj-detail-desc').textContent   = p.description || '';
  document.getElementById('proj-detail-status').textContent = p.archived ? 'Archiviert' : 'Aktives Projekt';
  document.getElementById('proj-detail-status').className   = 'pdt-status-badge' + (p.archived ? ' archived' : '');

  // Einzige Fortschritts-Quelle für die Detailseite: getProjectStats() (projects.js)
  // rechnet Haupt- UND Unterprojekt-Aufgaben korrekt zusammen. updateDetailTreeElements()
  // schreibt diese Werte NICHT mehr selbst (siehe project-tree.js) — sonst zwei
  // unabhängige, potenziell widersprüchliche Berechnungen für dieselben DOM-Elemente.
  const stats = getProjectStats(p);
  const total = stats.coreTasks.length + stats.subTotal;
  const done  = stats.coreDone + stats.subDone;
  const pct   = stats.coreProgress;

  document.getElementById('proj-detail-pct').textContent       = pct + '%';
  document.getElementById('proj-detail-bar-fill').style.width  = pct + '%';
  document.getElementById('proj-detail-task-count').textContent = `${done} / ${total} Aufgaben`;
  document.getElementById('proj-detail-sub-count').textContent  = `${p.subprojects.length} Unterprojekte`;
  document.getElementById('proj-detail-startdate').textContent  = formatStartDate(p) || '—';

  // Neue Felder
  const statusValEl = document.getElementById('proj-detail-status-val');
  if (statusValEl) { statusValEl.textContent = p.archived ? 'Archiviert' : 'Aktiv'; statusValEl.style.color = p.archived ? '#d97706' : '#16a34a'; }
  const subValEl = document.getElementById('proj-detail-sub-val');
  if (subValEl) subValEl.textContent = p.subprojects.length;

  // Baum (PNG, dieselbe Variante wie im Projektwald) + Äpfel/Blüten-Deko
  updateDetailTreeElements(p);

  // Mehr-Äste-Button
  const moreBtn = document.getElementById('proj-detail-more-branches');
  if (p.subprojects.length > 7) {
    moreBtn.style.display = '';
    moreBtn.textContent   = detailSubLayer === 0 ? `▸ Weitere Äste (${p.subprojects.length - 7})` : '◂ Erste Äste';
  } else {
    moreBtn.style.display = 'none';
  }

  renderDetailTiles();
}

// Eine Aufgabenzeile (Checkbox, Label mit Detail-Link, Umbenennen/Verschieben/
// Löschen) — von der Haupt-Aufgaben-Kachel UND jeder Unterprojekt-Kachel
// gemeinsam genutzt, damit beide Orte exakt dieselben Fähigkeiten haben.
function buildDetailTaskRow(task, project, subproject) {
  const row = document.createElement('div');
  row.className = 'detail-tile-task-row' + (task.done ? ' done' : '') + (task.isExtra ? ' extra' : '');

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = task.done;
  cb.className = 'project-task-cb';
  cb.addEventListener('change', () => {
    task.done = cb.checked;
    task.completedAt = cb.checked ? Date.now() : null;
    saveProjects();
    // Erledigt-Status ändert die Fortschrittszahlen im Hero — komplett neu
    // rendern (deckt Baumdeko + Kacheln + Prozent/Zähler in einem Aufwasch ab).
    renderProjectDetail();
    renderForest();
  });

  const label = document.createElement('span');
  label.className = 'detail-tile-task-label';
  label.textContent = task.text;
  if (task.description || (task.checklist && task.checklist.length)) {
    const dot = document.createElement('span');
    dot.className = 'detail-task-has-detail';
    dot.textContent = '·';
    label.appendChild(dot);
  }
  label.addEventListener('click', () => openTaskDetail(task, subproject, project));
  label.style.cursor = 'pointer';

  const actions = document.createElement('div');
  actions.className = 'detail-tile-task-actions';

  const renameBtn = document.createElement('button');
  renameBtn.type = 'button';
  renameBtn.className = 'detail-task-icon-btn';
  renameBtn.title = 'Umbenennen';
  renameBtn.textContent = '✎';
  renameBtn.addEventListener('click', e => {
    e.stopPropagation();
    startInlineEdit(label, task, project, () => renderDetailTiles());
  });

  const moveBtn = document.createElement('button');
  moveBtn.type = 'button';
  moveBtn.className = 'detail-task-icon-btn';
  moveBtn.title = 'Verschieben';
  moveBtn.textContent = '⇄';
  moveBtn.addEventListener('click', e => {
    e.stopPropagation();
    openMoveTaskModal(task, project, subproject);
  });

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'detail-task-icon-btn';
  delBtn.title = 'Löschen';
  delBtn.textContent = '✕';
  delBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (subproject) {
      subproject.tasks = subproject.tasks.filter(t => t.id !== task.id);
    } else {
      project.tasks = project.tasks.filter(t => t.id !== task.id);
    }
    saveProjects();
    renderProjectDetail();
    renderForest();
  });

  actions.append(renameBtn, moveBtn, delBtn);

  if (task.isExtra) {
    const badge = document.createElement('span');
    badge.className = 'detail-tile-extra-badge';
    badge.textContent = '✦';
    row.append(cb, label, badge, actions);
  } else {
    row.append(cb, label, actions);
  }
  return row;
}

// Immer sichtbare, nicht paginierte Kachel für Aufgaben direkt am Projekt
// (ohne Unterprojekt) — vorher in der Detailansicht komplett unsichtbar.
function buildMainTasksTile(p) {
  const stats = getProjectStats(p);
  const mainTotal = stats.coreTasks.length + stats.extraTasks.length;
  const mainDone  = stats.coreDone + stats.extraDone;
  const mainPct   = mainTotal === 0 ? 0 : Math.round(mainDone / mainTotal * 100);

  const tile = document.createElement('div');
  tile.className = 'detail-tile detail-tile-main';

  const head = document.createElement('div');
  head.className = 'detail-tile-head';
  const title = document.createElement('div');
  title.className = 'detail-tile-title';
  title.textContent = 'Hauptaufgaben';
  const meta = document.createElement('div');
  meta.className = 'detail-tile-meta';
  meta.textContent = `${mainDone}/${mainTotal}`;
  head.append(title, meta);

  const barWrap = document.createElement('div');
  barWrap.className = 'detail-tile-bar-wrap';
  const barFill = document.createElement('div');
  barFill.className = 'detail-tile-bar-fill';
  barFill.style.width = mainPct + '%';
  if (mainPct === 100 && mainTotal > 0) barFill.style.background = '#16a34a';
  barWrap.appendChild(barFill);

  const taskList = document.createElement('div');
  taskList.className = 'detail-tile-tasks';

  if (mainTotal === 0) {
    const hint = document.createElement('div');
    hint.className = 'detail-tile-empty';
    hint.textContent = 'Noch keine Aufgaben direkt am Projekt.';
    taskList.appendChild(hint);
  } else {
    stats.coreTasks.forEach(task => taskList.appendChild(buildDetailTaskRow(task, p, null)));
    if (stats.extraTasks.length > 0) {
      const divider = document.createElement('div');
      divider.className = 'detail-tile-divider';
      divider.textContent = '✦ Extras';
      taskList.appendChild(divider);
      stats.extraTasks.forEach(task => taskList.appendChild(buildDetailTaskRow(task, p, null)));
    }
  }

  const addBtn = document.createElement('button');
  addBtn.className = 'detail-tile-add-btn';
  addBtn.textContent = '+ Aufgabe hinzufügen';
  addBtn.addEventListener('click', () => openAddTaskModalFromDetail(p.id, null));
  taskList.appendChild(addBtn);

  tile.append(head, barWrap, taskList);
  return tile;
}

function renderDetailTiles() {
  const p    = currentDetailProject;
  const grid = document.getElementById('proj-detail-tiles');
  grid.innerHTML = '';

  // Haupt-Aufgaben-Kachel — immer an erster Stelle, nie paginiert.
  grid.appendChild(buildMainTasksTile(p));

  const layerStart  = detailSubLayer * 7;
  const visibleSubs = p.subprojects.slice(layerStart, layerStart + 7);

  if (visibleSubs.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'detail-tile-empty';
    hint.style.padding = '20px 4px';
    hint.textContent = 'Noch keine Unterprojekte. Füge über „+ Ast hinzufügen" einen hinzu.';
    grid.appendChild(hint);
    return;
  }

  visibleSubs.forEach(sp => {
    const stats = getSubprojectStats(sp);
    const tile  = document.createElement('div');
    tile.className = 'detail-tile';

    const head = document.createElement('div');
    head.className = 'detail-tile-head';
    const title = document.createElement('div');
    title.className = 'detail-tile-title';
    title.textContent = sp.title;
    const meta = document.createElement('div');
    meta.className = 'detail-tile-meta';
    meta.textContent = `${stats.done}/${stats.total}`;
    head.append(title, meta);

    const barWrap = document.createElement('div');
    barWrap.className = 'detail-tile-bar-wrap';
    const barFill = document.createElement('div');
    barFill.className = 'detail-tile-bar-fill';
    barFill.style.width = stats.pct + '%';
    if (stats.pct === 100) barFill.style.background = '#16a34a';
    barWrap.appendChild(barFill);

    const taskList = document.createElement('div');
    taskList.className = 'detail-tile-tasks';

    if (sp.tasks.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'detail-tile-empty';
      hint.textContent = 'Noch keine Aufgaben.';
      taskList.appendChild(hint);
    } else {
      sp.tasks.forEach(task => taskList.appendChild(buildDetailTaskRow(task, p, sp)));
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'detail-tile-add-btn';
    addBtn.textContent = '+ Aufgabe hinzufügen';
    addBtn.addEventListener('click', () => openAddTaskModalFromDetail(p.id, sp.id));
    taskList.appendChild(addBtn);

    tile.append(head, barWrap, taskList);
    grid.appendChild(tile);
  });
}


// updateDetailTreeElements -> project-tree.js


// =========================
// AUFGABE DETAIL MODAL
// =========================
let currentTaskDetail = null;

function openTaskDetail(task, sp, project) {
  currentTaskDetail = { task, sp, project };
  document.getElementById('task-detail-title').textContent = task.text;
  document.getElementById('task-detail-sp').textContent    = sp ? sp.title : 'Hauptaufgabe';
  document.getElementById('task-detail-type').textContent  = task.isExtra ? '✦ Extra' : '◉ Kern';
  document.getElementById('task-detail-desc').value        = task.description || '';
  document.getElementById('task-detail-done-cb').checked   = task.done;
  renderTaskDetailChecklist();
  document.getElementById('task-detail-overlay').classList.remove('hidden');
}

function closeTaskDetail() {
  document.getElementById('task-detail-overlay').classList.add('hidden');
  currentTaskDetail = null;
}

function renderTaskDetailChecklist() {
  const { task } = currentTaskDetail;
  const list = document.getElementById('task-detail-checklist');
  list.innerHTML = '';
  (task.checklist || []).forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'task-cl-row' + (item.done ? ' done' : '');
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = item.done; cb.className = 'project-task-cb';
    cb.addEventListener('change', () => { item.done = cb.checked; saveProjects(); renderTaskDetailChecklist(); });
    const lbl = document.createElement('span');
    lbl.className = 'task-cl-label'; lbl.textContent = item.text;
    const del = document.createElement('button');
    del.className = 'task-delete'; del.textContent = '✕';
    del.addEventListener('click', () => { task.checklist.splice(i, 1); saveProjects(); renderTaskDetailChecklist(); });
    row.append(cb, lbl, del);
    list.appendChild(row);
  });
}

document.getElementById('task-detail-desc').addEventListener('input', () => {
  if (!currentTaskDetail) return;
  currentTaskDetail.task.description = document.getElementById('task-detail-desc').value;
  saveProjects();
});

document.getElementById('task-detail-done-cb').addEventListener('change', () => {
  if (!currentTaskDetail) return;
  currentTaskDetail.task.done = document.getElementById('task-detail-done-cb').checked;
  currentTaskDetail.task.completedAt = currentTaskDetail.task.done ? Date.now() : null;
  saveProjects();
  if (currentDetailProject) renderProjectDetail();
  renderForest();
});

document.getElementById('task-detail-add-cl').addEventListener('click', () => {
  const input = document.getElementById('task-detail-cl-input');
  const text  = input.value.trim();
  if (!text || !currentTaskDetail) return;
  if (!currentTaskDetail.task.checklist) currentTaskDetail.task.checklist = [];
  currentTaskDetail.task.checklist.push({ id: crypto.randomUUID(), text, done: false });
  input.value = '';
  saveProjects(); renderTaskDetailChecklist();
});
document.getElementById('task-detail-cl-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('task-detail-add-cl').click();
});
document.getElementById('task-detail-close').addEventListener('click', closeTaskDetail);
document.getElementById('task-detail-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('task-detail-overlay')) closeTaskDetail();
});

document.getElementById('task-detail-rename').addEventListener('click', () => {
  if (!currentTaskDetail) return;
  const { task, project } = currentTaskDetail;
  const titleEl = document.getElementById('task-detail-title');
  startInlineEdit(titleEl, task, project, () => {
    titleEl.textContent = task.text;
    renderDetailTiles();
    renderForest();
  });
});

document.getElementById('task-detail-delete').addEventListener('click', () => {
  if (!currentTaskDetail) return;
  const { task, sp, project } = currentTaskDetail;
  if (sp) {
    sp.tasks = sp.tasks.filter(t => t.id !== task.id);
  } else {
    project.tasks = project.tasks.filter(t => t.id !== task.id);
  }
  saveProjects();
  closeTaskDetail();
  if (currentDetailProject) renderProjectDetail();
  renderForest();
});

// =========================
// AUFGABE AUS DETAIL HINZUFÜGEN
// =========================
function openAddTaskModalFromDetail(projectId, subprojectId) {
  closeTaskDetail();
  addTaskTargetProjectId    = projectId;
  addTaskIsExtra            = false;
  addTaskTargetSubprojectId = subprojectId;
  const proj = projects.find(p => p.id === projectId);
  const sp   = subprojectId ? (proj.subprojects||[]).find(s => s.id === subprojectId) : null;
  document.getElementById('project-task-modal-title').textContent = sp ? `Aufgabe zu „${sp.title}"` : 'Neue Hauptaufgabe';
  document.getElementById('project-task-input').value = '';
  document.getElementById('project-task-desc-input').value = '';
  document.getElementById('task-type-core').classList.add('active');
  document.getElementById('task-type-extra').classList.remove('active');
  addTaskIsExtra = false;
  document.getElementById('project-task-modal-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('project-task-input').focus(), 50);
}

document.getElementById('task-type-core').addEventListener('click', () => {
  addTaskIsExtra = false;
  document.getElementById('task-type-core').classList.add('active');
  document.getElementById('task-type-extra').classList.remove('active');
});
document.getElementById('task-type-extra').addEventListener('click', () => {
  addTaskIsExtra = true;
  document.getElementById('task-type-extra').classList.add('active');
  document.getElementById('task-type-core').classList.remove('active');
});

// =========================
// DETAIL VIEW EVENTS
// =========================
document.getElementById('proj-detail-back').addEventListener('click', closeProjectDetail);
document.getElementById('proj-detail-more-branches').addEventListener('click', () => {
  detailSubLayer = detailSubLayer === 0 ? 1 : 0;
  renderProjectDetail();
});
document.getElementById('proj-detail-add-branch').addEventListener('click', () => {
  if (currentDetailProject) openAddSubprojectModal(currentDetailProject.id);
});
// Neuer sichtbarer "Ast hinzufügen" Button
const _addBranchVisible = document.getElementById('proj-detail-add-branch-visible');
if (_addBranchVisible) _addBranchVisible.addEventListener('click', () => {
  if (currentDetailProject) openAddSubprojectModal(currentDetailProject.id);
});
// Bearbeiten Button
const _editBtn = document.getElementById('proj-detail-edit-btn');
if (_editBtn) _editBtn.addEventListener('click', () => {
  if (currentDetailProject) openProjectModal(currentDetailProject);
});

// =========================
// DETAIL-MENÜ (⋮) — Bearbeiten + Projekt beenden/reaktivieren (Herbstmodus)
// Gleiches Dropdown-Muster wie budget.js (.b-header-dropdown): an <body>
// angehängt (fixed), damit es nicht von umgebenden Containern abgeschnitten wird.
// =========================
let pdtMenuEl = null;
function getPdtMenuEl() {
  if (!pdtMenuEl) {
    pdtMenuEl = document.createElement('div');
    pdtMenuEl.className = 'b-header-dropdown';
    document.body.appendChild(pdtMenuEl);
  }
  return pdtMenuEl;
}
function closePdtMenu() {
  if (pdtMenuEl) pdtMenuEl.classList.remove('open');
}
document.addEventListener('click', closePdtMenu);
document.addEventListener('scroll', closePdtMenu, true);
window.addEventListener('resize', closePdtMenu);

const pdtMenuBtn = document.getElementById('proj-detail-menu-btn');
if (pdtMenuBtn) {
  pdtMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = getPdtMenuEl();
    const wasOpen = menu.classList.contains('open');
    closePdtMenu();
    if (wasOpen || !currentDetailProject) return;

    const p = currentDetailProject;
    const finishLabel = p.archived ? '↩ Projekt reaktivieren' : '🍂 Projekt beenden (Herbstmodus)';
    menu.innerHTML = `
      <button type="button" class="b-header-dropdown-item" id="pdt-menu-edit">✏️ Bearbeiten</button>
      <button type="button" class="b-header-dropdown-item" id="pdt-menu-finish">${finishLabel}</button>
      <button type="button" class="b-header-dropdown-item" id="pdt-menu-delete">🗑 Projekt löschen</button>
    `;
    const rect = pdtMenuBtn.getBoundingClientRect();
    menu.style.top   = (rect.bottom + 6) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    menu.classList.add('open');

    document.getElementById('pdt-menu-edit').addEventListener('click', () => {
      closePdtMenu();
      if (currentDetailProject) openProjectModal(currentDetailProject);
    });
    document.getElementById('pdt-menu-finish').addEventListener('click', () => {
      closePdtMenu();
      if (!currentDetailProject) return;
      const project = currentDetailProject;

      if (project.archived) {
        const idx = projects.findIndex(pr => pr.id === project.id);
        if (idx !== -1) projects[idx].archived = false;
        saveProjects();
        renderProjectDetail();
        return;
      }

      openConfirmModal(
        'Projekt beenden?',
        `„${project.name}" wird in den Herbstmodus versetzt (abgeschlossen). Es bleibt vollständig erhalten und kann jederzeit reaktiviert werden.`,
        'Beenden',
        'neutral',
        () => {
          const idx = projects.findIndex(pr => pr.id === project.id);
          if (idx !== -1) projects[idx].archived = true;
          saveProjects();
          renderProjectDetail();
        }
      );
    });
    document.getElementById('pdt-menu-delete').addEventListener('click', () => {
      closePdtMenu();
      if (!currentDetailProject) return;
      const project = currentDetailProject;
      openConfirmModal(
        'Projekt löschen?',
        `„${project.name}" wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`,
        'Löschen',
        'danger',
        () => {
          projects = projects.filter(pr => pr.id !== project.id);
          saveProjects();
          closeProjectDetail();
        }
      );
    });
  });
}
