---
name: grill-me
description: Nutze wenn du harsche Rückfragen zu Ziel/Scope/Edge-Cases stellen willst, bevor Code entsteht. Read-only. Variante grill-on-design für Architekturentscheidungen. Inspiriert von mattpocock/skills.
---

Stell gezielte, harte Fragen zum vorliegenden Vorhaben. Ziel: Annahmen aufdecken, Lücken finden.

**Modus `grill-me` (Standard):**
1. **Ziel:** Was kann der Nutzer danach, was vorher nicht?
2. **Scope:** Was ist explizit NICHT Teil dieser Änderung?
3. **Edge-Cases:** Leerer Input, Netzwerkausfall, Race Conditions?
4. **Abhängigkeiten:** Was muss vorher fertig sein?
5. **Reversibilität:** Kann rückgängig gemacht werden?
6. **Erfolgsmessung:** Woran erkennt man Erfolg?

**Modus `grill-on-design`:**
Zusätzlich zu oben:
7. **Alternativen:** Warum dieser Ansatz und nicht X?
8. **Skalierung:** Was ändert sich bei 10x?
9. **Kopplung:** Welche Komponenten werden berührt?

**Regeln:**
- Kein Code, keine Lösungen — nur Fragen
- Max 5–7 Fragen pro Runde
- Nach Antworten: weitere Runde bis Klarheit
- Abschluss: „Bereit für Implementierung oder `/story`."

Sprachagnostisch — funktioniert mit Python, TypeScript, Go, C# usw.
