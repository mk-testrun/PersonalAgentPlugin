---
name: loop
description: Nutze für einen kontrollierten Agent-Loop — iterativ an einem Ziel arbeiten bis Erfolgskriterium erfüllt, mit hartem Iterationslimit und State zwischen den Runden. Nur auf expliziten /loop-Trigger.
---

Ein Agent-Loop führt **dasselbe Vorgehen wiederholt** aus, bis ein klar
definiertes Ziel erreicht ist — statt einer einzelnen Antwort. Disziplin ist
alles: ohne Erfolgskriterium und Hard-Limit wird daraus eine teure Endlosschleife.

## Pflicht-Setup (vor Iteration 1)

1. **Ziel** — eine Aufgabe, in einem Satz.
2. **Erfolgskriterium** — objektiv & prüfbar (z.B. „`dotnet test` grün", „0 high-Findings",
   „Build + Lint sauber"). Kein vages „sieht gut aus".
3. **Hard-Limit** — `max_iterations` (Default **5**, hart). Wird es erreicht → **stop**, kein Override.
4. **Loop-ID + State-Datei** — `state/loop/<id>.json` anlegen (Ziel, Kriterium, Limit, Iterationszähler, Verlauf).

## Iterations-Protokoll (je Runde)

| Phase | Tätigkeit |
|---|---|
| **Plan** | Kleinste sinnvolle nächste Änderung benennen (eine Sache, kein Sammel-Refactor). |
| **Aktion** | Genau diese Änderung umsetzen. Im Work-Kontext: vor jeder mutierenden Aktion **[CONFIRM]**. |
| **Verifikation** | Erfolgskriterium messen (Tests/Build/Review ausführen). Ergebnis ist Fakt, keine Annahme. |
| **Entscheidung** | Kriterium erfüllt → **stop (Erfolg)**. Sonst: Erkenntnis in State schreiben, Zähler+1, nächste Runde. |

Nach jeder Runde State persistieren: was versucht, was gemessen, warum weiter.

## Stop-Conditions (jede beendet den Loop)

- ✅ **Erfolg** — Erfolgskriterium erfüllt.
- 🛑 **Limit** — `max_iterations` erreicht → Stillstand-Bericht, kein Weitermachen.
- ❌ **Fehler/Blockade** — nicht selbst behebbares Hindernis (fehlende Credentials, kaputte Umgebung).
- 🔁 **Kein Fortschritt** — zwei Runden ohne messbare Verbesserung am Kriterium → stop, nicht endlos variieren.
- ⏹️ **Abbruch** — Nutzer bricht ab.

## Abschlussbericht (immer)

Grund des Stopps · erreichter Stand vs. Kriterium · Iterationen verbraucht ·
nächste empfohlene Schritte bei Nichterfolg. State-Datei bleibt zur Nachverfolgung liegen.

## Regeln

- Nur auf expliziten `/loop`-Trigger — **nie** automatisch.
- Vorhandene Skills/Agenten **nutzen statt neu bauen** (z.B. testing/dotnet-test-run, review-Skills zur Verifikation).
- Niemals das Hard-Limit überschreiten. Niemals das Erfolgskriterium nachträglich aufweichen, um „fertig" zu erscheinen.
