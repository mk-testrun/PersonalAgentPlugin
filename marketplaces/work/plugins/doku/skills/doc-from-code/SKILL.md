---
name: doc-from-code
description: >-
  Nutze um aus XML-Doc-Comments und öffentlicher .NET-API eine Confluence-Dokumentation zu generieren:
  sharplens (Roslyn) enumeriert public Typen/Member + Signaturen, liest <summary>/<param>/<returns>, und
  erzeugt einen Storage-Format-Draft (Namespaces als h2, Member als Tabelle). Publish via confluence-draft,
  [CONFIRM].
---

## Schritte

1. Public API aus Solution via sharplens extrahieren
2. XML-Doc-Comments lesen
3. Confluence-Storage-Format-Draft erzeugen
4. confluence-draft für Publish verwenden — [CONFIRM]
