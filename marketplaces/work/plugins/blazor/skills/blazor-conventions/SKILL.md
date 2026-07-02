---
name: blazor-conventions
description: >-
  Nutze proaktiv beim Schreiben oder Reviewen von Blazor-Komponenten und Code-Behind: prüft explizite
  @rendermode-Deklaration, IStateContainer statt geteiltem Component-State, Dispose bei Subscriptions und
  saubere Parameter-Konventionen. Reines Regel-/Wissens-Skill — meldet Verstöße mit konkreter Korrektur,
  schreibt nicht selbst.
---

## Regeln

1. **Render-Mode:** explizit deklarieren (`@rendermode InteractiveServer`)
2. **State-Management:** `IStateContainer` injizieren, kein Component-State für shared state
3. **CancellationToken:** bei allen async-Methoden mit HttpClient/DB durchreichen
4. **Forms:** `EditForm` + `FluentValidation` — nie nackte `<form>`-Tags
5. **CSS-Isolation:** `*.razor.css` statt globaler Styles
6. **Strings:** keine hartkodierten DE-Strings — `IStringLocalizer<T>` + resx
7. **Accessibility:** `role`, `aria-label`, `tabindex` für interaktive Elemente
