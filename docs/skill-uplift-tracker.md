# Skill-Uplift-Tracker (voller Sweep auf den Authoring-Standard)

> **Diese Datei ist die *Absicht* (manuell gepflegt): Wellenplan, Prioritäten, bewusste Anti-Ziele.**
> Der *Ist-Stand* wird automatisch gemessen: **`docs/skill-maturity.md`** (`npm run maturity`);
> Regressionen erkennt `node tools/validate-plugins.mjs --maturity-gaps`. Der Wert liegt im Abgleich:
> wenn der Tracker „Skill X soll 4★" sagt und die Maturity „2★" misst → offener Action-Item.
> Skills, die **bewusst** niedrig bleiben (reine Wissens-Konventionen ohne Skript), hier als Anti-Ziel
> notieren, damit ihr niedriger Auto-Score kein Alarm ist.

## Aktueller Stand

- **Alle ~151 Skills ◐** (konkret, gegliedert, handlungsleitend) — keine Stubs. **0★: 0.**
- **8 Flaggschiffe ★** (volle Pakete mit references/ + evals/): work `security-review`,
  `review-aggregate`, `confluence-format`, `e2e-codegen`, `efcore-query-explain`, `loop`,
  `doku/product-functions` · home `security-review`.
- Verteilung ~ 3×5★ · 3×4★ · 14×3★ · 24×2★ · Rest 1★ (gemessen — siehe skill-maturity.md).

**Der 1★-Tier ist bewusstes Anti-Ziel, kein offener TODO** (ADR-0006): schlanke, vollständige Skills —
`*-conventions`, kurze Single-Purpose-Aktionen — brauchen **kein** reference/examples/scripts/evals-Paket.
Sie haben eine scharfe Description + klaren Body; ein erzwungenes Paket wäre genau die „flapsige
Boilerplate", die wir vermeiden. Der Score misst „Paket-Tiefe", nicht „ist der Skill gut".

**Künftige ★-Promotion (Kür, kein Gate):** einzelne Aktions-Skills mit echtem deterministischem Schritt
(z. B. `github-issues/prs`, `energy-tracking`) können bei Bedarf reference/examples/Skript bekommen → 3★+.
Priorität steuert der Abgleich Tracker ↔ `skill-maturity.md` (+ optionale Ziele in `docs/skill-targets.json`).
Nicht auf Vorrat.

Legende: ☐ offen · ◐ solide (konkret, gegliedert) · ★ Flaggschiff (Paket mit references/+evals)

## Reifegrad-Definition

- **◐ solide:** SKILL.md ≥ „ef-core-Niveau" — konkrete, gegliederte, handlungsleitende Inhalte; reiche Description.
- **★ Flaggschiff:** zusätzlich `reference.md`/`references/` (Progressive Disclosure) + `evals/cases.json` (≥3).

---

## Archiv — abgeschlossene Wellen

<details>
<summary>Wellen 1–5 + Maturity-Wellen 2a–2c (alle ✅ erledigt, Stand 2026-07)</summary>

1. **Welle 1:** Fundament + `review/security-review ★` als Referenz-Exemplar.
2. **Welle 2:** `review/review-aggregate ★` + `doku/confluence-format ★` (references + evals).
3. **Welle 3:** `testing/e2e-codegen ★`, `blazor/efcore-query-explain ★`, `loop ★` (heute in experimental/general).
4. **Welle 4:** `onboarding/marketplace-onboarding ★` + `home/reviewer/security-review ★`.
5. **Welle 5:** restliche Skills auf ◐ (Description-Schärfung, references wo Tiefe), Plugin für Plugin.

**Maturity-getriebene Wellen (ab 2026-07):**
- **2a:** Flaggschiffe auf 5★ — `doku/product-functions`, `review/review-aggregate`, `review/secrets-scan`,
  `orchestration/workflow-router` (Work, examples) — plus fairer Scorer (references/-Ordner, EN-Trigger, body-Achse).
- **2b/2c:** Description-Sweep über ALLE ~150 Skills — jede Description reich (3. Person, „was + wie + wann"
  + Trigger + Tool/MCP/Output). Discovery-Schicht durchgängig scharf.

Jede Welle endete grün (Validator + Evals) und wurde thematisch committet.

</details>
