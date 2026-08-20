// =========================
// MANIFEST: COZY HOME
// Lädt pets.js vorab, damit PET_DEFINITIONS beim Mount von cozy-home.js
// bereits im globalen Scope vorhanden ist.
// =========================

(function () {
  if (!document.querySelector('script[src="games/cozy-home/pets.js"]')) {
    const s = document.createElement('script');
    s.src = 'games/cozy-home/pets.js';
    document.head.appendChild(s);
  }
})();

// Cozy Home speichert komplett unter einem eigenen localStorage-Key
// ("cozyHomeData", siehe SAVE_KEY in cozy-home.js) statt im gemeinsamen
// gameHighscores-Objekt wie andere Spiele — kein Highscore-Konzept,
// sondern Haustiere/Münzen/Inventar. getStats()/resetStats() lesen daher
// direkt aus localStorage statt DB.get('gameHighscores', ...), und leben
// bewusst hier in manifest.js (nicht in cozy-home.js), damit sie auch
// funktionieren, wenn Cozy Home noch nie geöffnet wurde (siehe games.js:
// openGameStatsModal() braucht kein geladenes cozy-home.js).
function readCozyHomeSave() {
  const raw = localStorage.getItem('cozyHomeData');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

window.registerGame({
  id: 'cozy-home',
  title: 'Cozy Home',
  modalSize: "very-big",
  description: 'Sammle süße Pets und kümmer dich um sie.',
  icon: '🏠',
  accent: 'pink',
  // comingSoon: true

  getStats() {
    const save = readCozyHomeSave();
    if (!save) return [];
    return [
      { label: 'Haustiere', value: Array.isArray(save.ownedPets) ? save.ownedPets.length : 0 },
      { label: 'Münzen', value: save.coins || 0 },
    ];
  },

  // Eigener Button-Text/Warnhinweis im Stats-Modal (games.js) statt der
  // generischen "Statistiken zurücksetzen" — es werden hier keine reinen
  // Highscores gelöscht, sondern der komplette Spielstand (Haustiere,
  // Münzen, Inventar, Fortschritt).
  resetLabel: 'Cozy Home zurücksetzen',
  resetConfirmText: 'Cozy Home wirklich zurücksetzen? Alle Haustiere, Münzen und der Fortschritt gehen dabei verloren. Das kann nicht rückgängig gemacht werden.',
  resetStats() {
    localStorage.removeItem('cozyHomeData');
  },
});