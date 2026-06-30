# WCAG → BFSG / BITV 2.0 Mapping

The BFSG (Barrierefreiheitsstärkungsgesetz, in force 28.06.2025) requires accessibility for many B2C
digital products/services. Technical conformance is via **BITV 2.0**, which references **EN 301 549**,
which in turn adopts **WCAG 2.1/2.2 level AA**. So in practice: **WCAG 2.2 AA ≈ the technical bar**.

## Mapping rule
Each WCAG-AA **Fail** from `accessibility-wcag` maps to a non-conformance under BITV 2.0 / EN 301 549.
Group fails by WCAG principle for the statement; keep the WCAG criterion id as evidence.

| WCAG (from audit) | BITV/EN 301 549 area | In the statement under |
|---|---|---|
| 1.x Perceivable | Wahrnehmbarkeit | "Nicht barrierefreie Inhalte" |
| 2.x Operable | Bedienbarkeit | "Nicht barrierefreie Inhalte" |
| 3.x Understandable | Verständlichkeit | "Nicht barrierefreie Inhalte" |
| 4.x Robust | Robustheit | "Nicht barrierefreie Inhalte" |

## Conformance status (derive from audit)
- **vollständig konform** — no AA fails.
- **teilweise konform** — some AA fails; list them + remediation date.
- **nicht konform** — core tasks blocked by AA fails *(high)*.

## Required statement elements (§12 BFSG)
1. Conformance status (above).
2. Non-accessible content + reason + planned fix/date.
3. Feedback mechanism + contact for reporting barriers.
4. Enforcement procedure / Schlichtungsstelle reference.

## Scope check
Applies to public-facing B2C digital services (with size/exception rules). Note the scope in the
statement; if unsure whether a service is in-scope, flag it as `BFSG-SCOPE` *(info)* for legal review.
