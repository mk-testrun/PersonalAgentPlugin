---
name: ai-readiness
description: Nutze um den AI-Readiness-Score eines Projekts zu messen (0–100).
---

## Scope

Misst die **Marketplace-/Plugin-Reife** (wie gut ist dieses Repo als Copilot-Marketplace aufgesetzt).
Für die allgemeine **Code-Repo**-AI-Readiness eines Projekts → reviewer/ai-readiness (Home).

## Scoring-Dimensionen (Summe 0–100)

1. **AIR-AGENTS** — `AGENTS.md` vorhanden & aktuell (Agenten-Tabelle, Konventionen). *(20)*
2. **AIR-TRIGGER** — Skills mit klaren „Nutze wenn …"-Descriptions, kein leerer Stub. *(15)*
3. **AIR-APPLYTO** — `applyTo`-Skills für alle Haupt-Dateitypen. *(15)*
4. **AIR-MCP** — `.mcp.json` korrekt verdrahtet (`${env:}`/`${secret:}`, keine Klartext-Secrets). *(15)*
5. **AIR-HOOKS** — Hooks aktiv & ausführbar. *(15)*
6. **AIR-POLICY** — Policy-Dateien vorhanden & konsistent. *(10)*
7. **AIR-CI** — `validate-plugins` + MCP-Tests grün. *(10)*

## Output

Gesamt-Score 0–100 + Befunde je fehlender Dimension (ruleId `AIR-*`) + **Top-3 „Next Best Actions"**.
