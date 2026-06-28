# /view <datei-oder-inhalt>

Zeige ein Artefakt an — rich (VS Code Webview) oder Fallback (inline + klickbarer Link).

Ruft `render-artifact` auf, der automatisch den passenden `artifact-viewer`-Tool wählt.

**Beispiele:**
- `/view diagram.mmd` — Mermaid-Diagram
- `/view bericht.pdf` — PDF (iframe oder Link)
- `/view https://example.com` — QR-Code generieren
- `/view bild.png` — Bild anzeigen
- `/view modell.glb` — 3D-Modell
