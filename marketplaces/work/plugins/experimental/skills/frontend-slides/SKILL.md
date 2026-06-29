---
name: frontend-slides
description: Nutze um eine reveal.js-Präsentation aus einer Markdown-Outline zu erstellen.
---

## Zweck

Inhalte als navigierbare Präsentation (Slides statt Fließtext).

## Lib/CDN

`reveal.js` (CDN-Allowlist). `Reveal.initialize({ hash: true })`.

## Struktur-Schema

```html
<div class="reveal"><div class="slides">
  <section><h2>Titel</h2></section>
  <section><section>Vertikal 1</section><section>Vertikal 2</section></section>
</div></div>
```
`<section>` = horizontale Slide; verschachtelt = vertikale Unter-Slides.

## Aufbau

1. Outline gliedern: Titel → Kernaussagen → Detail → Abschluss.
2. Pro Slide eine Botschaft; Stichpunkte statt Absätze.
3. Code/Diagramme optional (highlight.js/mermaid).
4. reveal.js-Template + CDN-Script/Theme.

## Render-Pattern (§2.7)

- **Rich:** lauffähige Präsentation (Webview).
- **Fallback:** Slide-Outline als Markdown (`---`-getrennt) + Pfad zu `state/artifacts/`.

## Output

`state/artifacts/slides-<ts>.html`.
