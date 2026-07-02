# ADR-0008 — Skill-Maturity-Score

## Status
Accepted · 2026-07-02 · Ersetzt: — · Ersetzt durch: —

## Kontext
Der `skill-uplift-tracker.md` war ein **manuell** gepflegtes Dokument über den Reifegrad der ~148 Skills.
Manuell gepflegte Statustabellen veralten stumm: niemand aktualisiert sie zuverlässig nach jeder Änderung,
und dann bildet die Doku nicht mehr die Realität ab. Gleichzeitig wollen wir *messbar* machen, welche
Skills schon Flaggschiff-Qualität haben (Paket mit reference/examples/scripts/evals) und welche noch dünn
sind — ohne 148 Skills von Hand durchzusehen.

## Optionen
- **A — Nur manueller Tracker (alt):** flexibel, aber veraltet und subjektiv.
- **B — Nur Auto-Score, Tracker löschen:** immer aktuell, aber verliert die *Absicht* (Wellenplan,
  bewusste Anti-Ziele wie „diese Konventions-Skills bleiben absichtlich 2★").
- **C — Beides nebeneinander:** Auto-Score misst den Ist-Stand; der manuelle Tracker hält die Absicht.
  Der Abgleich beider ist der eigentliche Wert.

## Entscheidung
**Option C.** `tools/lib/maturity.mjs` berechnet pro Skill 0–5 ★ über **6 gewichtete Achsen** (Summe 100):

| Achse | Gewicht | Misst |
|---|---:|---|
| description | 20 | Länge (200–1024), Trigger-Phrase, konkrete Tool/MCP-Nennung |
| reference | 15 | `reference.md` vorhanden + ≥2 Überschriften |
| examples | 15 | `examples.md` vorhanden + ≥1 Code-Block |
| navigation | 15 | SKILL.md verlinkt reference/examples/templates + Standard-Sektionen |
| evals | 20 | `cases.json` vorhanden, ≥3 Cases, ≥1 Case mit Fixture |
| scripts | 15 | `scripts/*.mjs` + Shebang + `node --check` clean |

Sterne-Schwellen: ≥90 → 5★, ≥75 → 4★, ≥55 → 3★, ≥35 → 2★, ≥15 → 1★, sonst 0★.

Der Score ist **reines Reporting**: kein Error/Warning, kein Exit-Code-Impact. Ausgabe über
`--maturity` (Konsolen-Histogramm) und `--maturity-md <pfad>` (generiert `docs/skill-maturity.md`,
Kopf-Marker „DO NOT EDIT"). Der `skill-uplift-tracker.md` bleibt manuell und verweist auf die
Auto-Datei.

**Bewusst flach:** ein reiner Wissens-Skill ohne Skript erreicht max. ~4★; 5★ ist Paketen mit lauffähiger
Determinismus (scripts + evals) vorbehalten. Absichtlich niedrige Scores werden **nicht** im Score
annotiert, sondern im Tracker als Anti-Ziel notiert.

## Konsequenzen
- **Positiv:** Der Ist-Stand ist jederzeit regenerierbar und objektiv; die Lücke zwischen Absicht
  (Tracker) und Realität (Maturity) wird sichtbar und priorisierbar (Welle 2).
- **Positiv:** Neue Autoren sehen sofort, was ihrem Skill zu mehr Sternen fehlt (`missing`-Spalte).
- **Kosten / Risiko:** **Gewichts-Drift** — wenn wir die Achsen-Gewichte später verschieben, sind alte
  und neue Scores nicht vergleichbar. Deshalb: Gewichte sind hier festgeschrieben und werden nur mit
  einem Nachfolge-ADR geändert.
- **Kosten:** Heuristiken (z. B. „Trigger-Phrase" per Regex) sind grob; ein exzellenter Skill kann an
  einer Formulierung Punkte verlieren. Das ist akzeptabel für ein Selbst-Mess-Werkzeug, kein
  Qualitäts-Urteil.

## Offene Fragen
- Soll der Maturity-Score in CI eine Mindest-Schwelle für *neue* Skills erzwingen (z. B. „neue Skills
  müssen ≥3★")? Aktuell rein informativ.
- Achsen-Gewichte: sind 20/15/15/15/20/15 langfristig richtig, oder soll `evals` stärker zählen, sobald
  ein Behaviour-Runner existiert?
