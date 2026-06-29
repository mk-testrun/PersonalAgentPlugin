# Skill- & Plugin-Authoring-Guide (verbindlicher Qualitätsstandard)

> Dieser Guide ist die **Definition von „fertig"** für jeden Skill, jedes Plugin, jeden Agenten in
> diesem Repo. Er ist abgeglichen mit der echten **GitHub-Copilot-CLI-Plugin-Spec**
> (`github/awesome-copilot`) und den **Anthropic Agent-Skills Best Practices**
> (platform.claude.com/.../agent-skills/best-practices). Wenn eine Datei diesen Standard nicht erfüllt,
> ist sie **nicht fertig** — auch wenn der Validator grün ist.

## 0. Die Qualitäts-Vereinbarung (Kurzfassung)

1. Skills sind **substanzielle, konkrete Pakete** — keine 5-Zeilen-Checklisten.
2. **Reichhaltige `description`** (was + wie + **wann**, mit Trigger-Begriffen) — das ist die Discovery-Schicht.
3. **Tiefe gehört in `references/`** (Progressive Disclosure), **eine Ebene tief** verlinkt.
4. **Lauffähige `scripts/`** für deterministische Schritte — ausführen statt improvisieren — **wo es echten Wert hat**.
5. **Zeig, erklär nicht nur**: konkrete Worked Examples / Templates.
6. **Stopp und vertiefe**, sobald eine Datei nur eine Checkliste ist. Tiefe vor Breite.

---

## 1. Plattform-Spec (GitHub Copilot CLI) — verbindliche Struktur

### 1.1 Plugin-Manifest — kanonischer Ort & Schema

**Ort:** `plugins/<plugin>/.github/plugin/plugin.json` (nicht im Plugin-Root!).

```json
{
  "name": "security-best-practices",
  "description": "Was das Plugin bündelt — ein präziser Satz.",
  "version": "1.0.0",
  "author": { "name": "mkrueer" },
  "repository": "https://github.com/mk-testrun/PersonalAgentPlugin",
  "license": "MIT",
  "keywords": ["…"],
  "agents":  ["./agents/<name>.agent.md"],
  "commands":["./commands/<name>.md"],
  "skills":  ["./skills/<name>/"],
  "hooks":   "./hooks.json",
  "mcp":     "./.mcp.json"
}
```

- `author` ist ein **Objekt** (`{ "name", "email"? }`), **kein String**.
- `repository` ist Pflicht.
- Referenzen sind **relative Pfade** (`./skills/<name>/` zeigt auf das Skill-**Verzeichnis**).

### 1.2 Marketplace-Manifest

**Ort:** `marketplaces/<mp>/.github/plugin/marketplace.json`. Listet Plugins mit `name`, `source`
(`plugins/<name>`), `description`, `version`, `keywords`. Copilot liest je `source` das Plugin-Manifest
unter `<source>/.github/plugin/plugin.json`.

### 1.3 Agenten (`.agent.md`)

Markdown mit YAML-Frontmatter: `name`, `description`, `tools` (Array), optional `mcp`, `model: gpt-5`.
Body: Mission · Zuständige Skills (Delegation) · Tool-/Write-Scope · Verboten.

### 1.4 Hooks / MCP / Commands

`hooks.json` (Event→Script), `.mcp.json` (`mcpServers`), `commands/<name>.md` (Frontmatter `description` + Prompt).

---

## 2. Skill-Paket — der Aufbau

```
skills/<name>/
├── SKILL.md          # Pflicht: Nav-Hub mit echtem Inhalt, < 500 Zeilen
├── references/       # Tiefe, progressiv geladen (bei echter Domänen-Tiefe)
│   ├── <thema>.md    #   z.B. vuln-categories.md, report-format.md
│   └── …
├── examples.md       # konkrete Input/Output-Paare (wo Qualität vom Beispiel abhängt)
├── templates/        # Ausgabe-Vorlagen (wo es ein festes Format gibt)
└── scripts/          # lauffähige Utility-Skripte (wo deterministisch)
```

**Nicht jeder Skill braucht alles.** Pflicht ist eine **substanzielle, konkrete SKILL.md**.
`references/`/`scripts/`/`templates/`/`examples.md` kommen dazu, **wenn sie echten Wert haben** —
nie als Ritual-Boilerplate.

### 2.1 SKILL.md-Frontmatter (harte Regeln)

```yaml
---
name: <kebab-case, ≤64 Zeichen, nur a-z0-9-, keine Reserved-Words 'anthropic'/'claude', gerund bevorzugt>
description: >-
  <3. PERSON. Was der Skill tut + WIE + WANN (Trigger-Phrasen/Schlüsselbegriffe).
   ≤1024 Zeichen. Das ist die Discovery-Schicht — sei spezifisch.>
applyTo: ["**/*.x"]   # optional, für proaktive Aktivierung
mcp_tools: ["Server:tool"]  # optional, voll qualifiziert
---
```

**Gut:** „Scans a codebase for security vulnerabilities by tracing data flows … Use when asked to
check for SQL injection, XSS, exposed secrets, insecure dependencies, or 'is my code secure?'."
**Schlecht:** „Nutze wenn Sicherheit zu prüfen." (vage, kein Trigger, kein Wie)

### 2.2 SKILL.md-Body (Mindeststruktur)

```markdown
# <Titel>

<1–2 Sätze Zweck.>

## When to Use This Skill
- konkrete Trigger / Anfragen-Phrasen / Slash-Command

## How It Works   (oder ## Approach)
1. … nummerierte Methodik (das fachliche Vorgehen, nicht generisch)

## Workflow        (bei mehrstufigen Aufgaben)
### Step 1 — …     ggf. „Read references/<x>.md to load …"
### Step 2 — …     ggf. „Run scripts/<x>.mjs …"

## Output
<was zurückkommt; Format/Pfad; bei Reviews findings[] + [GATE]>
```

### 2.3 Degrees of Freedom (bewusst wählen)

- **Low** (fragil/destruktiv): exaktes Skript vorgeben — „Run exactly `scripts/migrate.mjs --verify`".
- **Medium**: parametrisiertes Template/Pseudocode.
- **High** (viele valide Wege): Heuristik + Prinzipien, dem Modell Spielraum lassen.

### 2.4 Feedback-Loops & verifizierbare Zwischen-Outputs

Für kritische/Batch-Aufgaben: **Plan → Validate → Execute**. Plan als Datei, per Skript prüfen,
dann ausführen, dann verifizieren (validate→fix→repeat). Validator-Meldungen **spezifisch** machen.

### 2.5 Scripts — „solve, don't punt"

Skripte behandeln Fehler explizit (kein nacktes `open().read()`), keine „voodoo constants" (jeder Wert
begründet), **forward-slashes**, Abhängigkeiten benannt. „Run `scripts/x`" (ausführen) vs.
„See `scripts/x` for the algorithm" (als Referenz) klar kennzeichnen.

---

## 3. Referenz-Niveaus (an echten Vorbildern kalibriert)

| Niveau | Vorbild | Wann |
|---|---|---|
| **Solide** | awesome-copilot `ef-core` (≈60 Zeilen konkreter, gegliederter Best-Practice-Bullets, klares Ziel) | Single-Domain, kein tiefer Referenzbedarf |
| **Flaggschiff** | awesome-copilot `security-review` (reiche Description · When-to-Use · Step-Workflow → `references/{vuln-categories,report-format,secret-patterns,…}.md`) | Komplex, mehrstufig, echte Domänen-Tiefe |

**Untergrenze für JEDEN Skill in diesem Repo:** mindestens „Solide" — konkret, spezifisch, gegliedert,
handlungsleitend. Generische 5-Zeilen-Stubs sind verboten.

---

## 4. Reviews & MCP-Konventionen (repo-spezifisch)

- Review-Skills: nummerierte Checkliste mit **ruleId-Stamm + Severity**; Output `findings[]` nach
  `docs/findings-schema.md`; **[GATE]** bei critical/high.
- MCP-Tools immer **voll qualifiziert**: `Server:tool`.
- **Keine** Verweise auf den jeweils anderen Marketplace (jede Welt ist self-contained).

---

## 5. Evaluation (Anthropic-Best-Practice)

Für Flaggschiff-/kritische Skills: **Evals zuerst**. `evals/cases.json` mit ≥3 Szenarien:

```json
[{ "skill": "<name>",
   "query": "Realistische Nutzeranfrage",
   "files": ["fixtures/…"],
   "expected_behavior": ["beobachtbares Kriterium 1", "Kriterium 2", "Kriterium 3"] }]
```

Runner: `tools/run-evals.mjs`. Iterieren, indem man beobachtet, **wie** der Agent navigiert
(unerwartete Pfade, verpasste Referenzen, ignorierte Dateien) — nicht nach Annahmen.

---

## 6. Definition of Done (Checkliste — alles muss zutreffen)

### Struktur & Spec
- [ ] Plugin-Manifest unter `.github/plugin/plugin.json`, `author` als Objekt, `repository` gesetzt
- [ ] Skill ist ein **Verzeichnis** mit `SKILL.md`; Referenzen **eine Ebene tief**
- [ ] `validate-plugins.mjs` (spec-true) grün

### Inhalt
- [ ] `description` in **3. Person**, mit **was + wie + wann** + Trigger-Begriffen (≤1024)
- [ ] SKILL.md substanziell & konkret (≥ „Solide"-Niveau), gegliedert, handlungsleitend, < 500 Zeilen
- [ ] `references/` bei echter Tiefe (mit ToC > 100 Zeilen); `examples.md`/`templates/`/`scripts/` wo wertvoll
- [ ] Degrees of Freedom passend; Feedback-Loop bei kritischen Aufgaben
- [ ] Konsistente Terminologie; keine zeitkritischen Infos; forward-slashes; keine Cross-Marketplace-Verweise

### Scripts/Evals (falls vorhanden)
- [ ] Skripte „solve, don't punt", begründete Konstanten, dokumentiert, getestet
- [ ] ≥3 Evals bei Flaggschiff-/kritischen Skills, über `run-evals.mjs` lauffähig

> **Merksatz:** Wenn die Datei nur sagt *was* zu tun ist, aber nicht *wie* (mit konkreten Schritten,
> Patterns, Beispielen, ggf. Skripten) — dann ist sie noch nicht fertig.
