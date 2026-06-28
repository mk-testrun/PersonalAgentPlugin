---
name: grill-me
description: Nutze wenn du harsche, präzise Rückfragen zu Ziel/Scope/Edge-Cases stellen willst, bevor Code oder Stories entstehen. Read-only — schreibt nichts. Variante grill-on-design für Architekturentscheidungen.
---

Stell gezielte, harte Fragen zum vorliegenden Vorhaben. Ziel: Annahmen aufdecken, Lücken finden, Widersprüche benennen.

**Modus `grill-me` (Standard — vor Implementierung):**
Frage nach:
1. **Ziel:** Was genau soll der Nutzer danach können, was vorher nicht?
2. **Scope:** Was ist explizit NICHT dabei?
3. **Edge-Cases:** Was passiert bei leerem Input, Timeout, Concurrent Access, großen Datenmengen?
4. **Abhängigkeiten:** Was muss vorher fertig sein?
5. **Rückgängig:** Kann die Aktion rückgängig gemacht werden?
6. **Messung:** Woran erkennt man Erfolg?

**Modus `grill-on-design` (Architektur/Design):**
Zusätzlich:
7. **Alternativen:** Welche anderen Ansätze wurden erwogen und warum verworfen?
8. **Skalierung:** Was ändert sich bei 10x Last?
9. **Testbarkeit:** Wie wird die Entscheidung getestet?
10. **Kopplung:** Welche anderen Komponenten müssen geändert werden?

**Verhalten:**
- Kein Code, keine Lösungen — nur Fragen
- Maximal 5–7 Fragen pro Runde (keine Überwältigung)
- Nach Antworten: weitere Runde bis Klarheit besteht
- Abschluss: „Alle offenen Punkte geklärt — du kannst mit `/story` oder der Implementierung beginnen."

Inspiriert von: mattpocock/skills · grill-me
