# workflow-router — Worked Example

## Ein feature-Lauf, Schritt für Schritt

### 1. init → Dry-run-Plan + State

```bash
node scripts/run-state.mjs init --workflow feature --title "Login MFA"
```
```
Workflow: feature — Issue → Branch → Implementierung → Tests → Review → PR
Run-ID: 20260702-055917
State: .copilot/state/artifacts/orchestrator-feature-20260702-055917.json

Dry-run-Plan:
  1. Issue/Anforderung read-only auflösen → general [CONFIRM]
  2. Idempotenz-Check + Branch feature/AB-<id>-<slug> → general [CONFIRM]
  3. Implementierung → blazor [CONFIRM]
  4. Unit-Tests + Coverage-Gate → testing
  5. E2E (localhost, opt-in) → testing [GATE]
  6. Diff-gescopter Review (OWASP/WCAG/SQL/…) → review [GATE]
  7. PR öffnen + Work-Item verlinken → general [CONFIRM]
  8. Doku/ADR (optional) → doku [CONFIRM]
```
Diesen Plan dem Nutzer zeigen, **bevor** Schritt 1 läuft.

### 2. resume → nächster Schritt

```bash
node scripts/run-state.mjs resume "<state-file>"
```
```
Nächster Schritt 1/8: Issue/Anforderung read-only auflösen
Delegieren an: general
[CONFIRM] — vor Ausführung Ja/Nein einholen.
```
→ Nutzer bestätigt, `general` löst das Issue auf, dann:
```bash
node scripts/run-state.mjs advance "<state-file>" --status done
```

### 3. Ein [GATE] schlägt an (Schritt 6, Review)

`review` liefert eine `critical` SQL-Injection. **Nicht** `advance`en — der Schritt bleibt `pending`:
```
▶ 6. Diff-gescopter Review (…) → review [GATE]
```
Der Orchestrator meldet den Befund + Haltepunkt. Erst nach Behebung (via `blazor`) wird der Review
erneut ausgeführt und dann `advance`t.

### 4. Wiederaufnahme nach Absturz

Terminal weg? Kein Problem — der State kennt den Fortschritt:
```bash
node scripts/run-state.mjs resume "<state-file>"   # springt zum ersten pending-Schritt
```
Erledigte Schritte (1–5) werden nicht wiederholt.

## Was der Agent NICHT tut

- Keine Schritte erfinden/umsortieren — die Reihenfolge kommt aus `run-state.mjs`.
- Keinen Produktionscode selbst schreiben — er delegiert an `blazor`/`testing`/`review`/`general`.
- Kein `advance` über ein offenes [GATE] hinweg.
