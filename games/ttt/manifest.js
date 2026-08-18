// =========================
// MANIFEST: TIC-TAC-TOE
// Lädt sofort beim Start (für die Library-Karte UND das
// Statistik-Dashboard) — Stats lassen sich auch öffnen, ohne je "Spielen"
// geklickt zu haben, also ohne geladenes ttt.js (siehe games.js:
// openGameStatsModal). Deshalb lebt die gesamte Auswertungslogik hier.
//
// Datenmodell (DB-Key 'gameHighscores'.ttt):
//   totalGames / playerWins / opponentWins / draws
//     — bestehende Summen, werden von ttt.js bei JEDEM Spielende
//     weitergezählt, unabhängig davon, ob Detaildaten vorliegen.
//   history: [{ variant, mode, difficulty, result, ts }, ...]
//     — seit dieser Erweiterung protokolliert (siehe ttt.js handleEnd()).
//     Ältere Spielstände haben kein/ein leeres history-Array. Alle
//     Detail-Auswertungen unten (Gegner-/Varianten-Aufschlüsselung,
//     Serien, "Meistgespielt") werden ausschließlich aus history
//     berechnet und bleiben leer, wenn history leer ist — die Summen
//     oben sind davon unberührt und zählen wie bisher weiter.
// =========================

(function () {

  const VARIANT_LABEL = { normal: 'Normal', ultimate: 'Ultimate', disappearing: 'Disappearing' };
  const VARIANT_ICON = { normal: '⭕', ultimate: '🧩', disappearing: '💫' };
  const DIFF_LABEL = { easy: 'Leicht', medium: 'Mittel', hard: 'Schwer' };

  function readTTT() {
    const all = DB.get('gameHighscores', {});
    return all.ttt || {};
  }

  function getHistory(ttt) {
    return Array.isArray(ttt.history) ? ttt.history : [];
  }

  function pct(part, total) {
    return total > 0 ? Math.round((part / total) * 100) : 0;
  }

  function tally(list) {
    const games = list.length;
    const wins = list.filter(g => g.result === 'win').length;
    const losses = list.filter(g => g.result === 'loss').length;
    const draws = list.filter(g => g.result === 'draw').length;
    return { games, wins, losses, draws, winRate: pct(wins, games) };
  }

  // Serien werden ausschließlich aus history berechnet (chronologisch,
  // ältestes Spiel zuerst — siehe ttt.js: push() hängt neue Partien hinten
  // an). "Aktuelle Serie" = ununterbrochene Siege am Ende der Liste.
  function computeStreaks(list) {
    let longest = 0, run = 0;
    list.forEach(g => {
      if (g.result === 'win') { run++; longest = Math.max(longest, run); }
      else run = 0;
    });
    let current = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].result !== 'win') break;
      current++;
    }
    return { current, longest };
  }

  function mostCommon(list, key) {
    const counts = {};
    list.forEach(g => { if (g[key]) counts[g[key]] = (counts[g[key]] || 0) + 1; });
    const entries = Object.entries(counts);
    if (!entries.length) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return { key: entries[0][0], count: entries[0][1] };
  }

  function bestWinRateVariant(list) {
    let best = null;
    Object.keys(VARIANT_LABEL).forEach(v => {
      const t = tally(list.filter(g => g.variant === v));
      if (t.games > 0 && (!best || t.winRate > best.winRate)) best = Object.assign({ variant: v }, t);
    });
    return best;
  }

  function statCard(icon, value, label) {
    return `<div class="games-stats-card">
      <div class="games-stats-card-icon">${icon}</div>
      <div class="games-stats-card-value">${value}</div>
      <div class="games-stats-card-label">${label}</div>
    </div>`;
  }

  function breakdownGroup(icon, title, t, extraHtml) {
    return `<div class="games-stats-group">
      <div class="games-stats-group-header">
        <span>${icon} ${title}</span>
        <span class="games-stats-group-winrate">${t.games ? t.winRate + '%' : '—'}</span>
      </div>
      <div class="games-stats-group-grid">
        <div class="games-stats-mini"><span>${t.games}</span><small>Spiele</small></div>
        <div class="games-stats-mini"><span>${t.wins}</span><small>Siege</small></div>
        <div class="games-stats-mini"><span>${t.losses}</span><small>Niederl.</small></div>
        <div class="games-stats-mini"><span>${t.draws}</span><small>Unent.</small></div>
      </div>
      ${extraHtml || ''}
    </div>`;
  }

  function insightRow(label, value) {
    return `<div class="games-stats-row"><span class="games-stats-label">${label}</span><span class="games-stats-value">${value}</span></div>`;
  }

  function formatTimestamp(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ', ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  function renderStats() {
    const ttt = readTTT();
    const totalGames = ttt.totalGames || 0;

    if (!totalGames) {
      return `<p class="games-play-loading">Noch keine Statistiken vorhanden.</p>`;
    }

    const wins = ttt.playerWins || 0;
    const losses = ttt.opponentWins || 0;
    const draws = ttt.draws || 0;
    const list = getHistory(ttt);
    const streaks = computeStreaks(list);

    const cards = [
      statCard('🎮', totalGames, 'Gesamt'),
      statCard('🏆', wins, 'Siege'),
      statCard('❌', losses, 'Niederlagen'),
      statCard('🤝', draws, 'Unentschieden'),
      statCard('📊', pct(wins, totalGames) + '%', 'Siegquote'),
      statCard('🔥', streaks.longest, 'Beste Serie'),
      statCard('⭐', streaks.current, 'Akt. Serie')
    ].join('');

    let detailHtml;
    if (list.length) {
      const vsAi = tally(list.filter(g => g.mode === 'ai'));
      const vsP2 = tally(list.filter(g => g.mode === 'p2'));
      const diffLine = ['easy', 'medium', 'hard']
        .map(d => `${DIFF_LABEL[d]} ${list.filter(g => g.mode === 'ai' && g.difficulty === d).length}`)
        .join(' · ');

      const opponentSection = `
        <div class="games-stats-section-title">Gegner</div>
        <div class="games-stats-groups">
          ${breakdownGroup('🤖', 'Gegen KI', vsAi, vsAi.games ? `<div class="games-stats-subline">${diffLine}</div>` : '')}
          ${breakdownGroup('👤', 'Gegen Spieler 2', vsP2, '')}
        </div>`;

      const variantSection = `
        <div class="games-stats-section-title">Spielvariante</div>
        <div class="games-stats-groups">
          ${Object.keys(VARIANT_LABEL).map(v =>
            breakdownGroup(VARIANT_ICON[v], VARIANT_LABEL[v], tally(list.filter(g => g.variant === v)), '')
          ).join('')}
        </div>`;

      const mostPlayedVariant = mostCommon(list, 'variant');
      const mostCommonDiff = mostCommon(list.filter(g => g.mode === 'ai'), 'difficulty');
      const bestVariant = bestWinRateVariant(list);
      const last = list[list.length - 1];

      const insights = [
        mostPlayedVariant ? insightRow('🥇 Meistgespielte Variante', `${VARIANT_LABEL[mostPlayedVariant.key]} (${mostPlayedVariant.count})`) : '',
        mostCommonDiff ? insightRow('🤖 Häufigste KI-Schwierigkeit', `${DIFF_LABEL[mostCommonDiff.key]} (${mostCommonDiff.count})`) : '',
        bestVariant ? insightRow('🏆 Höchste Siegquote', `${VARIANT_LABEL[bestVariant.variant]} (${bestVariant.winRate}%)`) : '',
        last ? insightRow('📅 Zuletzt gespielt', formatTimestamp(last.ts)) : ''
      ].join('');

      const insightsSection = `
        <div class="games-stats-section-title">Weitere Statistiken</div>
        <div class="games-stats-insights">${insights}</div>`;

      detailHtml = opponentSection + variantSection + insightsSection;
    } else {
      detailHtml = `<p class="games-stats-hint">Detaillierte Aufschlüsselungen nach Gegner und Variante erscheinen ab dem nächsten gespielten Spiel — bisherige Partien wurden nur als Summe erfasst.</p>`;
    }

    return `<div class="games-stats-cards">${cards}</div>${detailHtml}`;
  }

  window.registerGame({
    id: 'ttt',
    title: 'Tic-Tac-Toe',
    description: 'Fordere die KI oder einen Freund heraus!',
    icon: '⭕',
    accent: 'purple',
    modalSize: 'middle', // Platz für den 9-Felder-Aufbau der Ultimate-Variante

    // Generisches Format: Liste aus {label, value}. Der Hub zeigt die ersten
    // zwei Einträge auf der Karte. Fürs Stats-Modal wird stattdessen
    // renderStats() genutzt (siehe unten) — getStats() bleibt unverändert,
    // damit sich an der Library-Karte nichts ändert.
    getStats() {
      const ttt = readTTT();
      return [
        { label: 'Siege', value: ttt.playerWins || 0 },
        { label: 'Niederlagen', value: ttt.opponentWins || 0 },
        { label: 'Unentschieden', value: ttt.draws || 0 }
      ];
    },

    // Eigenes Dashboard-Markup fürs Stats-Modal (Kennzahlen-Karten +
    // Aufschlüsselung nach Gegner/Variante) statt der generischen
    // {label,value}-Zeilenliste — siehe games.js openGameStatsModal().
    renderStats,

    resetStats() {
      const all = DB.get('gameHighscores', {});
      delete all.ttt;
      DB.set('gameHighscores', all);
    }
  });

})();
