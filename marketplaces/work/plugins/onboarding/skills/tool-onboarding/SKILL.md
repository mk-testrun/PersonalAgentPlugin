---
name: tool-onboarding
description: Nutze um das Host-Programm zu erklären (GitHub Copilot CLI / VS Code / Visual Studio) und wie man Copilot dort bedient — rollen-adaptiv.
---

## Scope

Track „Tool/Host". Setzt `host-detect` voraus (oder fragt selbst). Erklärt **das Programm** und
die Copilot-Bedienung darin — passend zu Rolle/Tiefe aus `state/onboarding.json`. Marketplace → marketplace-onboarding.

## Inhalte je Host

### GitHub Copilot CLI
- Was es ist: KI-Agent im Terminal. Start, Prompt-Eingabe, Sessions.
- Slash-Commands (`/<command>`), Agenten-Auswahl, MCP-Server, Plugins (`copilot plugin …`).
- [CONFIRM]/Approval-Flüsse, wie man Aktionen bestätigt/abbricht.

### VS Code (Copilot-Erweiterung)
- Chat-View vs Inline-Chat vs Agent-Mode; Slash-Commands; `#`-Kontext/`@`-Participants.
- Wo Plugins/MCP konfiguriert werden; Webview-Artefakte (Rich-Render).

### Visual Studio
- Copilot-Chat-Fenster, Inline-Vorschläge; Lösung/Projekt-Kontext.
- Unterschiede zu VS Code (Solution-zentriert, kein Webview-Rich wie VS Code).

## Schritte

1. Host aus `state/onboarding.json` lesen (sonst `host-detect`).
2. Den passenden Abschnitt **rollen-adaptiv** erklären (ELI5/Grob/Detailliert; Programmierer/Nicht-Programmierer).
3. 2–3 konkrete „probier das jetzt"-Beispiele anbieten, passend zum Host.
4. Fortschritt markieren (`tool` erledigt) und ins Initiator-Menü zurück.

## Output

Verständliche Host-Einführung + nächste Schritte. Keine Schreibaktionen außer Fortschritt in `state/onboarding.json`.
