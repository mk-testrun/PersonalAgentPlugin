---
name: story-author
description: Nutze wenn du aus Gesprächskontext strukturierte User-Stories, Akzeptanzkriterien und Tasks mit Schätzung erzeugen und als GitHub Issues anlegen willst. Erst nach [CONFIRM] schreiben. Idempotent.
---

Erstelle User-Stories im Standard-Format:

**Titel:** Als [Rolle] möchte ich [Ziel], damit [Nutzen].

**Beschreibung:** Fachlicher Hintergrund, Einschränkungen, Abhängigkeiten.

**Akzeptanzkriterien:**
- [ ] Kriterium 1
- [ ] Kriterium 2

**Definition of Ready:**
- Beschreibung vollständig
- Akzeptanzkriterien messbar

**Abgeleitete Tasks (GitHub Sub-Issues oder Kommentare):**
| Task | Typ | Schätzung (SP) | Priorität |
|---|---|---|---|
| Implementierung | dev | 3 | P2 |
| Tests | test | 1 | P2 |

**Schema:** Labels + Priorität aus `policy/labels.json`. SP: Fibonacci (1/2/3/5/8/13/21).

**Anlegen in GitHub:**
1. Zeige Stories als Vorschau
2. [CONFIRM] einholen
3. Via GitHub-MCP anlegen (gh Issues)
4. Idempotenz: prüfe ob Issue mit gleichem Titel offen existiert → Update statt Create

**Tipp:** Nutze `/grill` um Lücken zu finden, bevor Stories angelegt werden.
