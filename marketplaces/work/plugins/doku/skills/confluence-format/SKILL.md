---
name: confluence-format
description: Nutze wenn Confluence-Storage-Format idiomatisch erzeugt/formatiert werden soll — mit echten Makro-Beispielen.
---

Confluence speichert Seiten im **Storage Format** (XHTML mit `ac:`/`ri:`-Makros),
nicht in Markdown. Dieser Skill liefert die korrekten Bausteine; er **schreibt nie
selbst** — er speist `confluence-draft` (Publish nur mit [CONFIRM]).

## Markdown → Confluence-Konventionen

| Markdown | Confluence-Storage |
|---|---|
| `# H1 … ###### H6` | `<h1>…<h6>` (Seitentitel ist separat, **nicht** als H1 wiederholen) |
| ` ```lang …``` ` | `code`-Makro mit `<ac:parameter ac:name="language">` |
| Blockquote / Hinweis | Panel-Makro (`info`/`note`/`warning`/`tip`) statt `>` |
| Tabelle | echte `<table><tbody><tr><th>/<td>` |
| `- [ ]` Task | `<ac:task-list>` mit `<ac:task>` |
| Bild | `<ac:image><ri:attachment ri:filename="…"/></ac:image>` (Datei zuerst als Attachment hochladen) |

## Panels (Hinweise hervorheben)

```xml
<ac:structured-macro ac:name="info">
  <ac:rich-text-body><p>Kurzer Hinweis für Leser.</p></ac:rich-text-body>
</ac:structured-macro>
```
`ac:name` ∈ `info` (blau) · `note` (grau) · `tip`/`success` (grün) · `warning` (rot).

## Code-Block (Sprache immer angeben)

```xml
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">csharp</ac:parameter>
  <ac:parameter ac:name="title">Program.cs</ac:parameter>
  <ac:plain-text-body><![CDATA[
public static void Main() => Console.WriteLine("Hi");
  ]]></ac:plain-text-body>
</ac:structured-macro>
```

## Inhaltsverzeichnis, Expand, Status

```xml
<ac:structured-macro ac:name="toc"/>

<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">Details ausklappen</ac:parameter>
  <ac:rich-text-body><p>…</p></ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="status">
  <ac:parameter ac:name="colour">Green</ac:parameter>
  <ac:parameter ac:name="title">ACCEPTED</ac:parameter>
</ac:structured-macro>
```
Status-Farben: `Grey` (Proposed) · `Green` (Accepted) · `Red` (Deprecated) · `Yellow` (In Review).

## Visualisierungs-Möglichkeiten in Confluence

- **Status-Lozenges** — Zustände inline (siehe oben), ideal für ADR-/Ticket-Status.
- **Panels** — Aufmerksamkeit lenken ohne Fließtext zu sprengen.
- **Tabellen + `table-layout`** — Vergleiche, Entscheidungsmatrizen.
- **`expand`** — lange Logs/Details einklappen, Seite scanbar halten.
- **Diagramme** — Mermaid-/Draw.io-Makro **oder** Bild als Attachment (`diagram-embed`).
- **Page-Tree / `children`-Makro** — Navigation in Doku-Spaces.

## Best Practices

1. Seitentitel nie als H1 im Body wiederholen; mit `<h2>` gliedern.
2. Jeder Code-Block mit `language`-Parameter — sonst kein Highlighting.
3. Lange/optionale Inhalte in `expand`; oben `toc` für Scanbarkeit.
4. Hinweise als Panel, nicht als fett markierter Absatz.
5. Bilder/Diagramme immer erst als Attachment, dann `ri:attachment` referenzieren.
6. Konsistente Status-Lozenges für alle Entscheidungs-/Review-Zustände.

→ Ausgabe geht an `confluence-draft`; Publish ausschließlich mit **[CONFIRM]** und innerhalb `${env:CONFLUENCE_SPACES}`.
