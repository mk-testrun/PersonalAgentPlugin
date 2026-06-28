---
name: loop
description: Nutze für einen kontrollierten Agent-Loop — iterativ an einem Ziel arbeiten bis Erfolgskriterium erfüllt, mit hartem Iterationslimit und State zwischen den Runden. Nur auf expliziten /loop-Trigger.
---

Ein Agent-Loop führt **dasselbe Vorgehen wiederholt** aus, bis ein klar
definiertes Ziel erreicht ist — statt einer einzelnen Antwort. Disziplin ist
alles: ohne Erfolgskriterium und Hard-Limit wird daraus eine teure Endlosschleife.

## Pflicht-Setup (vor Iteration 1)

1. **Ziel** — eine Aufgabe, in einem Satz.
2. **Erfolgskriterium** — objektiv & prüfbar (z.B. „Tests grün", „Build + Lint sauber", „0 high-Findings").
3. **Hard-Limit** — `max_iterations` (Default **5**, hart). Erreicht → **stop**, kein Override.
4. **Loop-ID + State-Datei** — `state/loop/<id>.json` (Ziel, Kriterium, Limit, Zähler, Verlauf).

## Iterations-Protokoll (je Runde)

| Phase | Tätigkeit |
|---|---|
| **Plan** | Kleinste sinnvolle nächste Änderung benennen (eine Sache). |
| **Aktion** | Genau diese Änderung umsetzen (warn-Modus: ausführen, Risiken benennen). |
| **Verifikation** | Erfolgskriterium messen (Tests/Build/Review). Ergebnis ist Fakt. |
| **Entscheidung** | Kriterium erfüllt → **stop (Erfolg)**. Sonst Erkenntnis in State, Zähler+1, weiter. |

## Stop-Conditions (jede beendet den Loop)

- ✅ **Erfolg** — Kriterium erfüllt.
- 🛑 **Limit** — `max_iterations` erreicht → Stillstand-Bericht.
- ❌ **Fehler/Blockade** — nicht selbst behebbar (z.B. fehlende Credentials).
- 🔁 **Kein Fortschritt** — zwei Runden ohne messbare Verbesserung → stop.
- ⏹️ **Abbruch** — Nutzer bricht ab.

## Abschlussbericht (immer)

Grund des Stopps · Stand vs. Kriterium · Iterationen verbraucht · nächste Schritte bei Nichterfolg.

## Regeln

- Nur auf expliziten `/loop`-Trigger — **nie** automatisch.
- Vorhandene Skills/Agenten **nutzen statt neu bauen** (reviewer-Skills zur Verifikation).
- Niemals das Hard-Limit überschreiten oder das Erfolgskriterium nachträglich aufweichen.
