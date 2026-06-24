---
name: dependency-vuln
description: Nutze wenn Verwundbare Abhängigkeiten zu prüfen (dotnet list package --vulnerable, npm audit).
---

Führe die dependency-vuln-Analyse durch.
Ergebnis als `findings[]` nach Schema aus `docs/findings-schema.md`.
Bei critical/high-Findings: **[GATE]**.
