# Audit 2026-07 — Plan + Datei-für-Datei-Funde

> Arbeitsdokument. Teil 1 = der bereits abgestimmte Härtungs-Plan (Blöcke A/B/C).
> Teil 2 = **neue Funde** aus dem vollständigen Datei-für-Datei-Audit — als Kandidaten,
> über die einzeln entschieden wird (aufnehmen / verwerfen / später).
> Konvention je Fund: **[Kritikalität] Datei — Problem → Vorschlag.**
> Kritikalität: 🔴 Fehler/falsche Annahme · 🟠 Konzept-Schwäche · 🟡 Verbesserung · ⚪ Kosmetik.

---

## Teil 1 — Abgestimmter Plan (Blöcke A/B/C)

### Block A — „Sofort" (Review-Punkte 1, 2, 3, 5)
- **A1** `git-guardrails.json` wirklich lesen (beide Guardians; Pfad relativ zum Skript;
  `allowExceptions: ["force-with-lease"]` in die Policy; Fallback auf eingebaute Minimal-Liste wenn
  Policy unlesbar; Tests; ADR-0004 ergänzen).
- **A2** `ci.yml` neu (Root-Scripts `validate:strict`/`evals`/`test:tools`/`test:servers`;
  Maturity-Drift-Step; toter dotnet-Starter-Pfad raus).
- **A3** Version-Drift marketplace.json↔plugin.json fixen (7 Plugins) + Validator-Warning + Test.
- **A4** ARCHITECTURE §2.9: 8 Hook-Events statt 5.

### Block B — „Danach" (Review-Punkte 6, 7, 8, 9)
- **B1** PII-Patterns + Checksum-Validatoren im Masker (`checksum: iban|luhn|steuerid`),
  neue Patterns (CreditCard/IPv4), PhoneDE eingrenzen, Testvektor-Suite `pii-patterns.test.mjs`;
  IPv6/Adressen bewusst NICHT (Anti-Ziel).
- **B2** Guardian-Token-Patterns (ghp_, github_pat_, AKIA, xox*, glpat-, sk-, PRIVATE KEY, JWT)
  in beide Guardians + Tests.
- **B3** Fail-closed bei nicht-leerem unparsebarem Hook-Input (Work + Home; leer → allow);
  Marker statt Leerstring in `extract()`; Risiko + Bypass dokumentieren.
- **B4** Hook-Tests komplettieren (audit-*, notify-with-sound via PATH-Shim, dotnet-vuln via
  PATH-Shim) + ps1-Syntax-Check in CI (pwsh).

### Block C — „Dann" (Review-Punkte 12, 13, 14, 19 + 18)
- **C1** dist-Drift-Check in CI (build + `git diff --exit-code mcp-servers/*/dist`); ADR-0005 nachtragen.
- **C2** Dogfooding `.githooks/pre-push` für dieses Repo (validate `--changed-only --strict` +
  test:tools + betterleaks falls installiert) + README-Setup.
- **C3** `--maturity-gaps` (Regressionen gegen committete skill-maturity.md + optionales
  `docs/skill-targets.json` Ist<Ziel).
- **C4 (P18)** workflow-router härten: `optional: true`-Steps, `list`/`prune`-Kommandos, atomares
  advance (tmp+rename), `--resume` in Commands dokumentiert, `run-state.test.mjs`.
- **C5** profile-switch: sessionStart-**Erinnerung** (`profile-remind.sh`), kein Auto-Switch bis
  realer CLI-Test (P11) die Semantik klärt; ADR-0003 präzisieren.

### Getroffene Design-Entscheidungen (Veto möglich)
1. A1: Policy unlesbar → eingebauter Minimal-Fallback (Guardrails verschwinden nie stillschweigend).
2. B3: fail-closed auch in Home (Secret-Scan ist dort block).
3. B1: IPv6/Straßenadressen bewusst ausgelassen (False-Positive-Hölle).
4. C5: nur Erinnerung statt Auto-Reaktivierung (unverifizierte CLI-Semantik).

### Verbleibende Review-Punkte außerhalb A/B/C (zur Erinnerung)
- **P11** (nur du): echte Installation testen — `copilot plugin marketplace add` + `/mcp show`;
  Relevanz: github/copilot-cli#2709 (Plugin-`.mcp.json` wird evtl. nicht gemerged).
- **P15** Behaviour-Runner · **P16** meta-Duplikation · **P17** experimental-Split ·
  **P20** Kür-Kandidaten der 1★-Skills — strategisch, einzeln zu beauftragen.

---

## Teil 2 — Neue Funde aus dem Datei-für-Datei-Audit (Kandidaten)

> Status: Audit läuft. Wellen: W1 Root+tools · W2 mcp-servers · W3 docs · W4 Marketplace-Shared ·
> W5 Work-Plugins · W6 Home-Plugins.

### W1 — Root + tools/ + .github/.copilot/.claude

- **🔴 W1-1 `.gitignore` + TS-Server: Ein frischer Clone hat KEINE lauffähigen MCP-Server.**
  `dist/` ist gitignored (Zeile 3) und **nirgends committet** (`git ls-files → 0`), die `bin`-Einträge
  von password-gen/alarm-mcp/artifact-viewer zeigen aber auf `./dist/index.js`. Kein Workspace hat ein
  `prepare`-Script → `npm install` baut nichts. Nach `git clone && npm install` sind **drei der fünf
  Server tot** (Binary → nicht existente Datei); das komplette `.mcp.json`-Wiring über Binärnamen bricht.
  **Zusätzlich falsche Annahme in ADR-0005** („committetes dist/") — Doku widerspricht Realität.
  → **Fix:** `"prepare": "tsc"` in den 3 TS-Workspaces (npm install baut automatisch); ADR-0005
  korrigieren. **Konsequenz für Plan C1:** dist-Drift-Check via `git diff` ist hinfällig (nichts
  committet) — C1 wird zu „CI: build via prepare + Tests laufen gegen frischen Build".

- **🔴 W1-2 `package-lock.json` ist gitignored + untracked, aber CI ruft `npm ci`.**
  `npm ci` erfordert ein Lockfile → schlägt in CI immer fehl; der Fallback `|| npm install` kaschiert
  das und macht CI-Builds **nicht reproduzierbar** (jeder Lauf löst Versionen neu auf).
  → **Fix:** Lockfile committen (Standard, auch bei Workspaces), `.gitignore`-Zeile 37 entfernen,
  in ci.yml `npm ci` ohne Fallback. (Fließt in A2 ein.)

- **🟡 W1-3 `.gitignore` deckt `.copilot/state/` nur punktuell.** `profile.json`,
  `orchestrator-*.json`, `onboarding.json` (und künftige State-Dateien) sind NICHT ignoriert →
  Rausch im git-Status + Risiko, Session-State versehentlich zu committen.
  → Pauschal `.copilot/state/` ignorieren statt Einzeldateien.

- **🟡 W1-4 `api-contract-review`-Description behauptet `area: design/api`** — `api` ist kein
  gültiger Enum-Wert (findings-schema: 12 Areas ohne `api`); der Body nutzt korrekt `design`.
  → Description auf `area: design` korrigieren (oder bewusst `api` ins Schema aufnehmen — Entscheidung).

- **🟡 W1-5 `validate-findings.mjs` vs. `findings-schema.md`:** Der Validator behandelt
  `file`/`line`/`suggestion` als optional, die Schema-Doku markiert nichts als optional.
  → In findings-schema.md Pflicht vs. optional explizit kennzeichnen (Doku-Fix).

- **🟡 W1-6 `package.json` `test:tools` listet Test-Dateien einzeln** — neue Tests (z. B. das in C4
  geplante `run-state.test.mjs`) werden stillschweigend NICHT mitlaufen, wenn man das Hinzufügen
  vergisst. → Glob nutzen (`node --test tools/test/*.test.mjs`) oder CI-Check „alle *.test.mjs gelistet".

- **⚪ W1-7 Root-`package.json` ohne `engines`-Feld** (Node ≥ 20 steht nur in den Sub-Paketen);
  ein Root-`engines` + `.nvmrc` würde die Anforderung sichtbar machen.

### W2 — mcp-servers/

- **🔴 W2-1 anonymizer-proxy: JSON-RPC-`error` wird NICHT maskiert.** `server.mjs` maskiert
  downstream→client nur `msg.result`; Error-Antworten (`msg.error.message`/`.data`) gehen ungefiltert
  durch — z. B. „user john.doe@corp.com not found" leakt PII am Proxy vorbei.
  → `msg.error` ebenfalls durch `maskDeep` schicken (gleiches fail-closed-Muster wie result).

- **🟠 W2-2 Die Binärnamen-Verdrahtung hat keine Install-Story.** Alle `.mcp.json` referenzieren
  Custom-Server per Binärname (`anonymizer-proxy`, `artifact-viewer`, …), aber **kein Dokument**
  erklärt, wie die bins auf den PATH kommen (`npm link` je Workspace? `npm i -g`?). Zusammen mit
  W1-1 (kein dist, kein prepare) ist die komplette Custom-MCP-Kette auf einer frischen Maschine
  nicht funktionsfähig. → Setup-Abschnitt in README + ggf. `tools/setup-mcp-servers.sh`
  (build + npm link je Server); Alternative diskutieren: absolute Pfade/`node <pfad>` statt bins.

- **🟡 W2-3 artifact-viewer `npm test` läuft nur `fallback.test.mjs`** — `textfile.test.mjs` existiert,
  hängt aber nur in der (alten) ci.yml. Nach Umstellung auf `npm test --workspaces` (Plan A2) fällt er
  stillschweigend raus. → package.json-test-Script um textfile.test.mjs erweitern (Teil von A2).

- **🟡 W2-4 alarm-mcp `_platformSound` nutzt `spawnSync`** (blockiert den Event-Loop bis 3 s, zweimal
  pro Feuern) — der MCP-Server ist währenddessen unresponsive. → `spawn` (async) + `unref()`.

- **🟡 W2-5 alarm-mcp Store ist cwd-relativ** (`.copilot/state/alarms.json`): Alarme kleben am
  Startverzeichnis; startet Copilot woanders, „fehlen" sie. Für einen Home-Wecker unintuitiv.
  → Default auf `~/.copilot/state/alarms.json` (Home-basiert) erwägen; `ALARM_STORE` bleibt Override.

- **🟡 W2-6 Masker-Performance:** `_persistMap()` schreibt bei **jedem** neuen Match synchron die
  ganze Map; `unmaskString` iteriert alle Map-Einträge für jeden String. Bei großen ADO-Antworten
  spürbar. → Persist debouncen; unmask nur, wenn der String einen Pseudonym-Marker (`<`) enthält.

- **🟡 W2-7 Kein Integrationstest für den Proxy selbst.** `roundtrip.mjs` testet nur die
  Masker-Klasse; spawn/stdio-Framing/fail-closed von `server.mjs` sind ungetestet.
  → Mini-Echo-Downstream als Fixture (~30 Zeilen) + 3 Fälle (mask, block, unparsebare Zeile).

- **⚪ W2-8 Renderer-HTML: `title` wird nicht escaped** (mermaid.ts u. a.) und `lang="de"` ist
  hartkodiert. → `escapeHtml(title)` überall; lang weglassen oder parametrisieren.

### W3 — docs/

- **🟠 W3-1 `Work_Konzept.md` + `Home_Konzept.md` sind auf altem Stand** und widersprechen dem Repo:
  beide listen das **gelöschte `fun`-Plugin**, Plugin-Zahlen falsch (Work „10", real 9; Home „9",
  real 8), loop-Merge fehlt; Work behauptet „vuln-scan warn" unter `preToolUse` (real: dotnet-vuln ist
  ein `postToolUse`-Hook im blazor-Plugin). **Tote Env-Vars:** `ONENOTE_NOTEBOOKS` (Home) und
  `ADO_TEAM_ID` (Work) werden von keinem Plugin genutzt, stehen aber als „erforderlich" in Konzept +
  Marketplace-READMEs. → Beide Konzept-Docs auf Realität ziehen; tote Vars streichen (oder das
  fehlende Feature bewusst nachtragen); Env-Tabellen als Single-Source nur noch im Marketplace-README
  führen und aus dem Konzept verlinken (heute doppelt gepflegt).

- **🟡 W3-2 Guide ↔ ADR-0006 widersprechen sich beim Referenz-Layout:** der Authoring-Guide lehrt
  durchgehend `references/` (Ordner), ADR-0006 kanonisiert `reference.md` (Singular-Datei). Beide
  Formen existieren im Repo; der Maturity-Scorer akzeptiert inzwischen beide.
  → Eine Stelle zur Wahrheit machen: „`reference.md` für eine Datei, `references/` ab ≥2 Dateien"
  in **beiden** Dokumenten identisch formulieren.

- **🟡 W3-3 Env-Var-Tabellen dreifach gepflegt** (Konzept-Doc, Marketplace-README, teils ADRs) —
  Drift vorprogrammiert (siehe W3-1). → Eine Quelle (README) + Verweise.

### W4 — Marketplace-Shared (README/CONTRIBUTING/AGENTS/marketplace.json)

- **🟠 W4-1 Beide `AGENTS.md` lehren veraltete Konventionen:** (a) `applyTo`/`mcp_tools` als
  optionale Skill-Frontmatter — genau die Felder, die als inert entfernt wurden (Validator warnt);
  (b) beide listen den **loop-Agenten unter Plugin „loop"** — das Plugin existiert nicht mehr
  (Work→experimental, Home→general); (c) Work-Tabelle: tester mit „editFiles+runCommands"
  (VS-Code-Namen statt edit/execute). → AGENTS.md sind Governance-Einstiegspunkte — auf den Stand
  von Guide/ADR-0006/0007 ziehen. (Hinweis: `meta/agents-md-generate` sollte diese Datei künftig
  **generieren** — dann kann sie nicht mehr driften.)

- **🟠 W4-2 `CONTRIBUTING.md` (beide) lehrt den alten Flachdatei-Stil:** „SKILL.md anlegen mit
  name/description + optional applyTo/mcp_tools" — kein Wort zu Paket-Standard (reference/examples/
  evals), Maturity-Score, scoped Validate (`--skill`) oder dem Authoring-Guide. Der wichtigste
  Onboarding-Text für Beitragende zeigt in die falsche Richtung.
  → Neu schreiben: 5-Schritte-Flow (skill-author → Paket → `--skill`-Validate → evals → maturity).

- **🟡 W4-3 Cross-Marketplace-Verweis:** `home/lab/pw-explore` verweist auf `testing/e2e-codegen`
  (existiert nur in Work) — verletzt das Zwei-Welten-Prinzip aus ADR-0001 (kein Cross-Reference).
  → Verweis entfernen oder als expliziten „(nur im Work-Marketplace)"-Hinweis kennzeichnen; Regel
  in den Validator aufnehmen (Skill-Verweise nur innerhalb des eigenen Marketplace).

- **✅ Positiv-Befund (kein Handlungsbedarf):** alle Datei-Links in sämtlichen 150 SKILL.md
  (reference/examples/templates/scripts) lösen auf — 0 tote Links.

### W5 — Work-Plugins

- **🟠 W5-1 blazor: `dotnet-vuln.sh` läuft bei JEDEM `postToolUse`.** Der Hook ruft
  `dotnet list package --vulnerable` (NuGet-API, dauert Sekunden) **nach jedem einzelnen Tool-Call**
  in einem .NET-Repo — massiver Overhead, API-Rate-Limits, Latenz in jeder Interaktion.
  → Auf `sessionStart` verschieben oder debouncen (Marker-Datei mit TTL, z. B. 1×/Stunde), oder
  ganz auf den dependency-vuln-Skill (on-demand) verweisen.

- **🟡 W5-2 Work-CDN-Allowlist erlaubt unversionierte CDN-URLs** (`…/npm/chart.js` ohne Pin):
  Supply-Chain-Risiko — „latest" vom CDN kann sich jederzeit ändern. Die Renderer nutzen teils
  explizit `mermaid@10`, die Policy erzwingt das aber nicht.
  → Allowlist auf Major-gepinnte Präfixe (`…/npm/mermaid@10/`) verengen.

- **✅ Positiv-Befunde (kein Handlungsbedarf):** alle 11 Skill-Scripts `node --check` sauber;
  `next-adr.mjs` verifiziert read-only (keine Writes); Command→Skill-Referenzen aller 76 Commands
  lösen im eigenen Marketplace auf; `labels.json`/`pr-defaults`/`allowlist.tools` konsistent.

### W6 — Home-Plugins

- **🟠 W6-1 home/visual behauptet eine CDN-Allowlist, die es nicht gibt.** Mehrere visual-Skills
  (+ meine Description-Sweeps) sagen „CDN-Allowlist erzwungen" — aber nur **Work**/experimental hat
  `policy/cdn-allowlist.json`; in Home existiert keine. Zudem fehlen die Home-spezifischen Libs
  (markmap, vis-timeline, excalidraw) in jeder Liste.
  → `home/plugins/visual/policy/cdn-allowlist.json` anlegen (chart.js, gridjs, mermaid, reveal.js,
  markmap, vis-timeline + Pins) — oder die Behauptung aus den Skills nehmen.

- **🟡 W6-2 Docker ist eine undokumentierte Voraussetzung:** der offizielle GitHub-MCP-Server läuft
  als Docker-Image (`ghcr.io/github/github-mcp-server`); ohne laufenden Docker ist der `github`-Server
  in Home tot. Weder Home-README noch Konzept nennen Docker als Requirement.
  → In die Env-/Voraussetzungs-Tabelle aufnehmen (+ Fallback-Hinweis Remote-Server
  `https://api.githubcopilot.com/mcp/`).

- **✅ Positiv-Befunde:** `profiles.json` nennt keine Phantom-Server (alle in `.mcp.json` konfiguriert);
  nicht-profilierte Server (password-gen, visual-Renderer, notion) bleiben by design immer aktiv;
  Home-Audit-Rotation (30 Tage) stimmt mit der Doku überein.

---

### W7 — KI-Experten-Pass (Kalibrierung · Upstream statt Eigenbau · bessere Techniken · Abgucken)

- **🔴 W7-1 Passphrasen sind kryptografisch schwach — published Wordlist nutzen.** `password-gen`
  wirbt mit „cryptographically secure", die Diceware-Wortliste hat aber nur **50 Wörter** →
  5-Wort-Passphrase = **28,2 bits** Entropie (trivial knackbar). Die **EFF-Large-Wordlist** (7776
  Wörter, public domain, der publizierte Standard) liefert **64,6 bits**.
  → EFF-Liste als JSON einbetten (dep-frei), Test auf Entropie-Untergrenze.

- **🟠 W7-2 `findings[]` ist ein Eigenbau-Schema — SARIF ist der Industriestandard.** OASIS SARIF 2.1
  ist das Findings-Format, das GitHub Code Scanning, IDEs und alle SAST-Tools sprechen.
  → findings[] als schlankes LLM-Format **behalten**, aber `tools/findings-to-sarif.mjs`-Adapter
  bauen (+ SARIF-Export in review-aggregate) — damit sind Review-Ergebnisse in GitHub Code Scanning
  hochladbar und mit jedem SARIF-Tool auswertbar.

- **🟠 W7-3 Guardian-Secret-Patterns doppelt gepflegt statt aus der gebündelten Quelle.** Plan-B2
  will Token-Regexes im Hook hart kodieren — dabei **shippen wir die Regexes schon** in
  `templates/betterleaks.toml`. → Guardian parst die TOML (Node-Einzeiler) → EINE Quelle für
  Pre-Push-Scan, Guardian und secrets-scan. (Verbessert B2.)

- **🟠 W7-4 PII-Patterns nicht selbst erfinden — Presidio-Wissen übernehmen.** Microsoft Presidio
  (published, battle-tested, inkl. DE-Recognizern) definiert genau die Pattern+Checksum-Kombis, die
  B1 bauen will. Nicht als Dependency (Python), aber: **Pattern-Definitionen und Testvektoren als
  Daten übernehmen** statt eigene Regexes zu erraten. (Verbessert B1.)

- **🟡 W7-5 Sprachmix in der Discovery-Schicht:** 133 Descriptions DE, **18 EN** — exakt die
  Flagships (review/*, e2e-codegen, confluence-format, …). Semantisches Matching verkraftet das,
  aber der Katalog wirkt inkonsistent und Trigger-Vorhersagbarkeit leidet.
  → Eine Sprache festlegen (vermutlich DE, da Nutzer-Prompts DE) und die 18 umziehen — Entscheidung.

- **🟡 W7-6 Der feature-Workflow ist 6× beschrieben** (Skript = Wahrheit, dazu SKILL, reference,
  examples, Command, ARCHITECTURE) — die Drift-Gefahr steht schon in reference.md §3 („Tabellen
  nachziehen"). **Bessere Technik: docs-from-code** — `run-state.mjs describe --markdown` generiert
  die Schritt-Tabellen, reference/Commands betten das Generat ein. (Verbessert C4.)

- **🟡 W7-7 `run-state.mjs` ist Work/Home code-dupliziert, nur die Daten differieren.**
  → Code identisch halten (CI-Gleichheits-Check per `diff`), WORKFLOWS in eine `workflows.json`
  je Marketplace auslagern — Zwei-Welten bleibt (Daten pro Welt), Drift wird prüfbar. (C4.)

- **🟡 W7-8 CDN-Pinning ohne SRI ist halbe Miete.** Bessere Technik: **Subresource Integrity** —
  generierte HTML-Artefakte laden CDN-Skripte mit `integrity="sha384-…" crossorigin` und die
  Allowlist führt Hashes statt nur URL-Präfixe. (Verschärft W5-2.)

- **🟡 W7-9 Eigene Formate ohne maschinenlesbares Schema.** findings, eval-cases, profiles,
  git-guardrails, labels sind nur in Prosa-Markdown definiert. → `docs/schemas/*.schema.json`
  (JSON Schema 2020-12) publizieren: `$schema`-Zeile gibt Editor-Autocomplete, Validator prüft
  dagegen, Verträge werden explizit.

- **🟡 W7-10 Behaviour-Runner (P15) nicht selbst bauen — erst promptfoo evaluieren.** Published
  Eval-Framework mit LLM-Judge, Assertions, CI-Integration und Custom-Providern; unsere
  `cases.json` (query/expected_behavior/expected_tools) mappt fast 1:1 auf dessen Format.
  Adapter statt Eigenbau spart Wochen.

- **🟡 W7-11 „Abgucken" zum Prozess machen:** je ein 1:1-Vergleich unserer Flagships mit published
  Gegenstücken (`anthropics/skills` skill-creator/document-skills, `github/awesome-copilot`
  security-review) und konkrete Strukturideen portieren — z. B. deren „when NOT to use"-Sektionen
  und Checklisten-Formate. Als wiederkehrenden Schritt in den Authoring-Guide aufnehmen.

- **🟡 W7-12 Unsere `AGENTS.md` kollidiert mit dem published agents.md-Standard.** Der offene
  Standard (agents.md, von Copilot & Co. gelesen) definiert AGENTS.md als **Instruktionsdatei für
  Coding-Agenten**; unsere zwei AGENTS.md sind Konventions-Doku pro Marketplace. Tools, die den
  Standard lesen, füttern dem Agenten also Governance-Tabellen als Anweisungen.
  → Umbenennen (z. B. `CONVENTIONS.md`) **oder** inhaltlich zum Standard machen.

- **🟡 W7-13 Fehlende Selbstanwendung: dieses Repo hat keine eigenen Agent-Instructions.** Wir
  bauen Generatoren (`agents-md-generate`, copilot-instructions), aber das Repo selbst hat weder
  Root-`AGENTS.md` noch `.github/copilot-instructions.md` mit den Kernregeln (dep-free ESM,
  Zwei-Welten, Validator-Gates, Commit-Konventionen). → Dogfooding: selbst anlegen.

- **🟡 W7-14 profile-switch: Slash-Form-Präzision.** `/mcp enable …` kann nur der **Nutzer** tippen;
  der Agent kann nur `copilot mcp …` via execute ausführen. SKILL/Command sagen das nicht explizit —
  Risiko, dass der Agent Slash-Kommandos „ausführen" will. → Ein klärender Satz in SKILL + Command.

- **⚪ W7-15 `skill-uplift-tracker.md` wächst unbegrenzt** — erledigte Wellen 1–5 in einen
  Archiv-Abschnitt/Datei falten, nur Aktives oben halten.

---

## Fazit & Auswirkung auf den Plan (Teil 1)

**Zwei Funde ändern bestehende Plan-Punkte:**
1. **W1-1/W1-2 → A2 und C1 anpassen:** `dist/` ist gitignored (nicht committet, wie ADR-0005 behauptet)
   → C1 („dist-Drift via git diff") ist hinfällig; stattdessen `prepare`-Scripts + CI-Build.
   Lockfile committen, `npm ci` ohne Fallback (in A2).
2. **W2-3 → A2:** artifact-viewer-test-Script erweitern, sonst verliert die CI-Umstellung Tests.

**Empfohlene Priorisierung der neuen Funde** (nach Entscheidung einzeln in Blöcke einsortieren):
- **Sofort-Kandidaten (funktional kaputt / Falschaussage):** W1-1 (prepare/dist), W1-2 (Lockfile),
  W2-1 (error-Leak im PII-Proxy), W2-2 (PATH-Install-Story), W6-1 (Home-CDN-Allowlist),
  W5-1 (dotnet-vuln-Kosten), **W7-1 (28-bit-Passphrasen → EFF-Wordlist)**.
- **Mit A/B/C mitnehmen (gleiche Baustellen, teils als bessere Umsetzung):** W1-3 (.gitignore state/),
  W2-3 (test-Script), W3-1 (Konzept-Docs), W4-1/W4-2 (AGENTS/CONTRIBUTING), W1-4 (area design/api),
  **W7-3 (B2 liest betterleaks.toml statt Hardcode)**, **W7-4 (B1 nutzt Presidio-Patterns)**,
  **W7-6/W7-7 (C4: docs-from-code + workflows.json)**, **W7-8 (SRI zu W5-2)**, **W7-14 (C5-Satz)**.
- **Backlog (einzeln entscheiden):** W1-5/6/7, W2-4..8, W3-2/3, W4-3, W5-2, W6-2,
  W7-2 (SARIF-Adapter), W7-5 (Sprachkonsistenz), W7-9 (JSON Schemas), W7-10 (promptfoo statt
  Eigenbau-Runner), W7-11 (Benchmark-Prozess), W7-12 (agents.md-Standard-Kollision),
  W7-13 (eigene Repo-Instructions), W7-15 (Tracker-Archiv).
