---
description: Startet einen kontrollierten Agent-Loop auf ein Ziel (/loop <ziel> [--max N] [--ziel "kriterium"]).
---
Nutze den loop-Skill.

1. Ziel, Erfolgskriterium und Hard-Limit (`--max`, Default 5) festlegen — bei Unklarheit nachfragen.
2. **Dry-run zuerst:** geplantes Vorgehen + Stop-Conditions zeigen, dann starten.
3. Pro Iteration: Plan → Aktion → Verifikation → Entscheidung. Risiken im warn-Modus benennen.
4. State in `state/loop/<id>.json` führen. Bei Erfolg / Limit / Stillstand: Abschlussbericht.

Nur auf expliziten Aufruf. Hard-Limit ist verbindlich.
