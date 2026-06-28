---
name: secrets-scan
description: Nutze um das Repo repo-weit auf harte Secrets zu scannen (gitleaks/kingfisher) — inkl. History.
---

## Scope

Konkrete Secret-Funde im Repo (Arbeitsbaum **und** Git-History). Konzeptionelle
Secrets-Härtung (KeyVault-Nutzung etc.) → security-review.

## Vorgehen

1. `gitleaks detect --redact` über Arbeitsbaum und History.
2. Treffer verifizieren (kein False-Positive), **niemals den Klartext** in Findings schreiben (redacted).

## Checkliste — Secret-Muster

1. **SECR-CLOUD** — Cloud-Keys: AWS `AKIA…`, Azure-Connection-Strings, GCP-Service-Account-JSON. *(critical)*
2. **SECR-TOKEN** — PATs/OAuth/API-Tokens (`ghp_…`, ADO-PAT, Slack `xox…`). *(critical)*
3. **SECR-DBCONN** — Connection-Strings mit eingebettetem Passwort. *(critical)*
4. **SECR-PRIVKEY** — Private Keys (`-----BEGIN … PRIVATE KEY-----`), `.pfx`/`.pem` im Repo. *(critical)*
5. **SECR-PWD** — Hartkodierte Passwörter/`password=…` außerhalb von Beispielen. *(high)*
6. **SECR-HISTORY** — Secret nur noch in History → rotieren **und** History-Purge planen (Entfernen reicht nicht). *(critical)*
7. **SECR-EXAMPLE** — In `.env.example`/Doku nur Platzhalter, kein echtes Secret. *(medium)*

## Output

findings[] nach `docs/findings-schema.md`, `area: security`, ruleId aus `SECR-*`, Wert **redacted**. Jeder Fund → **[GATE]** (critical).
