---
name: pipeline-review
description: Nutze für Azure-Pipelines-YAML-Review — Approval-Gates, Pinning, Least-Privilege, Secret-Handling.
applyTo: ["**/azure-pipelines*.yml", "**/.azure/**/*.yml", "**/*.pipeline.yml"]
---

## Scope

CI/CD-Sicherheit & Best Practices in Azure-Pipelines-YAML. App-Security → security-review.

## Checkliste

1. **PIPE-SECRET** — Secrets nur aus Variable-Groups/KeyVault, nie inline; nicht in Logs echobar; `isSecret`/`secret`-Markierung. *(critical)*
2. **PIPE-PIN** — Tasks/Container/Templates auf feste Version/Digest gepinnt, kein `@latest`/Floating-Tag. *(high)*
3. **PIPE-APPROVAL** — Deployments in geschützte Environments mit Approval-Gate; kein Auto-Deploy nach Prod ohne Freigabe. *(high)*
4. **PIPE-PRIV** — Service-Connections least-privilege; kein org-weiter Vollzugriff; Pipeline nicht unnötig privilegiert. *(high)*
5. **PIPE-TRIGGER** — `pr`/`trigger`-Scopes bewusst; kein Secret-Zugriff in PR-Builds von Forks. *(high)*
6. **PIPE-SHELL** — Keine ungeprüfte Variable in Shell-Skripten (Injection); Quoting korrekt. *(high)*
7. **PIPE-ARTIFACT** — Artefakte/Caches ohne Secrets; signierte/verifizierte Inputs. *(medium)*
8. **PIPE-GATE** — Build/Test/Review-Gates vorhanden; rote Stage blockt Deployment. *(medium)*

## Output

findings[] nach `docs/findings-schema.md`, `area: pipeline`, ruleId aus `PIPE-*`. Bei `critical`/`high`: **[GATE]**.
