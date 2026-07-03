# ADR-0004 — Git-Guardrails (§2.10)

## Status
Accepted · 2026-06-28 · Credit: adaptiert von `mattpocock/skills · git-guardrails-claude-code`

## Kontext
Ein Agent mit Shell-Zugriff kann versehentlich **destruktive, nicht-triviale-zu-rückgängig-zu-machende**
Git-Operationen ausführen: `git push --force` auf main, `git reset --hard`, `git filter-branch` usw. —
Aktionen, die Commit-History zerstören oder geschützte Branches korrumpieren. Das Risiko ist in den
beiden Welten unterschiedlich gewichtet: Work ist ein geteiltes Firmen-Repo (Verlust = teuer), Home ist
persönlich (mehr Freiheit erwünscht).

## Optionen
- **A — Nichts sperren:** volle Freiheit, volles Risiko. Ein falscher Force-Push auf main ist teuer.
- **B — Alles Destruktive überall hart sperren:** maximal sicher, aber nervt im Home-Kontext, wo
  History-Rewrites auf eigenen Branches legitim sind.
- **C — Pro Welt differenziert:** Work `deny`, Home `warn` (außer force-push auf main/master → immer
  `deny`). Regel-Liste als Policy-Datei, damit sie ohne Code-Änderung pflegbar ist.

## Entscheidung
**Option C.** Git-Guardrails als `preToolUse`-Erweiterung in den `tool-guardian`-Skripten beider
Marketplaces; Konfiguration als `policy/git-guardrails.json` im jeweiligen `general`-Plugin.

| Operation | Work | Home |
|---|---|---|
| `git push --force` auf main/master | deny | deny |
| `git push --force` auf anderen Branches | deny | warn |
| `git reset --hard` | deny | warn |
| `git clean -fd[x]` | deny | warn |
| `git branch -D` | deny | warn |
| `git checkout -f` / `git switch -f` | deny | warn |
| `git update-ref -d` · `git reflog delete` | deny | warn |
| `git filter-branch` / `filter-repo` | deny | warn |
| `git rebase` auf shared branches | deny | — |

`--force-with-lease` bleibt bewusst **erlaubt** (verliert keine fremden Commits — der sichere Weg, einen
rebasten Branch zu pushen).

## Update 2026-07-02 — Policy wird jetzt real gelesen

Ursprünglich waren die Patterns im Shell-Skript hart kodiert und `policy/git-guardrails.json` war
dekorativ. Jetzt lesen beide Guardians die Policy-Datei (Pfad relativ zum Skript; Override für Tests:
`GIT_GUARDRAILS_POLICY`). Die `force-with-lease`-Ausnahme steht als `allowExceptions` in der Policy.
**Fail-safe:** ist die Policy unlesbar, greift eine eingebaute Minimal-Liste (force-push, reset --hard,
filter-branch/-repo) — Guardrails verschwinden nie stillschweigend. Home: `blockAlways` sind Regex,
`warn` sind Substrings.

## Konsequenzen
- **Positiv:** die teuersten Fehler (force-push main, hard reset) sind in Work unmöglich, in Home beim
  main geschützt; die Liste ist als JSON pflegbar.
- **Kosten:** die Guardrails matchen auf Kommando-Strings (`preToolUse`) — kreative Umgehungen (Aliase,
  `sh -c "..."`) können theoretisch durchrutschen; der Schutz ist eine starke Leitplanke, kein Sandbox.
  Der Nutzer kann bewusst über die Shell direkt umgehen.
- Der Agent muss dem Nutzer erklären, *warum* eine Operation blockiert wurde.

## Offene Fragen
- Sollte `git rebase` auf shared branches auch in Home `warn` erzeugen (aktuell `—`)?
- Deckt das String-Matching genug ab, oder brauchen wir eine robustere Kommando-Parsing-Schicht?
