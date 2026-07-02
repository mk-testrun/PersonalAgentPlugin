---
name: marketplace-validate
description: >-
  Nutze um die Marketplace-Struktur gegen die Copilot-CLI-Spec zu prüfen: führt tools/validate-plugins.mjs aus
  (tiered: error/warning/hint), optional scoped (--skill/--plugin) oder --changed-only. 0 Fehler = grün;
  --strict macht Warnungen zu Fehlern (CI).
---

Führt `node tools/validate-plugins.mjs <marketplace-path>` aus.
Fehler werden direkt angezeigt. 0 Fehler = grün.
