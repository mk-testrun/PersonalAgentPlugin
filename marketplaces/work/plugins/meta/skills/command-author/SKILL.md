---
name: command-author
description: Nutze wenn du eine neue commands/*.md-Datei erstellen willst. Verhindert Doppel-Indirektion (§2.1): Command → Skill → Skill ist verboten.
---

Erzeuge eine korrekte `commands/<name>.md` nach §2.1-Konvention.

**Zwei erlaubte Command-Typen:**

**1. Workflow-Command** (mehrstufiger Ablauf):
```markdown
# /<command-name>

<Kurzbeschreibung was dieser Workflow tut>

## Schritte
1. Schritt 1 (Dry-run-Vorschau)
2. [CONFIRM] falls destruktiv
3. Schritt N
4. Run-Log → `state/artifacts/run-<name>-<ts>.md`
```

**2. Dünner Skill-Wrapper** (Shortcut auf genau einen Skill):
```markdown
# /<command-name>

<Ein-Satz-Beschreibung>

Ruft `<skill-name>` auf mit [Parameter].
```

**Verboten (§2.1):**
- Command → Skill A → Skill B (Doppel-Indirektion)
- Command ohne erkennbaren Zweck
- Duplizierung von bestehendem Command

**Validierung:** `plugin.json` eintragen + `marketplace-validate` ausführen.
