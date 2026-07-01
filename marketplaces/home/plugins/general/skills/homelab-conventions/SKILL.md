---
name: homelab-conventions
description: Nutze proaktiv bei Docker-Compose und Homelab-Konfigurationen.
---

## Regeln

1. **Images pinnen:** kein `:latest` — immer genaue Version oder Digest
2. **Healthchecks:** für jeden Service der davon abhängt
3. **Secrets via .env:** `.env` nicht committen (in .gitignore)
4. **Restart-Policy:** `restart: unless-stopped` für Produktions-Services
5. **Netzwerke:** eigene Networks statt Standard-Bridge für Isolation
