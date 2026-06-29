---
name: marketplace-onboarding
description: Nutze um diesen Marketplace zu erklären — Aufbau, Plugins, was installiert ist, wann was Sinn macht, und Plugins korrekt zu installieren/verifizieren.
---

## Scope

Track „Marketplace". Erklärt **diesen** Marketplace und macht den Nutzer handlungsfähig:
verstehen, auswählen, installieren, verifizieren. Rollen-adaptiv (`state/onboarding.json`).

## Schritte

1. **Überblick** — Was dieser Marketplace ist und wie er aufgebaut ist (Plugins = Bündel aus Skills/Commands/Agenten/MCP). Quelle: `marketplace.json` + README.
2. **Installationsstand** — `copilot plugin list` ausführen → zeigen, **welche Plugins installiert sind und welche nicht**.
3. **Was-wann** — Plugin→Use-Case-Matrix (siehe unten); erklären, was solo nützt und was im **Verbund** (z.B. orchestration ruft review/testing/doku).
4. **Bedarf klären** — anhand des Ziels des Nutzers die **benötigten** Plugins benennen (nicht alle empfehlen).
5. **Installieren** — fehlende Plugins via `copilot plugin install <name>` — **[CONFIRM] vor jeder Installation**.
6. **Verifizieren** — erneut `copilot plugin list`; prüfen, dass Skills/Commands des Plugins sichtbar sind; bei Fehlschlag diagnostizieren.

## Plugin → Use-Case (Work-Marketplace)

| Ziel | Plugin(s) | Solo/Verbund |
|---|---|---|
| ADO-Items/Commits/Git | general | solo |
| Neu einsteigen | onboarding | solo |
| Blazor/.NET/EF entwickeln | blazor | mit testing/review |
| Tests/Coverage/E2E | testing | mit blazor |
| Code/Sicherheit prüfen | review | im Verbund (Gate) |
| Workflows /feature /bugfix | orchestration | ruft review/testing/doku/loop |
| Confluence-Doku | doku | solo/mit review |
| Diagramme/Slides/ADR | experimental | solo |
| Skills/Plugins bauen | meta | solo |
| Iteratives Ziel | loop | ruft andere |

## Rollen-Adaptivität

- `nicht-programmierer`: erkläre Plugins über ihren **Nutzen** („review = automatischer Qualitäts-Check"), keine internen Begriffe.
- `programmierer`: knappe Matrix, Befehle direkt, Verbund-Flows nennen.

## Output

Klarer Installationsstand, passende Empfehlung, verifizierte Installation.
Installation **nur mit [CONFIRM]**; keine sonstigen Schreibaktionen außer Fortschritt in `state/onboarding.json`.
