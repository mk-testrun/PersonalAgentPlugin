# ADR-0007 — Validierungs-Ebenen (error / warning / hint)

## Status
Accepted · 2026-07-02 · Ersetzt: — · Ersetzt durch: —

## Kontext
Der Validator (`tools/validate-plugins.mjs`) behandelte anfangs jedes nicht-Copilot-CLI-Frontmatter-Feld
und jeden VS-Code-Tool-Namen als **harten Fehler**. Das war zu streng: Skills und Agents in diesem Repo
sollen portabel bleiben — ein `applyTo` (VS Code Instructions) oder ein `editFiles` (VS-Code-Chat-Tool)
ist in Copilot CLI zwar wirkungslos, aber nicht „kaputt". Hartes Blocken zwang Autoren, sinnvolle
IDE-Kompatibilität zu opfern, nur damit der Validator grün wird.

Gleichzeitig ist **GitHub Copilot CLI unsere First-Party-Zielumgebung**. Ein Feld, das nur in einem
anderen KI-Produkt (Claude, ChatGPT, Gemini) wirkt, ist ein echtes Risiko (der Autor glaubt, es tue
etwas) — anders als ein Feld einer Schwester-IDE, die denselben Marketplace mitliest.

## Optionen
- **A — Boolean (alt):** gültig/ungültig, alles Ungültige = Fehler. Einfach, aber blockt IDE-Portabilität
  und unterscheidet nicht zwischen „harmlos woanders gültig" und „nirgends gültig".
- **B — Nur Warnungen:** nichts blockt außer JSON-Syntax. Zu lasch — echte Ladefehler (fehlendes
  Pflichtfeld, kaputtes Hook-Schema) würden durchrutschen.
- **C — Drei Ebenen mit Umgebungs-Taxonomie:** error (CLI lädt nicht) · warning (nur Fremd-KI oder
  nirgends) · hint (Schwester-IDE VS Code/Visual Studio). Jede Meldung nennt die Zielumgebung.

## Entscheidung
**Option C.** Findings sind dreistufig; die Zuordnung liegt datengetrieben in
`tools/lib/field-taxonomy.mjs` (Skill-/Command-/Agent-Frontmatter + Agent-Tool-Klassifikation).

- **error** → Copilot CLI kann es nicht laden: fehlendes Pflichtfeld, kaputtes `hooks.json`-Schema,
  referenzierte Datei fehlt, ungültiges JSON. Exit ≠ 0.
- **warning** → wirkt nur in einem anderen KI-Produkt (Claude/ChatGPT/Gemini) **oder** in gar keiner
  bekannten Umgebung. Exit 0 — außer `--strict` (CI) macht Warnungen zu Fehlern.
- **hint** → wirkt in einer Schwester-IDE (VS Code / Visual Studio), nicht in der CLI. Rein informativ,
  mit `--no-hints` unterdrückbar.

Jede Meldung nennt die **exakte** Zielumgebung (`ENV_LABELS`). Wenn ein Feld nur in VS Code, aber nicht
in Visual Studio wirkt, nennt die Meldung nur VS Code. Bei Unsicherheit wird konservativ eingestuft
(lieber eine Umgebung zu wenig behaupten als eine falsche).

## Konsequenzen
- **Positiv:** Autoren dürfen IDE-kompatible Felder setzen, ohne dass der Validator blockt; die Meldung
  erklärt genau, wo das Feld wirkt. `--strict` hält CI trotzdem hart.
- **Positiv:** Die Taxonomie ist an *einer* Stelle pflegbar; neue Umgebungen/Felder = ein Eintrag.
- **Kosten:** Die Taxonomie muss gegen die offiziellen Docs der Umgebungen gepflegt werden; veraltet sie,
  werden Meldungen ungenau. Gegenmittel: Quelle + Stand im Modul-Header dokumentiert.
- **Kosten:** „warning ≠ Fehler" heißt, ein echtes Fremd-Feld rutscht ohne `--strict` durch. Deshalb ist
  `--strict` die empfohlene CI-Einstellung.

## Offene Fragen
- Sollte `--strict` der Default in der Pre-Push-/CI-Pipeline werden? (Aktuell opt-in.)
- Wenn Copilot CLI künftig `tools`/`mcp-servers` im Skill-Frontmatter unterstützt (#3095), wandern diese
  von `warning` nach `ok` — die Taxonomie muss dann aktualisiert werden.
