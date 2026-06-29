---
name: diagram-embed
description: Nutze um ein im experimental-Plugin gerendertes Diagramm als Confluence-Attachment hochzuladen und auf der Zielseite einzubetten (Publish via [CONFIRM]).
---

## Scope

Bringt ein fertiges Diagramm (aus `experimental/mermaid-diagram`, `architecture-diagram`, `er-diagram`)
auf eine Confluence-Seite. Erzeugt das Diagramm nicht selbst; Formatierung → `confluence-format`.

## Schritte

1. **Quelle** — gerendertes Diagramm (PNG/SVG) bzw. dessen Quelle aus dem experimental-Plugin holen.
2. **Attachment** — Datei als Anhang der Zielseite hochladen (innerhalb `${env:CONFLUENCE_SPACES}`).
3. **Einbetten** — auf der Seite referenzieren:
   ```xml
   <ac:image><ri:attachment ri:filename="architecture.svg"/></ac:image>
   ```
4. **Publish** — über `confluence-draft` mit **[CONFIRM]**.

## Hinweise

- Erst Attachment, dann Referenz (sonst broken image). Keine externen Bild-URLs.
- Mermaid/Draw.io-Makro nur nutzen, wenn die App im Space installiert ist; sonst Attachment-Weg.

## Output

Eingebettetes Diagramm-Attachment auf der Zielseite; Publish nur mit [CONFIRM].
