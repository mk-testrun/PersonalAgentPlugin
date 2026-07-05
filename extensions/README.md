# mkc Copilot-CLI-Extensions (⚠️ experimentell)

> **Status: experimentell.** Lokale GitHub-Copilot-CLI-Extensions (Work-Welt) in C#/net10.0.
> Konzept: [`docs/Extensions_Konzept.md`](../docs/Extensions_Konzept.md) ·
> Ausführungsplan: [`docs/Extensions_Ausfuehrungsplan.md`](../docs/Extensions_Ausfuehrungsplan.md) ·
> Getestete CLI-Version: siehe [`versions.json`](versions.json).

## Die vier Extensions

| Extension | Zweck | Fail-Modus |
|---|---|---|
| `mkc-work-guardian` | Deterministische Git-Guardrails, Secret-Scan, Tool-Policy | closed |
| `mkc-work-sentinel` | Autopilot-Erkennung, Budgets, Checkpoints | closed |
| `mkc-work-flow` | Workflows (feature/bugfix/…), Local/Remote-Backends, PII-Scrub | open |
| `mkc-work-recorder` | Telemetrie: Kosten je Session/Workflow, Modelle, Denies (Opt-in) | open |

## Installation (User-Scope, wirkt in allen Projekten)

```bash
# Linux/macOS — Link-Modus (Dev-Loop: dotnet publish + /extensions reload genügt)
./install/install.sh --mode link

# Windows (pwsh) — Copy-Modus empfohlen
./install/install.ps1 -Mode copy

# Recorder ist Opt-in:
./install/install.sh --mode link --with-recorder
```

Deinstallation: `./install/uninstall.sh` (State unter `.copilot/state/extensions/mkc/`
und `.copilot/planning/` bleibt erhalten). Pro Projekt abschaltbar via
`.copilot/mkc-extensions.json` → `{"disable":["mkc-work-flow"]}`.

## Dev-Loop

```bash
dotnet build extensions          # bauen
dotnet test  extensions          # Unit-Tests
node --test  extensions/shim-test/   # Bridge-Mock-Harness (echte Binaries, ohne CLI)
```

In der CLI: `/extensions list|info|enable|disable|reload`.

## Architektur (Kurzfassung)

`extension.mjs` (fester ~12-Zeilen-Stecker) → spawnt .NET-Head → NDJSON-Protokoll
**`mkc-bridge/1`** über stdio. Die gesamte Logik liegt in .NET; Kopplung zwischen den
vier Prozessen ausschließlich über State-Dateien. Details: `docs/extensions-bridge-protocol.md`.
