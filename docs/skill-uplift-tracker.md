# Skill-Uplift-Tracker (voller Sweep auf den Authoring-Standard)

> **Diese Datei ist die *Absicht* (manuell gepflegt): Wellenplan, Prioritäten, bewusste Anti-Ziele.**
> Der *Ist-Stand* wird automatisch gemessen: **`docs/skill-maturity.md`** (regenerieren mit
> `node tools/validate-plugins.mjs --maturity-md docs/skill-maturity.md`). Der Wert liegt im Abgleich:
> wenn der Tracker „Skill X soll 4★" sagt und die Maturity „2★" misst → offener Action-Item.
> Skills, die **bewusst** niedrig bleiben (reine Wissens-Konventionen ohne Skript), hier als Anti-Ziel
> notieren, damit ihr niedriger Auto-Score kein Alarm ist.

Ziel: **jeden** Skill auf `docs/skill-authoring-guide.md` heben — substanzielle, konkrete SKILL.md,
`references/` bei Tiefe, `scripts/`/`templates/`/`examples.md` wo wertvoll, Evals bei Flaggschiffen.
Gate je Skill: `validate-plugins.mjs` + (falls Evals) `run-evals.mjs` grün **und** DoD-Checkliste erfüllt.

## ✅ Terminal-Zustand erreicht (Loop-Stop)
- **146 Skills: alle ◐** (konkret, gegliedert, handlungsleitend) — keine leeren Bodies, keine 5-Zeilen-Stubs.
- **8 Flaggschiffe ★** (volle Pakete mit `references/` + `evals/`): work `security-review`,
  `review-aggregate`, `confluence-format`, `e2e-codegen`, `efcore-query-explain`, `loop`;
  home `security-review`.
- Spec-konforme Manifeste · spec-treuer Validator · Eval-Runner in CI · Authoring-Guide.
- Beide Marketplaces: `validate-plugins` + `run-evals` grün.

**Offen (optional, auf Wunsch):** weitere ◐-Skills zu ★ promoten (references/evals) — der Standard
ist erreicht; weitere ★-Promotion ist Kür, kein Gate.

Legende: ☐ offen · ◐ solide (konkret, gegliedert) · ★ Flaggschiff (Paket mit references/+evals)

## Reifegrad-Definition
- **◐ solide:** SKILL.md ≥ „ef-core-Niveau" — konkrete, gegliederte, handlungsleitende Inhalte; reiche Description.
- **★ Flaggschiff:** zusätzlich `references/` (Progressive Disclosure) + `evals/cases.json` (≥3).

## Status (Stand: aktueller Branch)

### marketplaces/work
| Plugin | Skills | Stand |
|---|---|---|
| review | security-review ★ · 15 weitere | security-review **★ fertig**; Rest ◐ (echte Checklisten aus Vorphase) → auf Flaggschiff/solide heben |
| testing | e2e-codegen, dotnet-test-run, code-coverage, e2e-playwright, responsive-view, test-conventions, tests-review, e2e-pipeline-wire | ◐ → vertiefen, references wo sinnvoll |
| blazor | efcore-* (7), *-conventions (3), component-scaffold | ◐ → references für query-explain/entity-design; scripts wo deterministisch |
| doku | confluence-format ★-Kandidat, +4 | ◐ → confluence-format zu ★ (references: storage-format, macros) |
| onboarding | initiator+3 tracks, env-doctor, repo/codebase, confluence-explain, first-task, checklist | ◐ → tracks zu ★ |
| orchestration | (commands) | Commands prüfen/vertiefen |
| experimental | 17 visual/adr | ◐ → references je Diagrammtyp wo sinnvoll |
| meta | 10 author-skills | ◐ (schon pattern-tragend) → Beispiele/Templates ergänzen |
| general | commit, changelog, git-flow, tdd-loop, triage, story, grill, ado-*, pipeline-conventions | ◐ → vertiefen |
| loop | loop ★-Kandidat | ◐ → Eval + references (protocol) |

### marketplaces/home
| Plugin | Skills | Stand |
|---|---|---|
| reviewer | 11 (security-review ★-Kandidat) | ◐ → security-review zu ★ (analog Work) |
| visual | 14 | ◐ → references je Lib wo sinnvoll |
| audio | speak-summary, sound-notifications | ◐ |
| morning | briefing, energy, week-reel | ◐ |
| lab | pw-explore, tool-inventory, homeassistant | ◐ |
| general | github-prs, grill-me, conventions, … | ◐ |
| meta | spiegelt Work-meta | ◐ |
| orchestration/loop | analog Work | ◐ |

## Wellen-Plan
1. **Welle 1 (erledigt):** Fundament + `review/security-review ★` als Referenz-Exemplar.
2. **Welle 2 (erledigt):** `review/review-aggregate ★` + `doku/confluence-format ★` (references + evals).
3. **Welle 3 (erledigt):** `testing/e2e-codegen ★`, `blazor/efcore-query-explain ★`, `loop/loop ★`.
4. **Welle 4 (erledigt):** `onboarding/marketplace-onboarding ★` + `home/reviewer/security-review ★`.
5. **Welle 5+:** restliche Skills auf ◐-Niveau heben (Description-Schärfung in 3. Person „was+wie+wann",
   references wo Tiefe), Plugin für Plugin; je Welle validate + run-evals grün, thematischer Commit.

**Flaggschiffe ★ fertig (8):** work: security-review, review-aggregate, confluence-format, e2e-codegen,
efcore-query-explain, loop · home: security-review.

> Jede Welle endet grün (Validator + Evals) und wird committet. Kein Skill gilt als fertig,
> solange er nur eine Checkliste ist (siehe Guide §6).

---

## Maturity-getriebene Wellen (ab 2026-07)

Ab jetzt priorisiert nach dem **gemessenen** Score in `docs/skill-maturity.md`
(`node tools/validate-plugins.mjs --maturity-md docs/skill-maturity.md`). Ziel: die wichtigsten Skills
auf ≥4★, breite Masse auf ≥2★. Reihenfolge nach Hebel (Nutzungshäufigkeit × Score-Lücke).

**Welle 2a (läuft):** die 3★-Skills, denen nur reference/examples fehlen, auf 5★ heben.
- ✅ `doku/product-functions` (5★), `review/review-aggregate` (5★, Ordner-references jetzt gewertet)
- ✅ `review/secrets-scan` → reference.md + examples.md ergänzt
- ✅ `orchestration/workflow-router` (Work) → examples.md ergänzt
- **offen 2a:** `review/dependency-vuln`, `review/license-check`, `experimental/adr-write`,
  `testing/code-coverage`, `general/secrets-prepush-hook` (je reference.md + examples.md).

**Welle 2b:** die meistgenutzten `general`-Skills (commit-generate, changelog-generate, ado-*) auf ≥3★
(Description in 3. Person schärfen, reference wo Tiefe, ggf. Skript).

**Welle 2c:** `*-conventions`-Skills (blazor/home) — **Anti-Ziel:** diese bleiben bewusst schlank
(reine Wissens-Skills ohne Skript, ~2★ ist ok); nur Description-Schärfung, keine erzwungenen Pakete.

**Rest:** Plugin für Plugin auf ◐/≥2★, je Welle `validate` + `run-evals` grün + thematischer Commit.
Der Abgleich Tracker↔`skill-maturity.md` steuert die Priorität.
