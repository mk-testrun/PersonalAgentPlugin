---
name: marketplace-author
description: Nutze wenn du einen neuen GitHub Copilot CLI Marketplace anlegen willst — korrekte Struktur mit .github/plugin/marketplace.json, Plugins-Verzeichnis, CONVENTIONS.md, CONTRIBUTING.md.
---

Lege einen neuen Marketplace unter `marketplaces/<name>/` an:

**Pflichtstruktur:**
```
marketplaces/<name>/
├── .github/
│   └── plugin/
│       └── marketplace.json      # Pflicht: name, plugins[], metadata
├── plugins/
│   └── <first-plugin>/
│       ├── plugin.json           # name/description/version/author/license
│       └── ...
├── README.md
├── CONVENTIONS.md                     # Agenten-Übersicht + Konventionen §2.1/§2.2
└── CONTRIBUTING.md               # Validierungsanleitung
```

**`marketplace.json` Minimal-Template:**
```json
{
  "name": "<marketplace-name>",
  "plugins": [
    {
      "name": "<plugin-name>",
      "source": "./plugins/<plugin-name>",
      "description": "...",
      "version": "1.0.0",
      "keywords": []
    }
  ],
  "metadata": {
    "pluginRoot": "./plugins"
  }
}
```

**Eigenständigkeit:** Jeder Marketplace ist self-contained — kein Teilen von Skills/Agents/Commands zwischen Marketplaces.

**Abschluss-Checkliste:**
1. `node tools/validate-plugins.mjs marketplaces/<name>` → 0 Fehler
2. CONVENTIONS.md mit §2.1/§2.2 Konventionen
3. CONTRIBUTING.md mit Validierungsbefehl
