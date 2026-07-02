# editor/ — Geteilte Editor-Settings (Home + Work)

Eine Baseline, zwei Overlays. Der Bootstrap merged **shared → profil** in die
VS-Code-User-Settings der Maschine; nur die hier definierten Keys werden verwaltet,
alle anderen User-Settings bleiben unangetastet.

```
editor/vscode/
├── settings.shared.json      # Baseline für beide Welten
├── settings.home.json        # Home-Overlay (gewinnt über shared)
├── settings.work.json        # Work-Overlay (gewinnt über shared)
├── extensions.shared.json    # Extensions für beide Welten
├── extensions.home.json      # Home-Extensions (Python/Go/Playwright/Excalidraw)
└── extensions.work.json      # Work-Extensions (.NET/Blazor/ADO/SQL)
```

## Anwenden

```bash
node tools/bootstrap.mjs --profile home          # Dry-Run: zeigt den Plan
node tools/bootstrap.mjs --profile home --apply  # schreibt Settings + druckt Extension-Installs
node tools/bootstrap.mjs --profile work --apply
```

- **Settings:** Deep-Merge in `settings.json` des VS-Code-User-Verzeichnisses
  (Windows `%APPDATA%/Code/User`, macOS `~/Library/Application Support/Code/User`,
  Linux `~/.config/Code/User`). Kommentar-Keys (`// _managed`) werden nicht geschrieben.
- **Extensions:** Der Bootstrap druckt `code --install-extension <id>`-Kommandos
  (shared + Profil) — bewusst kein Auto-Install.
- **Projekt-Ebene:** `.editorconfig` im Repo-Root ist die formatierende Wahrheit
  für jeden Editor; `templates/repo-starter/` bringt dieselbe Datei in neue Repos.

## Regeln

1. Neue geteilte Präferenz → `settings.shared.json`.
2. Weltspezifisch (Theme, Sprach-Stack, Härtung) → nur ins jeweilige Overlay.
3. Kein Key, der Secrets oder Maschinen-Pfade enthält — dafür sind lokale
   User-Settings da, die der Merge nie überschreibt.
