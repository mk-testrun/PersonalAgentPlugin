---
name: blazor-component-scaffold
description: >-
  Nutze wenn eine neue Blazor-Komponente erstellt werden soll: erzeugt Razor-Markup (mit @rendermode),
  Code-Behind als partial class, bUnit-Test und scoped CSS als einen konsistenten Satz. Folgt
  blazor-conventions (Render-Mode explizit, IStateContainer statt Component-State). Output: vier
  zusammengehörige Dateien im Komponenten-Ordner.
---

## Erzeugt

- `ComponentName.razor` (Markup + `@rendermode`)
- `ComponentName.razor.cs` (Code-Behind, partial class)
- `ComponentName.razor.css` (CSS-Isolation)
- `ComponentNameTest.cs` (bUnit-Test-Skeleton)
- Resx-Einträge für alle UI-Strings
- **[CONFIRM]** vor dem Schreiben
