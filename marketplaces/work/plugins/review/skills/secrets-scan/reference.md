# secrets-scan — Referenz

## §1 Warum betterleaks (nicht gitleaks)

`betterleaks` ist der gitleaks-Nachfolger (gleicher Autor). Wir nutzen ausschließlich betterleaks und
seinen **neuen expressions-basierten** Ansatz — nicht die alte gitleaks-Allowlist/Regex-Methode:

- **`filter`/`prefilter` (Expr):** schneiden False Positives, **bevor** du sie siehst (Entropie,
  Platzhalter, Pfade). Kein manuelles Allowlisting mehr.
- **`validate` (Expr + HTTP):** bestätigt, ob ein Fund **live** ist (echter Request gegen die API). Der
  Wert bleibt trotzdem redigiert.

Config-Vorlage: `templates/betterleaks.toml` → als `.betterleaks.toml` in den Repo-Root.

## §2 Zwei Scan-Flächen

| Kommando | deckt ab |
|---|---|
| `betterleaks dir . --config .betterleaks.toml --redact …` | **Working Tree** (aktuelle Dateien) |
| `betterleaks git . --config .betterleaks.toml --redact …` | **History** (alle Commits) |

Beides nötig: ein aus dem Working Tree gelöschtes Secret lebt in der History weiter. Beide Reports gehen
in `scripts/betterleaks-to-findings.mjs` (nimmt mehrere Dateien).

## §3 Verifizierte betterleaks-Flags (Quelle: cmd/root.go)

`--config/-c` · `--report-format/-f` (json) · `--report-path/-r` · `--redact` (bloß = 100 %) ·
`--no-banner` · `--log-opts` (git) · `--git-workers`. Keine erfundenen Flags.

## §4 findings[]-Mapping (RuleID → SECR-*)

`scripts/betterleaks-to-findings.mjs` bildet die betterleaks-RuleID deterministisch ab:

| RuleID enthält | ruleId | Beispiele |
|---|---|---|
| aws/azure/gcp/cloud | `SECR-CLOUD` | AKIA…, Azure-Keys |
| private-key/rsa/pem | `SECR-PRIVKEY` | `-----BEGIN … PRIVATE KEY-----` |
| token/pat/oauth/github/slack/bearer | `SECR-TOKEN` | ghp_…, xoxb-… |
| conn/database/password/pwd | `SECR-DBCONN` | Conn-String mit Passwort |
| (Rest) | `SECR-SECRET` | generisch |

Alle **critical**. Live-validierte Funde tragen `[LIVE — validated active]`.

## §5 Redaktions-Garantie

Das Skript emittiert **nie** `l.Secret`/`l.Match` — nur RuleID, Description, Datei, Zeile, `[REDACTED]`
und (optional) den Validierungs-Status. Damit landet kein Klartext-Secret in findings[]/Reports/Logs.
`--redact` sorgt zusätzlich dafür, dass schon der betterleaks-Report keine Werte enthält.

## §6 Nach einem echten Fund

1. **Rotieren** (Secret sofort ungültig machen — Entfernen allein reicht nicht).
2. **Aus der History tilgen** (`git filter-repo`/BFG) — sonst bleibt es in alten Commits abrufbar.
3. `[LIVE]`-Funde zuerst.

## §7 Abgrenzung

- Konzeptuelles Secret-Handling (KeyVault, `${secret:…}`) → `security-review`.
- Pre-Push-Layer (lokal, schnell) → `general/secrets-prepush-hook`.
- CI-Gate → kingfisher (pipeline-conventions).
