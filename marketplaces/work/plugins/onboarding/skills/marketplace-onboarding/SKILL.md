---
name: marketplace-onboarding
description: >-
  Explains what this Copilot marketplace does and how it's built, shows which plugins are installed
  vs available, recommends the plugins a user actually needs for their goal, and installs/verifies
  them with [CONFIRM]. Use when onboarding someone to the marketplace, when they ask "what can this
  do?", "which plugin do I need for X?", "how do I install/use these plugins?", or via
  /onboard-marketplace. Adapts depth to the user's role (programmer / non-programmer, ELI5..detailed).
---

# Marketplace Onboarding

Makes the user effective with *this* marketplace: understand it, pick the right plugins, install and
verify them. The Tool/Host track is `tool-onboarding`; the project track is `project-onboarding`.

## When to Use This Skill

- Introducing the marketplace and how it's structured (plugins = bundles of skills/commands/agents/MCP)
- "Which plugin do I need for X?" / "what's installed?" / "install/verify the right plugins"
- Via `/onboard-marketplace`

## Workflow

### Step 1 — Overview
Explain the marketplace from `marketplace.json` + README (role-adapted: nutzen-orientiert for
non-programmers, terse for programmers).

### Step 2 — Installation state
Run `copilot plugin list` and show **which plugins are installed vs not**.

### Step 3 — Match to the goal
Use **[references/plugin-catalog.md](references/plugin-catalog.md)** (plugin → use-case, solo vs in
combination) to name only the plugins the user's goal actually needs.

### Step 4 — Install (with [CONFIRM])
Install missing-but-needed plugins per
**[references/install-and-verify.md](references/install-and-verify.md)** — **[CONFIRM] before each install**.

### Step 5 — Verify
Re-list and confirm the plugin's skills/commands are visible; diagnose on failure.

## Role Adaptivity

- `non-programmer`: explain plugins by their **benefit** ("review = automatic quality check"), no jargon.
- `programmer`: terse matrix, commands directly, name the combination flows.

## Output

Clear install state, a goal-fit recommendation, and verified installation. Install only with
**[CONFIRM]**; no other writes beyond progress in `state/onboarding.json`.
