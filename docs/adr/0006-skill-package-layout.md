# ADR-0006 — Skill-Paket-Layout (Progressive Disclosure)

## Status
Accepted · 2026-07-02 · Ersetzt: — · Ersetzt durch: —

## Kontext
Anfangs waren Skills flache 5-Zeilen-`SKILL.md`. Das skaliert nicht: das Modell rät bei jedem Lauf neu,
es gibt keine gebündelten Beispiele/Skripte, und „fertig" ist nicht definiert. Anthropics Agent-Skills-
Best-Practices und die Copilot-CLI-Realität legen ein **Paket** mit Progressive Disclosure nahe: die
`SKILL.md` als schlanker Nav-Hub, Tiefe eine Ebene darunter. Wir brauchen einen verbindlichen Kanon,
gegen den der Maturity-Score (ADR-0008) misst.

## Optionen
- **A — Flache SKILL.md (Status quo ante):** minimal, aber dünn und nicht reproduzierbar.
- **B — Ein großes SKILL.md mit allem inline:** alles an einem Ort, aber bläht den Discovery-Kontext auf
  (das Modell lädt die ganze Tiefe, auch wenn es nur den Trigger braucht).
- **C — Verzeichnis-Paket mit Progressive Disclosure:** `SKILL.md`-Hub + optionale Ressourcen eine Ebene
  tief, nur bei Bedarf nachgeladen.

## Entscheidung
**Option C.** Kanonisches Layout:

```
skills/<gerund-name>/
├── SKILL.md         # Nav-Hub: Frontmatter (name+description) + Quick-Start + Verweise (1 Ebene tief)
├── reference.md     # Tiefe Details (ToC ab ~100 Zeilen)          — wenn es Tiefe gibt
├── examples.md      # konkrete Input/Output-Paare                  — „show, don't tell"
├── templates/       # Ausgabe-Vorlagen                            — wenn der Skill etwas rendert
├── scripts/         # lauffähige, dep-freie .mjs                  — für deterministische Schritte
└── evals/cases.json # ≥3 Szenarien mit expected_behavior          — Flaggschiffe
```

**Regeln:**
- Frontmatter: nur `name` (kebab, ≤64, keine Reserved-Words) + `description` (3. Person, „Nutze wenn…",
  Trigger + genutzte MCPs, ≤1024). Weitere Felder → ADR-0007 (Tiering).
- **Nicht jeder Skill braucht alles:** ein reiner Wissens-/Konventions-Skill hat legitimerweise keine
  `scripts/`. Der Maturity-Score bildet das ab (max ~4★ ohne Skript); bewusste Grenzen stehen im
  uplift-tracker als Anti-Ziel.
- **Determinismus zuerst:** wo ein Schritt deterministisch ist (Report→findings, Katalog-Merge), gehört
  er in ein `scripts/*.mjs`, nicht in improvisierten Modell-Output.
- Referenzen **eine Ebene tief** — keine tief verschachtelten `references/a/b/c.md`.

## Konsequenzen
- **Positiv:** schlanker Discovery-Kontext (nur SKILL.md + description), Tiefe on-demand; reproduzierbare
  deterministische Schritte; „fertig" ist messbar (ADR-0008).
- **Kosten:** mehr Dateien pro Skill; der Standard muss durchgesetzt werden (`skill-author` erzeugt
  Pakete, `validate-plugins.mjs --maturity` misst, Welle 2 hebt Bestehende an).

## Offene Fragen
- Soll CI für **neue** Skills eine Mindest-Maturity (z. B. ≥3★) erzwingen, oder bleibt es ein Ziel?
- Brauchen wir eine dritte Ebene für sehr große Skills, oder ist „eine Ebene tief" hart genug?
