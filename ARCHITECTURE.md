# ARCHITECTURE.md — mkrueer-copilot Monorepo (Lebende Referenz)

> Diese Datei ist die kanonische Architektur-Spezifikation.
> ADRs und Konzepte: siehe [docs/](docs/). Historische Planung: git log.

---

## 0. Zielbild

Ein persönliches Agent-Monorepo: zwei GitHub-Copilot-CLI-Marketplaces (Work + Home),
fünf geteilte Custom-MCP-Server und eine geteilte Infrastruktur-Schicht
(Editor-Settings, Maschinen-Profile, Templates, Copilot-Harness, Bootstrap).

**Zwei-Welten-Prinzip (seit ADR-0010):** Work und Home teilen **keine fachlichen Inhalte**
(Skills, Agenten, Commands, Hooks, Policies). Geteilt ist ausschließlich **Infrastruktur**:
`mcp-servers/`, `editor/`, `profiles/`, `templates/`, `tools/` und die Repo-Harness unter `.github/`.

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
├── editor/                   # VS-Code-Baseline + Home/Work-Overlays (ADR-0010)
├── profiles/                 # Maschinen-Profile: Marketplace, Plugins, Editor, mcpExtras
├── templates/                # repo-starter (agent-ready Kopiervorlage)
├── tools/
│   ├── validate-plugins.mjs  # tiered validation + scoped runs + maturity
│   ├── bootstrap.mjs         # Maschinen-Setup: --profile home|work [--apply]
│   ├── validate-findings.mjs · run-evals.mjs
│   └── lib/                  # field-taxonomy.mjs, maturity.mjs
├── .github/                  # Copilot-Harness: copilot-instructions, instructions/,
│                             #   prompts/, copilot-setup-steps.yml, CI
└── docs/                     # ADRs, Konzepte, findings-Schema, Authoring-Guide,
                              #   skill-maturity, upstream-catalog
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

## §10 Geteilte Infrastruktur-Schicht (ADR-0010)

- **editor/** — `settings.shared.json` ⊕ `settings.{home,work}.json` (Overlay gewinnt) plus
  Extensions-Listen; `.editorconfig` im Root ist die formatierende Wahrheit je Projekt.
- **profiles/** — `profile.json` je Maschine: Marketplace(+Name), Plugin-Set, Editor-Overlays,
  globale `mcpExtras` (Server ohne Plugin-Bindung, z. B. `memory`). Abgrenzung zum
  Laufzeit-`profile-switch`-Skill: siehe `profiles/README.md`.
- **tools/bootstrap.mjs** — idempotentes Maschinen-Setup: merged verwaltete Editor-Keys in die
  VS-Code-User-Settings, merged `mcpExtras` in `~/.copilot/mcp-config.json`, druckt
  Extension-/Copilot-CLI-Kommandos. Dry-Run ist Default, `--apply` schreibt.
- **templates/repo-starter/** — agent-ready Vorlage für neue Repos (AGENTS.md,
  Copilot-Instructions, `.editorconfig`-Kopie [CI-synchronisiert], Starter-CI, `.mcp.json`).
- **.github/** — Harness des Monorepos selbst: `copilot-instructions.md`, pfadbezogene
  `instructions/*.instructions.md`, wiederverwendbare `prompts/*.prompt.md`
  (`/new-skill`, `/new-mcp-server`, `/repo-health`), `copilot-setup-steps.yml` (Coding Agent).
- **docs/upstream-catalog.md** — Inventar aller Upstream-Referenzen inkl. Pinning-Policy.
