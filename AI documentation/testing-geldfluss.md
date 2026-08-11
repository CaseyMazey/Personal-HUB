# testing-geldfluss.md

Version: 1.0

---

# Zweck

`js/budget-analysis.js` (Geldfluss-Planer, Sub-Tab "Finanzierung" → Drag&Drop-Board) ist der bug-anfälligste Bereich des Budget-Moduls. Der Code selbst dokumentiert drei bereits behobene, aber subtile Fehler — dieser Testplan hält fest, was vor jeder künftigen Änderung an dieser Datei manuell geprüft werden sollte, damit dieselben Fehlerklassen nicht unbemerkt zurückkehren.

Kein automatisiertes Test-Setup existiert im Projekt (reines `file://`-Setup ohne Build-Step) — diese Checkliste ersetzt das, bis es anders ist.

---

# Kontext: bereits behobene Bug-Klassen

Diese drei Fehlerbilder sind in `budget-analysis.js` per Kommentar dokumentiert und sollten bei jeder Änderung erneut ausgeschlossen werden:

1. **Kapazität falsch gedeckelt** — eine Zuordnung wurde früher auf den monatlichen Gesamt-Freibetrag der Einnahme gedeckelt statt auf die Kapazität der konkret gezogenen Karte. Fix: `cardCapacity` statt Gesamt-Freibetrag.
2. **Doppelte/verlorene Zuordnungen beim Verschieben** — das Entfernen einer einzelnen Zuordnung löschte versehentlich auch andere, unabhängige Zuordnungen zur selben Einnahme. Fix: Entfernen läuft über die eindeutige ID des Zuordnungs-Eintrags, nicht mehr über "alle Einträge dieser Einnahme".
3. **Klick- und Drag-Handler kollidierten** — ein separater `click`-Listener und das Pointer-basierte Drag-System reagierten beide auf denselben Vorgang, wodurch Karten beim Klick verschwanden und erst nach Neuladen wieder auftauchten, oder Verschieben auf eine andere Einnahme nicht griff. Fix: ein einziges Pointer-System, das Bewegung unterhalb einer Schwelle als Klick behandelt.

---

# Manuelle Testchecklist

Vor jeder Änderung an `budget-analysis.js` (und danach erneut, zur Verifikation):

## Grundfunktion

- [ ] Geldfluss-Board öffnet ohne Konsolenfehler (Budget → Finanzierung)
- [ ] Alle wiederkehrenden Einnahmen erscheinen als Karten mit korrektem monatlichem Freibetrag
- [ ] Alle Verbraucher (Sparziele, Schulden, wiederkehrende/einmalige Ausgaben) erscheinen als Zielkarten

## Zuordnen per Drag & Drop

- [ ] Eine Einnahme auf einen Verbraucher ziehen → Zuordnung erscheint, Betrag korrekt
- [ ] Dieselbe Einnahme auf einen zweiten, unabhängigen Verbraucher ziehen → beide Zuordnungen bleiben bestehen (Test gegen Bug-Klasse 2)
- [ ] Eine Einnahme mit zu geringem Freibetrag auf eine Karte ziehen, deren Kapazität kleiner ist als der volle Freibetrag → nur der zur Karte passende Teilbetrag wird zugeordnet, der Rest bleibt unzugeordnet und wird NICHT automatisch woanders platziert (Test gegen Bug-Klasse 1)

## Zuordnen per Klick

- [ ] Kurzer Klick auf eine Einnahme-Karte (ohne nennenswerte Mausbewegung) löst die Klick-Zuweisung aus, nicht den Drag (Test gegen Bug-Klasse 3)
- [ ] Nach einem Klick verschwindet die Karte nicht dauerhaft — sie zeigt sofort den neuen Zustand, ohne dass ein Neuladen nötig ist

## Entfernen / Verschieben

- [ ] Eine einzelne Zuordnung entfernen → nur genau diese verschwindet, alle anderen Zuordnungen derselben Einnahme bleiben unangetastet (Test gegen Bug-Klasse 2)
- [ ] Eine bestehende Zuordnung auf einen anderen Verbraucher verschieben → alte Zuordnung weg, neue korrekt vorhanden, keine Dopplung
- [ ] Mehrfaches Verschieben derselben Karte hintereinander (5×) erzeugt keine doppelten oder verwaisten Funding-Einträge (im DevTools-LocalStorage `budgetGoals`/`budgetDebts`/`budgetRecurring`/`budgetOnetime` stichprobenartig auf doppelte `funding`-IDs prüfen)

## Konsistenz mit anderen Budget-Ansichten

- [ ] Nach Änderungen im Geldfluss-Board zeigen Sparziele (Budget-Übersicht), Schulden-Tab und der Checkbox-Finanzierungseditor in den jeweiligen Modals denselben Stand (dasselbe `funding`-Array, kein zweiter Datenpfad)
- [ ] Seite neu laden → alle Zuordnungen bleiben exakt wie vor dem Reload

---

# Wann dieser Testplan Pflicht ist

Immer bei Änderungen an:

- `js/budget-analysis.js` selbst
- dem gemeinsamen `funding`-Format oder dem Funding-Editor in `js/budget-financing.js`
- den Verbraucher-Datenmodellen (`budgetGoals`, `budgetDebts`, `budgetRecurring`, `budgetOnetime`), sofern sie das `funding`-Feld berühren
