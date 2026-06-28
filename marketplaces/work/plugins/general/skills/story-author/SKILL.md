---
name: story-author
description: Nutze wenn du aus Gesprächskontext strukturierte User-Stories, Akzeptanzkriterien und Tasks mit Schätzung (SP/Stunden) erzeugen und in ADO anlegen willst. Erst nach [CONFIRM] schreiben. Idempotent — aktualisiert bestehende statt Duplikate.
---

Nimm den aktuellen Gesprächskontext und extrahiere User-Stories im Format:

**Titel:** Als [Rolle] möchte ich [Ziel], damit [Nutzen].

**Beschreibung:** Fachlicher Hintergrund, Einschränkungen, Abhängigkeiten.

**Akzeptanzkriterien (DoD):**
- [ ] Kriterium 1
- [ ] Kriterium 2
- [ ] …

**Definition of Ready (DoR):**
- Beschreibung vollständig
- Akzeptanzkriterien messbar
- Abhängigkeiten bekannt

**Abgeleitete Tasks:**
| Task | Typ | Schätzung (SP) | Severity | Priorität |
|---|---|---|---|---|
| Implementierung | dev | 3 | medium | P2 |
| Unit-Tests | test | 1 | medium | P2 |

**Schema:** Severity + Priorität aus `policy/labels.json`. Story-Points: Fibonacci (1/2/3/5/8/13/21).

**Anlegen in ADO:**
1. Zeige Stories + Tasks als Vorschau
2. [CONFIRM] einholen
3. Erst dann via ADO-MCP anlegen
4. Idempotenz: vorher prüfen ob Story mit gleichem Titel existiert → Update statt Create

**Ergänzungen via `/grill`:** Nutze `grill-me` um Lücken in Akzeptanzkriterien zu finden, bevor Stories angelegt werden.
