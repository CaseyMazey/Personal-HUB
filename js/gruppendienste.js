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

// Initialbefüllung aus dem bisherigen Excel-Wochenplan
// (KW 12/2026 – KW 36/2028). Wochen sind über die ISO-Kalenderwoche
// verschlüsselt (Format "YYYY-Wnn", siehe getWeekId in main.js).
// Danach lebt der Plan ausschließlich in Nook (DB-Key
// 'gruppendienstePlan') und wird dort weitergepflegt — Excel wird
// nicht mehr benötigt.
const GD_SEED_PLAN = {
  '2026-W12': { muell: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['drüben 2'] },
  '2026-W13': { muell: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, wasser: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2026-W14': { muell: { tn1: 'Dietrich', tn2: 'Chario', ersatz: 'Baginski' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, aufraeumen: ['drüben 1'] },
  '2026-W15': { muell: { tn1: 'Körner', tn2: 'Dietrich', ersatz: 'Chario' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2026-W16': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['drüben 2'] },
  '2026-W17': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2026-W18': { muell: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['drüben 1'] },
  '2026-W19': { muell: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2026-W20': { muell: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, wasser: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, aufraeumen: ['drüben 2'] },
  '2026-W21': { muell: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2026-W22': { muell: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['drüben 1'] },
  '2026-W23': { muell: { tn1: 'Dietrich', tn2: 'Chario', ersatz: 'Baginski' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2026-W24': { muell: { tn1: 'Körner', tn2: 'Dietrich', ersatz: 'Chario' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['drüben 2'] },
  '2026-W25': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2026-W26': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, aufraeumen: ['drüben 1'] },
  '2026-W27': { muell: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2026-W28': { muell: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['drüben 2'] },
  '2026-W29': { muell: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2026-W30': { muell: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['drüben 1'] },
  '2026-W31': { muell: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2026-W32': { muell: { tn1: 'Dietrich', tn2: 'Chario', ersatz: 'Baginski' }, wasser: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, aufraeumen: ['drüben 2'] },
  '2026-W33': { muell: { tn1: 'Körner', tn2: 'Dietrich', ersatz: 'Chario' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2026-W34': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['drüben 1'] },
  '2026-W35': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2026-W36': { muell: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['drüben 2'] },
  '2026-W37': { muell: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2026-W38': { muell: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['drüben 1'] },
  '2026-W39': { muell: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, wasser: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2026-W40': { muell: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, aufraeumen: ['drüben 2'] },
  '2026-W41': { muell: { tn1: 'Dietrich', tn2: 'Chario', ersatz: 'Baginski' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2026-W42': { muell: { tn1: 'Körner', tn2: 'Dietrich', ersatz: 'Chario' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['drüben 1'] },
  '2026-W43': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2026-W44': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['drüben 2'] },
  '2026-W45': { muell: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2026-W46': { muell: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, wasser: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, aufraeumen: ['drüben 1'] },
  '2026-W47': { muell: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2026-W48': { muell: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['drüben 2'] },
  '2026-W49': { muell: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2026-W50': { muell: { tn1: 'Dietrich', tn2: 'Chario', ersatz: 'Baginski' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['drüben 1'] },
  '2026-W51': { muell: { tn1: 'Körner', tn2: 'Dietrich', ersatz: 'Chario' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2026-W52': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['drüben 2'] },
  '2026-W53': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2027-W01': { muell: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, aufraeumen: ['drüben 1'] },
  '2027-W02': { muell: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2027-W03': { muell: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['drüben 2'] },
  '2027-W04': { muell: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2027-W05': { muell: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['drüben 1'] },
  '2027-W06': { muell: { tn1: 'Dietrich', tn2: 'Chario', ersatz: 'Baginski' }, wasser: { tn1: 'Velchev', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2027-W07': { muell: { tn1: 'Körner', tn2: 'Dietrich', ersatz: 'Chario' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Rustler' }, aufraeumen: ['drüben 2'] },
  '2027-W08': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2027-W09': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['drüben 1'] },
  '2027-W10': { muell: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2027-W11': { muell: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['drüben 2'] },
  '2027-W12': { muell: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2027-W13': { muell: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, wasser: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, aufraeumen: ['drüben 1'] },
  '2027-W14': { muell: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2027-W15': { muell: { tn1: 'Dietrich', tn2: 'Chario', ersatz: 'Baginski' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['drüben 2'] },
  '2027-W16': { muell: { tn1: 'Körner', tn2: 'Dietrich', ersatz: 'Chario' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2027-W17': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['drüben 1'] },
  '2027-W18': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2027-W19': { muell: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, wasser: { tn1: 'Velchev', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['drüben 2'] },
  '2027-W20': { muell: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Rustler' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2027-W21': { muell: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['drüben 1'] },
  '2027-W22': { muell: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2027-W23': { muell: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['drüben 2'] },
  '2027-W24': { muell: { tn1: 'Dietrich', tn2: 'Chario', ersatz: 'Baginski' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2027-W25': { muell: { tn1: 'Körner', tn2: 'Dietrich', ersatz: 'Chario' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['drüben 1'] },
  '2027-W26': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2027-W27': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, aufraeumen: ['drüben 2'] },
  '2027-W28': { muell: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2027-W29': { muell: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['drüben 1'] },
  '2027-W30': { muell: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2027-W31': { muell: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['drüben 2'] },
  '2027-W32': { muell: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2027-W33': { muell: { tn1: 'Dietrich', tn2: 'Chario', ersatz: 'Baginski' }, wasser: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, aufraeumen: ['drüben 1'] },
  '2027-W34': { muell: { tn1: 'Körner', tn2: 'Dietrich', ersatz: 'Chario' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2027-W35': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['drüben 2'] },
  '2027-W36': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2027-W37': { muell: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['drüben 1'] },
  '2027-W38': { muell: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2027-W39': { muell: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['drüben 2'] },
  '2027-W40': { muell: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, wasser: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2027-W41': { muell: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, aufraeumen: ['drüben 1'] },
  '2027-W42': { muell: { tn1: 'Dietrich', tn2: 'Chario', ersatz: 'Baginski' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2027-W43': { muell: { tn1: 'Körner', tn2: 'Dietrich', ersatz: 'Chario' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['drüben 2'] },
  '2027-W44': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2027-W45': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['drüben 1'] },
  '2027-W46': { muell: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2027-W47': { muell: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, wasser: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, aufraeumen: ['drüben 2'] },
  '2027-W48': { muell: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, wasser: { tn1: 'Velchev', tn2: 'Velchev', ersatz: 'Ternes' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2027-W49': { muell: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Velchev' }, aufraeumen: ['drüben 1'] },
  '2027-W50': { muell: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2027-W51': { muell: { tn1: 'Dietrich', tn2: 'Chario', ersatz: 'Baginski' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['drüben 2'] },
  '2027-W52': { muell: { tn1: 'Körner', tn2: 'Dietrich', ersatz: 'Chario' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2028-W01': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['drüben 1'] },
  '2028-W02': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2028-W03': { muell: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, wasser: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, aufraeumen: ['drüben 2'] },
  '2028-W04': { muell: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2028-W05': { muell: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['drüben 1'] },
  '2028-W06': { muell: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2028-W07': { muell: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['drüben 2'] },
  '2028-W08': { muell: { tn1: 'Dietrich', tn2: 'Chario', ersatz: 'Baginski' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2028-W09': { muell: { tn1: 'Körner', tn2: 'Dietrich', ersatz: 'Chario' }, wasser: { tn1: 'Velchev', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['drüben 1'] },
  '2028-W10': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Rustler' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2028-W11': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['drüben 2'] },
  '2028-W12': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2028-W13': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['drüben 1'] },
  '2028-W14': { muell: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, wasser: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2028-W15': { muell: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, aufraeumen: ['drüben 2'] },
  '2028-W16': { muell: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2028-W17': { muell: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['drüben 1'] },
  '2028-W18': { muell: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2028-W19': { muell: { tn1: 'Dietrich', tn2: 'Chario', ersatz: 'Baginski' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['drüben 2'] },
  '2028-W20': { muell: { tn1: 'Körner', tn2: 'Dietrich', ersatz: 'Chario' }, wasser: { tn1: 'Velchev', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2028-W21': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Rustler' }, aufraeumen: ['drüben 1'] },
  '2028-W22': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2028-W23': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['drüben 2'] },
  '2028-W24': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2028-W25': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['drüben 1'] },
  '2028-W26': { muell: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, wasser: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2028-W27': { muell: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, aufraeumen: ['drüben 2'] },
  '2028-W28': { muell: { tn1: 'Velchev', tn2: 'Ternes', ersatz: 'Rustler' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2028-W29': { muell: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Ternes' }, wasser: { tn1: 'Leukel', tn2: 'Chario', ersatz: 'Baginski' }, aufraeumen: ['drüben 1'] },
  '2028-W30': { muell: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, wasser: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Chario' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2028-W31': { muell: { tn1: 'Dietrich', tn2: 'Chario', ersatz: 'Baginski' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['drüben 2'] },
  '2028-W32': { muell: { tn1: 'Körner', tn2: 'Dietrich', ersatz: 'Chario' }, wasser: { tn1: 'Velchev', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
  '2028-W33': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Baginski', tn2: 'Velchev', ersatz: 'Rustler' }, aufraeumen: ['drüben 1'] },
  '2028-W34': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Chario', tn2: 'Baginski', ersatz: 'Velchev' }, aufraeumen: ['Körner', 'Ternes', 'Velchev', 'Chario'] },
  '2028-W35': { muell: { tn1: 'Leukel', tn2: 'Körner', ersatz: 'Dietrich' }, wasser: { tn1: 'Rustler', tn2: 'Prepens', ersatz: 'Leukel' }, aufraeumen: ['drüben 2'] },
  '2028-W36': { muell: { tn1: 'Prepens', tn2: 'Leukel', ersatz: 'Körner' }, wasser: { tn1: 'Ternes', tn2: 'Rustler', ersatz: 'Prepens' }, aufraeumen: ['Dietrich', 'Leukel', 'Rustler', 'Prepens', 'Baginski'] },
};

let gdPlan = DB.get('gruppendienstePlan', GD_SEED_PLAN);
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
