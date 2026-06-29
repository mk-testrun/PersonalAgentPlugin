# Install & Verify Plugins (Copilot CLI)

## List (read-only, anytime)
```bash
copilot plugin list
```
Shows installed plugins. Compare against the marketplace to see what's missing.

## Install (requires [CONFIRM])
```bash
copilot plugin install <plugin-name>
```
- **[CONFIRM] before each install** — name the plugin and why it's needed first.
- Install only the plugins the user's goal needs (from the catalog), not the whole marketplace.

## Verify (after install)
1. `copilot plugin list` again → the plugin now appears as installed.
2. Confirm its **skills/commands are visible** (e.g. the plugin's slash commands resolve).
3. If a referenced MCP/hook is required, check its env/secret prerequisites (delegate to `env-doctor`).

## Diagnose on failure
- Not appearing after install → check the marketplace was added (`copilot plugin marketplace add …`).
- Skill/command missing → check the plugin manifest `.github/plugin/plugin.json` lists it.
- MCP tool errors → missing env/secret; run `env-doctor`.

## Declarative alternative
Plugins can also be enabled via `enabledPlugins` in `~/.copilot` settings — mention it, but prefer the
explicit, confirmable `install` flow during onboarding.
