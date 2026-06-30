---
name: secrets-prepush-hook
description: >-
  Installs a team-shareable git pre-push hook that scans the pushed commits for secrets with betterleaks
  (the gitleaks successor) before they leave the machine. Use when asked to set up a secret-scanning
  pre-push hook, prevent committing/pushing secrets, or harden a repo's git workflow. Local fast-feedback
  layer; the hard CI gate stays kingfisher (pipeline-conventions).
---

# Pre-Push Secret Hook (betterleaks)

Two-layer secret defense: this **local pre-push** hook (betterleaks, fast feedback) plus the **CI gate**
(kingfisher, see `pipeline-conventions`). The hook ships with this plugin at `git-hooks/pre-push`.

## When to Use This Skill

- "Set up a pre-push hook to catch secrets" · "stop me from pushing API keys"
- Hardening a repo's git workflow before the first push

## Workflow

### Step 1 — Check betterleaks
```bash
betterleaks version   # install: https://github.com/betterleaks/betterleaks (drop-in gitleaks replacement)
```
If missing, give the install hint — the hook self-skips (warns) when betterleaks is absent, so it never
blocks a developer who hasn't installed it yet.

### Step 2 — Install the hook (team-shareable, [CONFIRM])
Use a **tracked** hooks dir so the whole team gets it (not the untracked `.git/hooks`):
```bash
mkdir -p .githooks
cp <plugin>/git-hooks/pre-push .githooks/pre-push   # this plugin's bundled hook
chmod +x .githooks/pre-push
git config core.hooksPath .githooks                  # repo-local; commit .githooks/ to share
```
Confirm before changing `core.hooksPath` (**[CONFIRM]**) — it redirects *all* git hooks for the repo.

### Step 3 — Verify
```bash
git config --get core.hooksPath        # → .githooks
test -x .githooks/pre-push && echo ok
```
Optionally dry-run by pushing a throwaway branch with a fake secret on a scratch repo.

## How the hook behaves

- Scans only the **commit range being pushed** (`remote..local`, or all-not-on-remote for a new branch).
- `betterleaks git --redact` → secrets are never printed.
- Secret found → push **blocked** (exit 1); bypass a false positive once with `git push --no-verify`.
- betterleaks absent → **skips with a warning** (CI still gates via kingfisher).

## Output

An installed, executable `.githooks/pre-push` + `core.hooksPath` set. No secrets are ever printed.
Don't disable the CI gate — this hook complements it, it doesn't replace it.
