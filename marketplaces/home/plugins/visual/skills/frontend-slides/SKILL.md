---
name: frontend-slides
description: Nutze um eine reveal.js-Präsentation (HTML-Slides) zu erstellen.
---

## Zweck

Inhalte als navigierbare Präsentation (Slides statt langer Fließtext).

## Lib/CDN

`reveal.js` (CDN-Allowlist). `Reveal.initialize()`.

## Struktur-Schema

```html
<div class="reveal"><div class="slides">
  <section><h2>Titel</h2><p>Intro</p></section>
  <section>
    <section>Vertikal 1</section>
    <section>Vertikal 2</section>
  </section>
</div></div>
```
`<section>` = horizontale Slide; verschachtelte `<section>` = vertikale Unter-Slides.

## Aufbau

1. Storyline gliedern: Titel → Kernaussagen → Detail-Slides → Abschluss.
2. Pro Slide eine Botschaft; Stichpunkte statt Absätze.
3. Code/Diagramme einbetten (highlight.js / mermaid optional).
4. reveal.js-Template + CDN-Script/Theme; `Reveal.initialize({ hash: true })`.

## Render-Pattern (§2.7)

- **Rich:** lauffähige Präsentation (Webview).
- **Fallback:** Slide-Gliederung als Markdown (`---`-getrennt) + Pfad zum HTML.

## Output

`state/artifacts/slides-<ts>.html`.
