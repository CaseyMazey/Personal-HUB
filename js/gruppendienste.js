// =========================
// GRUPPENDIENSTE — Müll/Wasser/Aufräumen Wochenplan
// Today sidebar widget + Verwalten-Modal
//
// Ersetzt die bisherige Excel-Tabelle "Müll-Wasser.xlsx" als
// Nook-Funktion. Zuständigkeiten: eigene Kachel in der rechten
// Today-Sidebar, eigenes Modal zur Pflege des Wochenplans.
// Lädt nach main.js (DB, getWeekId, getISOWeek) und hub-utils.js
// (wireModal).
// =========================

// Kein eingebauter Beispiel-/Platzhalterplan (bewusst leer) — echte
// Personennamen gehören nicht in öffentlich gehosteten/verteilten
// Quellcode (Hosting, App-Store-Paket). Ein einmaliger Umzug aus einer
// alten Excel-Tabelle o.ä. läuft über einen lokalen, nicht versionierten
// Import in der Browser-Konsole (DB.set('gruppendienstePlan', {...})) statt
// über einen Default hier im Code.
let gdPlan = DB.get('gruppendienstePlan', {});
function gdSavePlan() { DB.set('gruppendienstePlan', gdPlan); }

function gdEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

// Alle bisher verwendeten Namen (für Autovervollständigung im Modal).
// "drüben 1/2" zählt nicht als Person.
function gdKnownNames() {
  const set = new Set();
  Object.values(gdPlan).forEach(w => {
    if (!w) return;
    [w.muell, w.wasser].forEach(d => {
      if (!d) return;
      [d.tn1, d.tn2, d.ersatz].forEach(n => { if (n) set.add(n); });
    });
    (w.aufraeumen || []).forEach(n => { if (n && !/^drüben/i.test(n)) set.add(n); });
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
}

function gdRefreshNameList() {
  const dl = document.getElementById('gd-names-list');
  if (!dl) return;
  dl.innerHTML = gdKnownNames().map(n => `<option value="${gdEsc(n)}"></option>`).join('');
}

// =========================
// KACHEL — Hauptbereich, direkt unter "Aufgaben diese Woche"
// Drei Dienste nebeneinander in einer Reihe, möglichst kompakt.
// =========================

function gdTrioLines(d) {
  if (!d) return '—';
  const parts = [];
  if (d.tn1)    parts.push(`Tn1: ${gdEsc(d.tn1)}`);
  if (d.tn2)    parts.push(`Tn2: ${gdEsc(d.tn2)}`);
  if (d.ersatz) parts.push(`Ersatz: ${gdEsc(d.ersatz)}`);
  return parts.length ? parts.join('<br>') : '—';
}

function gdListLine(list) {
  return (list && list.length) ? list.map(gdEsc).join(' · ') : '—';
}

function gdColHtml(icon, title, linesHtml) {
  return `
    <div class="gd-col">
      <div class="gd-col-title"><span class="gd-col-icon">${icon}</span>${title}</div>
      <div class="gd-col-names">${linesHtml}</div>
    </div>`;
}

function gdBuildWidget() {
  const main = document.getElementById('today-main');
  if (!main) return;
  let widget = document.getElementById('gd-widget');
  if (!widget) {
    widget = document.createElement('div');
    widget.id = 'gd-widget';
    widget.className = 'panel gd-widget';
    const tasksPanel = document.getElementById('panel-tasks');
    if (tasksPanel && tasksPanel.parentNode === main) tasksPanel.insertAdjacentElement('afterend', widget);
    else main.appendChild(widget);
  }

  const now    = new Date();
  const kw     = getISOWeek(now);
  const weekId = getWeekId(now);
  const entry  = gdPlan[weekId];

  const bodyHtml = entry
    ? `<div class="gd-row">
        ${gdColHtml('🗑️', 'Mülleimer', gdTrioLines(entry.muell))}
        ${gdColHtml('💧', 'Wasser', gdTrioLines(entry.wasser))}
        ${gdColHtml('🧹', 'Platz aufräumen', gdListLine(entry.aufraeumen))}
      </div>`
    : `<div class="gd-empty">Für KW ${kw} ist noch nichts eingetragen.</div>`;

  widget.innerHTML = `
    <div class="panel-header">
      <span class="panel-label">Gruppenpflichten</span>
      <div style="display:flex;gap:8px;align-items:center;">
        <span class="gd-week-badge">KW ${kw}</span>
        <button type="button" class="icon-btn gd-edit-btn" id="gd-edit-btn" title="Wochenplan bearbeiten" aria-label="Wochenplan bearbeiten">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M11 2.3l2.4 2.4-8.1 8.1-3.1.7.7-3.1 8.1-8.1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>
    <div class="gd-body">${bodyHtml}</div>`;

  document.getElementById('gd-edit-btn')?.addEventListener('click', () => gdOpenModal(new Date()));
}

function renderGruppendienste() {
  gdBuildWidget();
}

// =========================
// WOCHENPLAN-MODAL
// =========================

let gdModalDate = new Date();

function gdModalWeekId() { return getWeekId(gdModalDate); }

function gdPopulateModal() {
  const weekId = gdModalWeekId();
  const kw     = getISOWeek(gdModalDate);
  const label  = document.getElementById('gd-modal-week-label');
  if (label) label.textContent = `KW ${kw} · ${gdModalDate.getFullYear()}`;

  const entry  = gdPlan[weekId] || {};
  const muell  = entry.muell  || {};
  const wasser = entry.wasser || {};

  document.getElementById('gd-muell-tn1').value     = muell.tn1    || '';
  document.getElementById('gd-muell-tn2').value     = muell.tn2    || '';
  document.getElementById('gd-muell-ersatz').value  = muell.ersatz || '';
  document.getElementById('gd-wasser-tn1').value    = wasser.tn1    || '';
  document.getElementById('gd-wasser-tn2').value    = wasser.tn2    || '';
  document.getElementById('gd-wasser-ersatz').value = wasser.ersatz || '';
  document.getElementById('gd-aufraeumen').value    = (entry.aufraeumen || []).join(', ');

  gdRefreshNameList();
}

function gdOpenModal(date) {
  gdModalDate = new Date(date);
  gdPopulateModal();
  gdModal.open();
}

function gdSaveModal() {
  const weekId = gdModalWeekId();
  const val = id => document.getElementById(id).value.trim();

  const muell  = { tn1: val('gd-muell-tn1'),  tn2: val('gd-muell-tn2'),  ersatz: val('gd-muell-ersatz') };
  const wasser = { tn1: val('gd-wasser-tn1'), tn2: val('gd-wasser-tn2'), ersatz: val('gd-wasser-ersatz') };
  const aufraeumen = val('gd-aufraeumen').split(',').map(s => s.trim()).filter(Boolean);

  const isEmpty = !muell.tn1 && !muell.tn2 && !muell.ersatz &&
                  !wasser.tn1 && !wasser.tn2 && !wasser.ersatz &&
                  aufraeumen.length === 0;

  if (isEmpty) delete gdPlan[weekId];
  else gdPlan[weekId] = { muell, wasser, aufraeumen };

  gdSavePlan();
  gdBuildWidget();
  gdModal.close();
}

function gdClearWeek() {
  delete gdPlan[gdModalWeekId()];
  gdSavePlan();
  gdPopulateModal();
  gdBuildWidget();
}

const gdModal = wireModal('gd-modal-overlay', { closeIds: ['gd-modal-close'] });

document.getElementById('gd-modal-prev')?.addEventListener('click', () => {
  gdModalDate.setDate(gdModalDate.getDate() - 7);
  gdPopulateModal();
});
document.getElementById('gd-modal-next')?.addEventListener('click', () => {
  gdModalDate.setDate(gdModalDate.getDate() + 7);
  gdPopulateModal();
});
document.getElementById('gd-save')?.addEventListener('click', gdSaveModal);
document.getElementById('gd-clear')?.addEventListener('click', gdClearWeek);

renderGruppendienste();
