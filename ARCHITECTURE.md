# ARCHITECTURE.md — mkrueer-copilot Monorepo (Lebende Referenz)

> Diese Datei ist die kanonische Architektur-Spezifikation.
> Vollständige Spec: siehe [PLAN.md](PLAN.md) und [docs/](docs/) für ADRs und Konzepte.

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
│   ├── password-gen/         # Kryptografischer Passwort-Generator
│   ├── alarm-mcp/            # Alarm/Timer (Home)
│   ├── artifact-viewer/      # Universal-Renderer (rich/fallback, §3.5)
│   ├── supertonic/           # On-device TTS (wraps `supertonic serve`)
│   └── dotnet-mcpserver-starter/  # .NET-Template
├── marketplaces/
│   ├── work/                 # 10 Plugins
│   └── home/                 # 9 Plugins
├── tools/
│   ├── validate-plugins.mjs
│   └── relocate-manifests.mjs
└── docs/                     # ADRs, Konzepte, findings-Schema
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
| tester | editFiles+runCommands; Playwright nur localhost (Work) |
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
| password-gen | TypeScript | Kryptografischer Passwort-Generator |
| alarm-mcp | TypeScript | Alarme/Timer (Home) |
| artifact-viewer | TypeScript | Universal-Renderer (rich + fallback, §3.5) |
| supertonic | Node ESM | On-device TTS via `supertonic serve` (OpenAI-kompatibel, kein API-Key) |
| dotnet-mcpserver-starter | .NET 8 | Template für eigene .NET-MCPs |

### §3.5 artifact-viewer

Universal-Renderer: **Rich** (MCP-UI-Resource im VS Code Webview) + **garantierter Fallback** (inline Text + `file://`-Link).

Tools: `render_markdown`, `render_html`, `render_mermaid`, `render_diagram`, `render_qr`, `render_image`, `render_pdf`, `render_docx`, `render_3d`, `play_audio`, `play_video`.

ENV: `VIEWER_RICH=auto|on|off` · Artefakte → `${VIEWER_OUT:-.copilot/state/artifacts}`.
Deps: `qrcode`, `mammoth`, `marked`. Keine externen Netzaufrufe durch den Server.
Wiring: Work `experimental` + Home `visual` → `{"command":"artifact-viewer","env":{"VIEWER_RICH":"auto"}}`.

---

## 4. Work-Marketplace (10 Plugins)

Stack: Azure DevOps, Blazor/.NET, sharplens (Roslyn), EF-Core, xUnit, Playwright (localhost)
Sicherheit: Tool-Guardian **block**, Git-Guardrails **block**, PII über anonymizer-proxy, CDN-Allowlist

**Addendum v2-Erweiterungen:**
- `general`: +story-author, +grill-me, +tdd-loop, +triage Skills; +/story /grill /tdd /triage Commands; Git-Guardrails; labels.json
- `meta`: +agent-author, +command-author, +mcp-author, +mcp-app-author, +marketplace-author; +/new-agent /new-command /new-mcp /new-mcp-app /new-marketplace
- `experimental`: +render-artifact Skill; +/view Command; artifact-viewer in .mcp.json

## 5. Home-Marketplace (9 Plugins)

Stack: GitHub, Python/C#/Go/TypeScript, Excalidraw, Cloud-Bild-Gen, Home Assistant
Sicherheit: Tool-Guardian **warn**, Git-Guardrails **warn** (force-push main/master bleibt **block**), secret-scan **block**, Playwright darf Internet

**Addendum v2-Erweiterungen:**
- `general`: +story-author, +grill-me, +tdd-loop; +/story /grill /tdd Commands; Git-Guardrails; labels.json
- `meta`: identisch zu Work-meta (5 neue Skills + 5 neue Commands)
- `visual`: +render-artifact Skill; +/view Command; artifact-viewer in .mcp.json

---

## §7 Format-Härtungs-Ergebnisse

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
