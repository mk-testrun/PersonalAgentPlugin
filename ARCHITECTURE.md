# ARCHITECTURE.md — mkrueer-copilot Monorepo (Lebende Referenz)

> Diese Datei ist die kanonische Architektur-Spezifikation.
> ADRs und Konzepte: siehe [docs/](docs/). Historische Planung: git log.

---

## 0. Zielbild

Zwei GitHub-Copilot-CLI-Marketplaces (Work + Home) mit fünf geteilten Custom-MCP-Servern.

**Zwei-Welten-Prinzip:** Work und Home teilen **keine** Skills, Agenten, Commands oder Konfiguration.
Das **einzige** Geteilte sind die Custom-MCP-Server unter `mcp-servers/`.

---

## 1. Struktur

```
mkrueer-copilot/
├── mcp-servers/              # Geteilte Custom-MCPs (npm-Workspaces)
│   ├── anonymizer-proxy/     # PII-Proxy für Work/ADO
│   ├── password-gen/         # Passwort/Passphrase/GUID/ULID/Zeit/Hash-Generator
│   ├── alarm-mcp/            # Alarm/Timer (Home)
│   ├── artifact-viewer/      # Universal-Renderer (rich/fallback, §3.5)
│   └── supertonic/           # On-device TTS (wraps `supertonic serve`)
├── marketplaces/
│   ├── work/                 # 9 Plugins
│   └── home/                 # 8 Plugins
├── tools/
│   ├── validate-plugins.mjs  # tiered validation + scoped runs + maturity
│   ├── validate-findings.mjs · run-evals.mjs
│   └── lib/                  # field-taxonomy.mjs, maturity.mjs
└── docs/                     # ADRs, Konzepte, findings-Schema, Authoring-Guide, skill-maturity
```

---

## 2. Globale Konventionen

### 2.1 Command vs. Skill vs. Agent

- **Skill** = `skills/<name>/SKILL.md`, Frontmatter `name` + `description` ("Nutze wenn …")
- **Command** = `commands/<name>.md`, entweder Workflow oder dünner Skill-Wrapper
- **Agent** = `agents/<name>.agent.md` mit `name`, `description`, `tools`, `model`
- **Verboten:** Doppel-Indirektion (Command → Skill → Skill)

### 2.2 Write-Scope je Agent

| Agent | Write-Scope |
|---|---|
| reviewer | read-only außer `.copilot/state/reports/` |
| orchestrator | keine Direkt-Writes ohne [CONFIRM] |
| devops/devops-home | Write mit [CONFIRM] |
| documenter | nur Drafts; publish mit [CONFIRM] |
| onboarder | read-mostly; Confluence read-only |
| tester | edit+execute; Playwright nur localhost (Work) |
| blazor | normaler Dev-Write; [CONFIRM] destruktiv |
| visualizer/morning | Output nur nach `state/artifacts/` |

### 2.4 MCP-Pfad-Konvention

Custom-MCPs referenzieren via **Binärname** (nicht relativer Pfad):
```json
"command": "anonymizer-proxy"
```

### 2.5 Secret-Handling

- Secrets nur via `${secret:NAME}` (OS-Keychain)
- Env-Vars via `${env:NAME}`
- Nie in Dateien, Prompts oder Git

### 2.7 Render-Pattern (Visual-Skills)

Jeder Visual-Skill implementiert **selbst**:
- **Rich:** HTML als MCP-UI-Resource (VS Code Webview, progressive enhancement)
- **Fallback:** Mermaid/ASCII + `state/artifacts/`-Pfad

### 2.8 Workflow-Querschnitt

1. Dry-run-Vorschau vor Schritt 1
2. Run-Log nach `state/artifacts/run-<workflow>-<ts>.md`
3. Idempotenz-Check vor Branch-Anlage
4. **[CONFIRM]** = Stopp + Ja/Nein · **[GATE]** = harter Stopp bei critical/high

### 2.9 Hook-Events

Events: `sessionStart`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `sessionEnd`

`preToolUse` gibt JSON aus: `{"permissionDecision":"allow"|"deny","permissionDecisionReason":"…"}`

- **Work:** secret-scan block + tool-guardian block + git-guardrails block
- **Home:** secret-scan block + force-push main/master block + tool-guardian **warn** + git-guardrails **warn**

### 2.10 Git-Guardrails

Adaptiert von `mattpocock/skills · git-guardrails-claude-code` (ADR 0004).
Policy: `policy/git-guardrails.json` im jeweiligen `general`-Plugin.

Gesperrte Operationen: `git push --force/-f`, `git reset --hard`, `git clean -fd[x]`, `git branch -D`, `git checkout/switch -f`, `git update-ref -d`, `git reflog delete`, `git filter-branch/filter-repo`, `git rebase` auf shared branches.

| Modus | Guardrail-Treffer | Ausnahme |
|---|---|---|
| Work | `deny` | `--force-with-lease` erlaubt |
| Home | `allow` + Warnung | force-push auf main/master → `deny` |

---

## 3. Custom-MCP-Server (5 Server)

| Server | Typ | Zweck |
|---|---|---|
| anonymizer-proxy | Node ESM | PII-Proxy für ADO (Work) |
| password-gen | TypeScript | Passwort/Passphrase + GUID (v4/v7) + ULID + Zeit + Hash |
| alarm-mcp | TypeScript | Alarme/Timer (Home) |
| artifact-viewer | TypeScript | Universal-Renderer (rich + fallback, §3.5) |
| supertonic | Node ESM | On-device TTS via `supertonic serve` (OpenAI-kompatibel, kein API-Key) |

> Das .NET-MCP-Template (`dotnet-starter`) liegt als Kopiervorlage in
> `work/meta/skills/mcp-author/templates/` — es ist ein Scaffold, kein laufender Server.

### §3.5 artifact-viewer

Universal-Renderer: **Rich** (MCP-UI-Resource im VS Code Webview) + **garantierter Fallback** (inline Text + `file://`-Link).

Tools: `render_markdown`, `render_html`, `render_mermaid`, `render_diagram`, `render_qr`, `render_image`, `render_pdf`, `render_docx`, `render_3d`, `play_audio`, `play_video`.

ENV: `VIEWER_RICH=auto|on|off` · Artefakte → `${VIEWER_OUT:-.copilot/state/artifacts}`.
Deps: `qrcode`, `mammoth`, `marked`. Keine externen Netzaufrufe durch den Server.
Wiring: Work `experimental` + Home `visual` → `{"command":"artifact-viewer","env":{"VIEWER_RICH":"auto"}}`.

---

## 4. Work-Marketplace (9 Plugins)

Plugins: `general`, `blazor`, `experimental`, `review`, `onboarding`, `meta`, `testing`, `doku`, `orchestration`.
Stack: Azure DevOps, Blazor/.NET, sharplens (Roslyn), EF-Core, xUnit, Playwright (localhost)
Sicherheit: Tool-Guardian **block**, Git-Guardrails **block**, PII über anonymizer-proxy, CDN-Allowlist

- `general`: story-author, grill-me, tdd-loop, triage; /story /grill /tdd /triage; Git-Guardrails; labels.json
- `meta`: agent-/command-/mcp-/mcp-app-/marketplace-author; dotnet-Starter-Template in `mcp-author/templates/`
- `experimental`: render-artifact + /view; **loop** (Agent-Loop-Protokoll, aus dem früheren loop-Plugin)
- `doku`: **product-functions** + /functions-sync (Confluence-Funktionskatalog aus ADO, extend-Merge)

## 5. Home-Marketplace (8 Plugins)

Plugins: `general`, `visual`, `reviewer`, `meta`, `lab`, `morning`, `orchestration`, `audio`.
Stack: GitHub, Python/C#/Go/TypeScript, Excalidraw, Cloud-Bild-Gen, Home Assistant
Sicherheit: Tool-Guardian **warn**, Git-Guardrails **warn** (force-push main/master bleibt **block**), secret-scan **block**, Playwright darf Internet

- `general`: story-author, grill-me, tdd-loop, **loop** (Agent-Loop-Protokoll); /story /grill /tdd /loop; Profile-System; Git-Guardrails
- `visual`: render-artifact + /view; artifact-viewer in .mcp.json
- `orchestration`: workflow-router (Router-Skill + kodierte Workflows + State, §9/ADR-0009)

> **loop** war früher ein eigenes Plugin in beiden Marketplaces; es wurde in `experimental` (Work) bzw.
> `general` (Home) integriert — kein Ein-Skill-Plugin mehr.

---

## §7 Format-Härtungs-Ergebnisse (historischer Snapshot, 2026-06)

| Punkt | Ergebnis |
|---|---|
| plugin.json Ort | Plugin-Root ✓ |
| marketplace.json Ort | `.github/plugin/` ✓ |
| sharplens-mcp | Paket existiert ✓ |
| @antv/mcp-server-chart | Paket existiert ✓ |
| excalidraw-mcp | offizielles Paket existiert ✓ |
| openai-images-mcp | NICHT gefunden → ersetzt durch `imagegen-mcp` |
| .mcp.json _note/_disabled | Entfernt (Notizen in README) |
| MCP-UI-Resources inline | Rich als progressive enhancement |

---

## §8 Validierung & Reifegrad

`tools/validate-plugins.mjs` prüft gegen die **echte Copilot-CLI-Spec** (First-Party):
Manifest-Struktur, SKILL.md-/Agent-/Command-Frontmatter, Agent-Tool-IDs, `.mcp.json`, und das reale
`hooks.json`-Schema (inkl. Existenz der via `{{plugin_data_dir}}` referenzierten Skripte).

- **Tiered Findings:** `error` (CLI lädt nicht) · `warning` (nur Fremd-KI-Produkt oder nirgends) ·
  `hint` (Schwester-IDE VS Code/Visual Studio). Taxonomie in `tools/lib/field-taxonomy.mjs`. `--strict`
  für CI. Siehe [ADR-0007](docs/adr/0007-validation-tiers.md).
- **Scoped Runs:** `--skill` / `--plugin` / `--agent` / `--command` / `--changed-only`.
- **Maturity:** `--maturity` (Histogramm) / `--maturity-md` generiert `docs/skill-maturity.md`
  (Ist-Stand, auto). Absicht/Wellenplan bleibt manuell in `docs/skill-uplift-tracker.md`. 6 gewichtete
  Achsen, siehe [ADR-0008](docs/adr/0008-maturity-score.md).
- **Evals:** `tools/run-evals.mjs` prüft die `evals/cases.json` strukturell (Token-frei).

MCP-Server-Konventionen: [ADR-0005](docs/adr/0005-mcp-server-conventions.md) ·
Skill-Paket-Layout: [ADR-0006](docs/adr/0006-skill-package-layout.md).

---

## §10 Copilot-CLI-Extensions (experimentell, Work, User-Scope)

Neben den beiden Marketplaces liegt unter `extensions/` ein **lokales Copilot-CLI-Extension-
System** (das `.github/extensions/`-System der CLI — **kein** MCP, **kein** Plugin, **keine**
GitHub-App-Extension). Vier einzeln aktivierbare Extensions in **C#/net10.0**, geteilte
Core-Library, ausschließlich User-Scope installiert (`~/.copilot/extensions/`).

| Extension | Zweck | Fail |
|---|---|---|
| `mkc-work-guardian` | Git-Guardrails (argv-Parser), Tool-Guardian, Secret-Scan, Branch-Lint · `/guardian` | closed |
| `mkc-work-sentinel` | Autopilot-Erkennung, Budgets, Checkpoints · `/autopilot` `/budget` `/checkpoint` | closed |
| `mkc-work-flow` | 7 Workflows, Local/Remote-Backends (ADO/Confluence REST), PII-Scrub, Meta (`/goal` `/loop` `/simplify` `/batch`) · `/mode` `/workflow` `/feature` … `/moin` `/commitmsg` | open |
| `mkc-work-recorder` | Telemetrie: Kosten je Session/Workflow, Modelle, Denies · `/flightlog` | open (Opt-in) |

- **Echte Extension, kein Overlay:** `extension.mjs` ist ein fester ~12-Zeilen-Stecker; die
  gesamte Logik liegt im .NET-Prozess. Protokoll Stecker↔.NET: **`mkc-bridge/1`** (NDJSON,
  [Spec](docs/extensions-bridge-protocol.md)).
- **Kopplung nur über State-Dateien** (`mode.json` stale⇒autonomous, `denials.jsonl`,
  `current-workflow.json`); jedes `preToolUse`-Deny gewinnt.
- **Autopilot „Härten + Budgets"**, Confirm-Deadline 60 s ⇒ Deny.
- **Kein ADO-/Confluence-MCP:** REST direkt aus C#, PII-Scrub vor jedem Call.
- Installation: `extensions/install/install.sh --mode link` · Validierung:
  `node tools/validate-extensions.mjs` · CI-Job `extensions` (setup-dotnet 10.0.x).

Architektur-Entscheidung: [ADR-0010](docs/adr/0010-copilot-cli-extensions.md) ·
Konzept: [Extensions_Konzept.md](docs/Extensions_Konzept.md) ·
Ausführungsplan: [Extensions_Ausfuehrungsplan.md](docs/Extensions_Ausfuehrungsplan.md).
