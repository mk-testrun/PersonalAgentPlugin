# WCAG 2.2 — Key Criteria (audit reference)

## Contents
- Perceivable (1.x) · Operable (2.x) · Understandable (3.x) · Robust (4.x) · New in 2.2

🤖 = axe-core usually detects · 👁️ = needs human judgement.

## Perceivable
- **1.1.1 Non-text Content** (A) 👁️ — every image/icon has a *meaningful* alt; decorative → empty alt.
- **1.3.1 Info & Relationships** (A) 🤖👁️ — semantic structure (headings, lists, `<label>`, table headers).
- **1.4.3 Contrast (Minimum)** (AA) 🤖 — text ≥ 4.5:1 (large text ≥ 3:1).
- **1.4.4 Resize Text** (AA) 👁️ — usable at 200% zoom.
- **1.4.10 Reflow** (AA) 👁️ — no horizontal scroll at 320px width.
- **1.4.11 Non-text Contrast** (AA) 🤖 — UI components/states ≥ 3:1.

## Operable
- **2.1.1 Keyboard** (A) 👁️ — all functionality via keyboard; no traps (2.1.2).
- **2.4.3 Focus Order** (A) 👁️ — focus moves in a meaningful sequence.
- **2.4.7 Focus Visible** (AA) 🤖👁️ — visible focus indicator.
- **2.5.8 Target Size (Minimum)** (AA, new 2.2) 👁️ — targets ≥ 24×24 CSS px (with exceptions).

## Understandable
- **3.2.x On Focus/Input** (A/AA) 👁️ — no unexpected context change on focus/input.
- **3.3.1 Error Identification** (A) 👁️ — errors named in text, not colour-only.
- **3.3.2 Labels or Instructions** (A) 🤖👁️ — inputs have programmatic labels.
- **3.3.7 Redundant Entry** (A, new 2.2) 👁️ — don't force re-entering known info.

## Robust
- **4.1.2 Name, Role, Value** (A) 🤖👁️ — custom controls expose correct ARIA name/role/state.
- **4.1.3 Status Messages** (AA) 👁️ — dynamic status via `aria-live`/role=status.

## Severity mapping (axe impact → finding severity)
critical/serious → high · moderate → medium · minor → low. A keyboard trap or missing form label that
blocks a task is high; a minor contrast miss on decorative text is low.

## Audit tips
- Tab through the whole page first (keyboard + focus order + visible focus) — this finds what axe can't.
- Zoom to 200% and narrow to 320px for resize/reflow.
- Check one representative of each component type, not every instance.
