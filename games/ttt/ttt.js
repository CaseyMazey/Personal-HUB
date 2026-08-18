// =========================
// SPIEL-LOGIK: TIC-TAC-TOE
// Wird erst beim ersten Klick auf "Spielen" geladen.
// Ergänzt die bereits über manifest.js registrierte Karte um mount/destroy.
//
// Drei Varianten:
//   - normal:       klassisches 3×3 Tic-Tac-Toe (unverändert gegenüber v1)
//   - ultimate:     9 kleine 3×3-Spiele in einem großen 3×3-Raster
//   - disappearing: normales 3×3, aber max. 5 Zeichen gleichzeitig auf dem Feld
//
// state.variant steuert, welcher Render-/Klick-Pfad aktiv ist. Normal und
// Disappearing teilen sich state.board (flaches 9er-Array); Ultimate hat
// seinen eigenen state.ultimate-Unterbaum. checkWinner() ist die einzige
// Gewinnlogik und wird von allen drei Varianten wiederverwendet (auch für
// die "großes Feld gewonnen"-Prüfung bei Ultimate, siehe dort).
// =========================

(function () {

  const DISAPPEARING_MAX = 5;

  const state = {
    variant: 'normal', // 'normal' | 'ultimate' | 'disappearing'
    vsAI: true,
    difficulty: 'medium',
    scores: { X: 0, O: 0, draw: 0 },
    gameOver: false,
    current: 'X',

    // normal + disappearing
    board: Array(9).fill(null),
    moveOrder: [], // disappearing: gespielte Feld-Indizes in Reihenfolge (ältestes zuerst)

    // ultimate
    ultimate: {
      boards: Array.from({ length: 9 }, () => Array(9).fill(null)),
      boardWinners: Array(9).fill(null), // je kleines Spiel: null | 'X' | 'O' | 'draw'
      activeBoard: null,                 // null = freie Wahl, sonst Pflichtfeld-Index
      pendingChoiceBy: null               // null, oder 'X'/'O' = dieser Spieler muss das nächste Feld wählen
    }
  };

  let els = {};

  const VARIANT_INFO = {
    normal: 'Klassisches Tic-Tac-Toe: Wer zuerst eine Dreierreihe hat, gewinnt.',
    ultimate: 'Neun kleine Tic-Tac-Toe-Spiele in einem großen 3×3-Raster. Ein kleines Spiel wird immer vollständig zu Ende gespielt. Wer es gewinnt, wählt danach, in welchem noch offenen Feld als Nächstes gespielt wird — endet es unentschieden, wählt (gegen die KI) der Mensch, gegen einen Freund wird zufällig entschieden. Wer drei kleine Spiele in einer Reihe gewinnt, gewinnt das große Spiel.',
    disappearing: 'Wie normales Tic-Tac-Toe, aber es dürfen maximal 5 Zeichen gleichzeitig auf dem Feld liegen. Beim 6. Zug verschwindet automatisch das älteste Zeichen (gestrichelt markiert) — plane also nicht zu langfristig!'
  };

  // ---- Highscores ----

  function readHighscores() {
    const all = DB.get('gameHighscores', {});
    if (!all.ttt) all.ttt = {};
    return all;
  }

  // ---- Gemeinsame Spiellogik ----

  function checkWinner(board) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line: [a, b, c] };
      }
    }
    if (board.every(Boolean)) return { winner: 'draw', line: [] };
    return null;
  }

  function findWinningMove(board, sym) {
    const empty = board.map((_, i) => i).filter(i => !board[i]);
    for (const i of empty) {
      const b = [...board]; b[i] = sym;
      if (checkWinner(b)?.winner === sym) return i;
    }
    return -1;
  }

  function aiMove(board) {
    const empty = board.map((_, i) => i).filter(i => !board[i]);
    if (!empty.length) return -1;

    if (state.difficulty === 'easy'   && Math.random() < 0.85) return empty[Math.floor(Math.random() * empty.length)];
    if (state.difficulty === 'medium' && Math.random() < 0.5)  return empty[Math.floor(Math.random() * empty.length)];
    if (state.difficulty === 'hard'   && Math.random() < 0.2)  return empty[Math.floor(Math.random() * empty.length)];

    const win = findWinningMove(board, 'O'); if (win !== -1) return win;
    const block = findWinningMove(board, 'X'); if (block !== -1) return block;
    if (!board[4]) return 4;
    const corners = [0, 2, 6, 8].filter(i => !board[i]);
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Historie wird nach oben begrenzt, damit localStorage nicht unbegrenzt
  // wächst — für die Statistik-Aufschlüsselungen im Dashboard reichen die
  // letzten paar tausend Partien bei Weitem.
  const HISTORY_LIMIT = 2000;

  function handleEnd(r) {
    if (r.winner === 'draw') state.scores.draw++;
    else state.scores[r.winner] = (state.scores[r.winner] || 0) + 1;

    const all = readHighscores();
    all.ttt.totalGames = (all.ttt.totalGames || 0) + 1;
    if (r.winner === 'X') all.ttt.playerWins = (all.ttt.playerWins || 0) + 1;
    else if (r.winner === 'O') all.ttt.opponentWins = (all.ttt.opponentWins || 0) + 1;
    else all.ttt.draws = (all.ttt.draws || 0) + 1;

    // Detaillierte Spielhistorie fürs Statistik-Dashboard (manifest.js
    // renderStats()). Ältere Partien vor dieser Erweiterung besitzen kein
    // history-Array und zählen weiterhin nur in den Summen oben mit.
    if (!Array.isArray(all.ttt.history)) all.ttt.history = [];
    all.ttt.history.push({
      variant: state.variant,
      mode: state.vsAI ? 'ai' : 'p2',
      difficulty: state.vsAI ? state.difficulty : null,
      result: r.winner === 'X' ? 'win' : (r.winner === 'O' ? 'loss' : 'draw'),
      ts: Date.now()
    });
    if (all.ttt.history.length > HISTORY_LIMIT) {
      all.ttt.history = all.ttt.history.slice(-HISTORY_LIMIT);
    }

    DB.set('gameHighscores', all);

    state.gameOver = true;
  }

  // ---- Render: gemeinsamer Rahmen (Status + Score) ----

  function renderStatus(result, hint, override) {
    if (result) {
      els.status.textContent = result.winner === 'draw' ? 'Unentschieden 🤝' : `Spieler ${result.winner} gewinnt! 🎉`;
      els.status.className = 'ttt-status-new win';
    } else if (override) {
      els.status.textContent = override;
      els.status.className = 'ttt-status-new';
    } else {
      const cls = state.current === 'X' ? 'ttt-turn-x' : 'ttt-turn-o';
      els.status.innerHTML = `<span class="${cls}">Spieler ${state.current}</span>&nbsp;ist dran`
        + (hint ? ` <span class="ttt-status-hint">· ${hint}</span>` : '');
      els.status.className = 'ttt-status-new';
    }
  }

  function renderScore() {
    els.score.innerHTML = `
      <span class="ttt-score-x">✕ ${state.scores.X || 0}</span>
      <span class="ttt-score-sep">—</span>
      <span>${state.scores.draw || 0}</span>
      <span class="ttt-score-sep">—</span>
      <span class="ttt-score-o">○ ${state.scores.O || 0}</span>`;
  }

  function render() {
    let out;
    if (state.variant === 'ultimate') out = renderUltimateBoard();
    else if (state.variant === 'disappearing') out = renderDisappearingBoard();
    else out = renderNormalBoard();

    renderStatus(out.result, out.hint, out.override);
    renderScore();
  }

  // ---- Variante: Normal (unverändert) ----

  function renderNormalBoard() {
    const result = checkWinner(state.board);

    els.board.className = 'ttt-board';
    els.board.innerHTML = '';
    state.board.forEach((cell, i) => {
      const btn = document.createElement('button');
      btn.className = 'ttt-cell'
        + (cell ? ` filled ${cell === 'X' ? 'x-cell' : 'o-cell'}` : '')
        + (result?.line?.includes(i) ? ' winning' : '');
      btn.textContent = cell || '';
      btn.disabled = !!cell || !!result || state.gameOver;
      btn.addEventListener('click', () => handleNormalCellClick(i));
      els.board.appendChild(btn);
    });

    return { result };
  }

  function handleNormalCellClick(i) {
    if (state.board[i] || state.gameOver) return;
    state.board[i] = state.current;

    const r = checkWinner(state.board);
    if (r) { handleEnd(r); render(); return; }

    state.current = state.current === 'X' ? 'O' : 'X';
    render();

    if (state.vsAI && state.current === 'O' && !checkWinner(state.board)) {
      setTimeout(() => {
        const move = aiMove(state.board);
        if (move === -1) return;
        state.board[move] = 'O';
        const r2 = checkWinner(state.board);
        if (r2) handleEnd(r2); else state.current = 'X';
        render();
      }, 300);
    }
  }

  // ---- Variante: Disappearing ----
  // Maximal DISAPPEARING_MAX Zeichen gleichzeitig auf dem Feld. Beim
  // nächsten Zug, sobald das Limit erreicht ist, verschwindet zuerst das
  // älteste gesetzte Zeichen (state.moveOrder[0]), danach wird neu gesetzt.

  function applyDisappearingMove(i, sym) {
    if (state.moveOrder.length >= DISAPPEARING_MAX) {
      const oldest = state.moveOrder.shift();
      state.board[oldest] = null;
    }
    state.board[i] = sym;
    state.moveOrder.push(i);
    return checkWinner(state.board);
  }

  function renderDisappearingBoard() {
    const result = checkWinner(state.board);
    const oldestIdx = state.moveOrder.length >= DISAPPEARING_MAX ? state.moveOrder[0] : null;

    els.board.className = 'ttt-board';
    els.board.innerHTML = '';
    state.board.forEach((cell, i) => {
      const btn = document.createElement('button');
      btn.className = 'ttt-cell'
        + (cell ? ` filled ${cell === 'X' ? 'x-cell' : 'o-cell'}` : '')
        + (result?.line?.includes(i) ? ' winning' : '')
        + (i === oldestIdx ? ' fading' : '');
      btn.textContent = cell || '';
      btn.title = i === oldestIdx ? 'Verschwindet beim nächsten Zug' : '';
      btn.disabled = !!cell || !!result || state.gameOver;
      btn.addEventListener('click', () => handleDisappearingCellClick(i));
      els.board.appendChild(btn);
    });

    return { result, hint: `${state.moveOrder.length}/${DISAPPEARING_MAX} auf dem Feld` };
  }

  function handleDisappearingCellClick(i) {
    if (state.board[i] || state.gameOver) return;
    const r = applyDisappearingMove(i, state.current);
    if (r) { handleEnd(r); render(); return; }

    state.current = state.current === 'X' ? 'O' : 'X';
    render();

    if (state.vsAI && state.current === 'O' && !state.gameOver) {
      setTimeout(() => {
        const move = aiMove(state.board);
        if (move === -1) return;
        const r2 = applyDisappearingMove(move, 'O');
        if (r2) handleEnd(r2); else state.current = 'X';
        render();
      }, 300);
    }
  }

  // ---- Variante: Ultimate ----
  // state.ultimate.boards: 9 kleine Bretter (je 9 Zellen).
  // state.ultimate.boardWinners: Ergebnis je kleinem Brett (null/'X'/'O'/'draw').
  // state.ultimate.activeBoard: Pflichtfeld für den nächsten Zug, oder null
  // für freie Wahl (wenn das Zielfeld bereits entschieden ist).
  // checkWinner(boardWinners) prüft das große Feld — 'draw' ist truthy, aber
  // ungleich 'X'/'O', blockiert also Reihen korrekt wie ein "totes" Feld.

  function resetUltimateState() {
    state.ultimate.boards = Array.from({ length: 9 }, () => Array(9).fill(null));
    state.ultimate.boardWinners = Array(9).fill(null);
    state.ultimate.activeBoard = null;
    state.ultimate.pendingChoiceBy = null;
  }

  function isUltimateMoveLegal(bigIdx, smallIdx) {
    const u = state.ultimate;
    if (u.pendingChoiceBy) return false; // erst muss das nächste Feld gewählt werden
    if (u.boardWinners[bigIdx] !== null) return false;
    if (u.boards[bigIdx][smallIdx]) return false;
    if (u.activeBoard !== null && u.activeBoard !== bigIdx) return false;
    return true;
  }

  // Wird aufgerufen, sobald ein kleines Spiel entschieden ist (Sieg oder
  // Unentschieden), um festzulegen, welches Feld als Nächstes gesperrt wird:
  //   - Sieg  → der Gewinner (Mensch oder KI) wählt das nächste offene Feld.
  //   - Unentschieden, gegen KI → immer der Mensch wählt.
  //   - Unentschieden, 2 Spieler → zufällige Wahl (niemand hat "gewonnen").
  // Wählt ein Mensch, wird das per pendingChoiceBy markiert und im UI als
  // eigener Auswahlschritt dargestellt (siehe renderUltimateBoard). Wählt
  // die KI, passiert das sofort und deterministisch (nicht zufällig).
  function determineNextBoardSelection(winner) {
    const u = state.ultimate;
    const openBoards = u.boardWinners.map((w, i) => (w === null ? i : -1)).filter(i => i !== -1);

    if (openBoards.length <= 1) {
      u.activeBoard = openBoards.length ? openBoards[0] : null;
      u.pendingChoiceBy = null;
      return;
    }

    if (winner === 'draw') {
      if (state.vsAI) {
        u.pendingChoiceBy = 'X'; // "der Spieler darf wählen" — immer der Mensch
        u.activeBoard = null;
      } else {
        u.activeBoard = openBoards[Math.floor(Math.random() * openBoards.length)];
        u.pendingChoiceBy = null;
      }
      return;
    }

    // winner ist 'X' oder 'O' — dieser Spieler wählt das nächste Feld.
    if (state.vsAI && winner === 'O') {
      u.activeBoard = ultimateAiPickBoard(openBoards);
      u.pendingChoiceBy = null;
    } else {
      u.pendingChoiceBy = winner;
      u.activeBoard = null;
    }
  }

  function applyUltimateMove(bigIdx, smallIdx, sym) {
    const u = state.ultimate;
    u.boards[bigIdx][smallIdx] = sym;

    const smallResult = checkWinner(u.boards[bigIdx]);
    if (!smallResult) {
      // Kleines Spiel läuft weiter — ab jetzt auf dieses Feld gesperrt, bis
      // es entschieden ist. Wichtig für den allerersten Zug der Partie
      // (activeBoard ist dort noch null/frei): ohne diese Zeile könnte der
      // Gegner mitten in einem laufenden kleinen Spiel in ein anderes
      // wechseln, statt es zu Ende zu spielen.
      u.activeBoard = bigIdx;
      return null;
    }

    u.boardWinners[bigIdx] = smallResult.winner;

    const metaResult = checkWinner(u.boardWinners);
    if (metaResult) {
      u.activeBoard = null;
      u.pendingChoiceBy = null;
      return metaResult;
    }

    determineNextBoardSelection(smallResult.winner);
    return null;
  }

  // Heuristik für die KI, wenn SIE das nächste Feld wählen darf (weil sie
  // das kleine Spiel gewonnen hat): meidet Felder, in denen der Mensch
  // sofort gewinnen könnte, bevorzugt Felder mit eigener Drohung/Präsenz
  // und die Mitte. Randomness nur als Tie-Breaker unter gleich guten
  // Feldern — nie als alleiniges Auswahlkriterium.
  function ultimateAiPickBoard(openBoards) {
    const u = state.ultimate;
    const scoreBoard = b => {
      const board = u.boards[b];
      if (findWinningMove(board, 'X') !== -1) return -10; // Mensch könnte dort sofort gewinnen → meiden
      let score = 0;
      if (findWinningMove(board, 'O') !== -1) score += 2; // eigene Drohung dort
      if (b === 4) score += 1;                            // Mitte leicht bevorzugt
      score += board.filter(c => c === 'O').length * 0.5; // eigene Präsenz
      return score;
    };
    const scored = openBoards.map(b => ({ b, s: scoreBoard(b) }));
    const maxScore = Math.max(...scored.map(x => x.s));
    const bestOnes = scored.filter(x => x.s === maxScore).map(x => x.b);
    return bestOnes[Math.floor(Math.random() * bestOnes.length)];
  }

  // Zellwahl der KI innerhalb ihres Pflichtfelds (state.ultimate.activeBoard
  // ist zu diesem Zeitpunkt immer gesetzt — siehe determineNextBoardSelection
  // und chooseNextBoard). Nutzt dieselbe aiMove()-Heuristik wie normales
  // Tic-Tac-Toe.
  function ultimateAiMove() {
    const u = state.ultimate;
    const bigIdx = u.activeBoard;
    if (bigIdx === null || u.boardWinners[bigIdx] !== null) return null;

    const smallIdx = aiMove(u.boards[bigIdx]);
    if (smallIdx === -1) return null;
    return { bigIdx, smallIdx };
  }

  function maybeScheduleUltimateAiTurn() {
    if (!(state.vsAI && state.current === 'O' && !state.gameOver)) return;
    setTimeout(() => {
      const move = ultimateAiMove();
      if (!move) return;
      const r2 = applyUltimateMove(move.bigIdx, move.smallIdx, 'O');
      if (r2) handleEnd(r2); else state.current = 'X';
      render();
    }, 300);
  }

  // Wird aufgerufen, wenn ein Mensch (state.ultimate.pendingChoiceBy) das
  // nächste Feld auswählt, indem er auf ein beliebiges offenes kleines
  // Spiel klickt (siehe renderUltimateBoard, .pickable-board).
  function chooseNextBoard(b) {
    const u = state.ultimate;
    if (state.gameOver || !u.pendingChoiceBy) return;
    if (u.boardWinners[b] !== null) return;

    u.activeBoard = b;
    u.pendingChoiceBy = null;
    render();
    maybeScheduleUltimateAiTurn();
  }

  function renderUltimateBoard() {
    const u = state.ultimate;
    const metaResult = checkWinner(u.boardWinners);
    const gameActive = !state.gameOver && !metaResult;
    const picking = gameActive && !!u.pendingChoiceBy;

    els.board.className = 'ttt-ultimate-board';
    els.board.innerHTML = '';

    for (let b = 0; b < 9; b++) {
      const winner = u.boardWinners[b];
      const isOpenBoard = winner === null;
      const isPickable = picking && isOpenBoard;
      const isActive = !picking && gameActive && isOpenBoard && (u.activeBoard === null || u.activeBoard === b);
      const isLocked = gameActive && isOpenBoard && !isActive && !isPickable;

      const boardWrap = document.createElement('div');
      boardWrap.className = 'ttt-mini-board'
        + (winner ? ' mini-done' : '')
        + (isActive ? ' active-board' : '')
        + (isPickable ? ' pickable-board' : '')
        + (isLocked ? ' locked' : '');

      const grid = document.createElement('div');
      grid.className = 'ttt-mini-grid';
      const smallLine = winner && winner !== 'draw' ? checkWinner(u.boards[b])?.line : null;

      u.boards[b].forEach((cell, s) => {
        const btn = document.createElement('button');
        btn.className = 'ttt-mini-cell'
          + (cell ? ` filled ${cell === 'X' ? 'x-cell' : 'o-cell'}` : '')
          + (smallLine?.includes(s) ? ' winning' : '');
        btn.textContent = cell || '';
        btn.disabled = !!cell || !isActive;
        btn.addEventListener('click', () => handleUltimateCellClick(b, s));
        grid.appendChild(btn);
      });
      boardWrap.appendChild(grid);

      if (isPickable) {
        boardWrap.addEventListener('click', () => chooseNextBoard(b));
      }

      if (winner) {
        const overlay = document.createElement('div');
        overlay.className = 'ttt-mini-overlay ' + (winner === 'draw' ? 'draw' : (winner === 'X' ? 'x-cell' : 'o-cell'));
        overlay.textContent = winner === 'draw' ? '—' : winner;
        boardWrap.appendChild(overlay);
      }

      els.board.appendChild(boardWrap);
    }

    let hint = null;
    let override = null;
    if (!metaResult) {
      if (picking) override = `Spieler ${u.pendingChoiceBy} wählt das nächste Spielfeld`;
      else if (u.activeBoard === null) hint = 'freie Feldwahl';
      else hint = `Pflichtfeld ${u.activeBoard + 1} markiert`;
    }

    return { result: metaResult, hint, override };
  }

  function handleUltimateCellClick(bigIdx, smallIdx) {
    if (state.gameOver || !isUltimateMoveLegal(bigIdx, smallIdx)) return;
    const r = applyUltimateMove(bigIdx, smallIdx, state.current);
    if (r) { handleEnd(r); render(); return; }

    state.current = state.current === 'X' ? 'O' : 'X';
    render();
    maybeScheduleUltimateAiTurn();
  }

  // ---- Steuerung (Variante / Modus / Schwierigkeit / Reset) ----

  function reset() {
    state.current = 'X';
    state.gameOver = false;
    state.board = Array(9).fill(null);
    state.moveOrder = [];
    resetUltimateState();
    render();
  }

  function setVariant(v) {
    state.variant = v;
    Object.entries(els.variant).forEach(([key, btn]) => btn.classList.toggle('active', key === v));
    els.info.textContent = VARIANT_INFO[v];
    state.scores = { X: 0, O: 0, draw: 0 }; // andere Regeln → eigener Zählstand
    reset();
  }

  function setMode(vsAI) {
    state.vsAI = vsAI;
    els.optAi.classList.toggle('active', vsAI);
    els.optP2.classList.toggle('active', !vsAI);
    els.diffGroup.style.display = vsAI ? '' : 'none';
    reset();
  }

  function setDifficulty(d) {
    state.difficulty = d;
    ['easy', 'medium', 'hard'].forEach(x => els.diff[x].classList.toggle('active', x === d));
    reset();
  }

  // ---- Lifecycle (wird vom Hub aufgerufen) ----

  function mount(container) {
    container.innerHTML = `
      <div class="game-setting-group">
        <span class="game-setting-label">Variante</span>
        <div class="game-toggle-group">
          <button class="game-toggle-btn active" data-variant="normal">Normal</button>
          <button class="game-toggle-btn" data-variant="ultimate">Ultimate</button>
          <button class="game-toggle-btn" data-variant="disappearing">Disappearing</button>
        </div>
      </div>
      <p class="ttt-variant-info" id="ttt-info-el"></p>
      <div class="game-setting-group">
        <span class="game-setting-label">Modus</span>
        <div class="game-toggle-group">
          <button class="game-toggle-btn active" data-mode="ai">Gegen KI</button>
          <button class="game-toggle-btn" data-mode="p2">2 Spieler</button>
        </div>
      </div>
      <div class="game-setting-group" id="ttt-diff-group">
        <span class="game-setting-label">Schwierigkeit</span>
        <div class="game-toggle-group">
          <button class="game-toggle-btn" data-diff="easy">Leicht</button>
          <button class="game-toggle-btn active" data-diff="medium">Mittel</button>
          <button class="game-toggle-btn" data-diff="hard">Schwer</button>
        </div>
      </div>
      <div class="ttt-status-new" id="ttt-status-el"></div>
      <div class="ttt-board" id="ttt-board-el"></div>
      <div class="ttt-score" id="ttt-score-el"></div>
      <button class="game-action-btn" id="ttt-reset-el">Neues Spiel</button>
    `;

    els = {
      board: container.querySelector('#ttt-board-el'),
      status: container.querySelector('#ttt-status-el'),
      score: container.querySelector('#ttt-score-el'),
      info: container.querySelector('#ttt-info-el'),
      variant: {
        normal: container.querySelector('[data-variant="normal"]'),
        ultimate: container.querySelector('[data-variant="ultimate"]'),
        disappearing: container.querySelector('[data-variant="disappearing"]')
      },
      optAi: container.querySelector('[data-mode="ai"]'),
      optP2: container.querySelector('[data-mode="p2"]'),
      diffGroup: container.querySelector('#ttt-diff-group'),
      diff: {
        easy: container.querySelector('[data-diff="easy"]'),
        medium: container.querySelector('[data-diff="medium"]'),
        hard: container.querySelector('[data-diff="hard"]')
      }
    };

    Object.entries(els.variant).forEach(([v, btn]) => btn.addEventListener('click', () => setVariant(v)));
    els.optAi.addEventListener('click', () => setMode(true));
    els.optP2.addEventListener('click', () => setMode(false));
    ['easy', 'medium', 'hard'].forEach(d => els.diff[d].addEventListener('click', () => setDifficulty(d)));
    container.querySelector('#ttt-reset-el').addEventListener('click', reset);

    state.variant = 'normal';
    state.board = Array(9).fill(null);
    state.moveOrder = [];
    resetUltimateState();
    state.current = 'X';
    state.gameOver = false;
    state.scores = { X: 0, O: 0, draw: 0 };
    els.info.textContent = VARIANT_INFO.normal;
    render();
  }

  function destroy() {
    // Keine Timer/Intervalle bei TTT — nichts aufzuräumen.
  }

  // Ergänzt nur mount/destroy — Meta-Daten kommen bereits aus manifest.js,
  // registerGame() merged beide Aufrufe zusammen.
  window.registerGame({
    id: 'ttt',
    mount,
    destroy
  });

})();
