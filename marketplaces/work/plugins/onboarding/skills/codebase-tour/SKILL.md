---
name: codebase-tour
description: Nutze für eine geführte Tour durch Architektur, Patterns und Hauptflows einer Codebasis.
---

## Schritte

1. Composition-Root finden (Program.cs / Startup.cs / main.ts)
2. DI-Registrierungen → Schichten ableiten
3. Datenschicht: DbContext, Repositories, Migrations
4. Kernflows: 2–3 wichtigste User-Journeys tracen (von HTTP-Request bis DB)
5. Wichtigste Patterns: CQRS, MediatR, AutoMapper etc.
6. Draft nach `docs/onboarding/tour.md` — **[CONFIRM]** vor Write
