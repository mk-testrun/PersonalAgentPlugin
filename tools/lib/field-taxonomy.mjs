/**
 * field-taxonomy.mjs — welche Frontmatter-Felder / Agent-Tools in welcher Umgebung wirken.
 *
 * Grundprinzip: GitHub Copilot CLI ist First-Party. Ein Feld/Tool bekommt:
 *   - level 'ok'      → in Copilot CLI gültig → keine Meldung
 *   - level 'hint'    → NICHT in der CLI, aber in einer verwandten IDE-Umgebung (VS Code /
 *                        Visual Studio) mit gleicher Semantik → informativer Hinweis (ℹ)
 *   - level 'warning' → wirkt nur in einem ANDEREN KI-Produkt (Claude/ChatGPT/Gemini) oder
 *                        in gar keiner bekannten Umgebung → Warnung (⚠), nennt die Umgebung(en)
 *
 * Jede Meldung nennt die Zielumgebung(en) namentlich. `supportedIn` listet NUR Umgebungen, in
 * denen das Feld wirklich interpretiert wird — im Zweifel konservativ weglassen statt raten.
 *
 * Wartung: abgeglichen mit den offiziellen Docs der jeweiligen Umgebung (Stand 2026-07). Wenn ein
 * Feld unsicher ist, wird es konservativ eingestuft; lieber eine Umgebung zu wenig nennen als eine
 * falsche behaupten.
 */

export const ENV_LABELS = {
  'copilot-cli':         'GitHub Copilot CLI',
  'vscode':              'VS Code (Copilot Chat)',
  'visual-studio':       'Visual Studio (Copilot)',
  'github-cloud-agent':  'GitHub Copilot Coding Agent (Cloud)',
  'claude-code':         'Claude Code / Anthropic Agent Skills',
  'chatgpt':             'ChatGPT (Custom GPTs)',
  'gemini':              'Gemini Code Assist',
};

export function envList(keys = []) {
  if (!keys.length) return '(keine bekannte Umgebung)';
  return keys.map(k => ENV_LABELS[k] ?? k).join(' + ');
}

/**
 * SKILL.md / Command-Frontmatter-Felder.
 * `level` ist bewusst explizit gesetzt (nicht aus supportedIn abgeleitet), damit die
 * IDE-Geschwister (hint) klar von Fremd-KI-Produkten (warning) getrennt bleiben.
 */
export const SKILL_FRONTMATTER = {
  // --- First-Party: gültig in Copilot CLI ---
  'name':                     { level: 'ok', supportedIn: ['copilot-cli', 'vscode', 'visual-studio', 'claude-code'] },
  'description':              { level: 'ok', supportedIn: ['copilot-cli', 'vscode', 'visual-studio', 'claude-code'] },
  'license':                  { level: 'ok', supportedIn: ['copilot-cli', 'claude-code'] },
  'argument-hint':            { level: 'ok', supportedIn: ['copilot-cli', 'vscode'] },
  'user-invocable':           { level: 'ok', supportedIn: ['copilot-cli'] },
  'disable-model-invocation': { level: 'ok', supportedIn: ['copilot-cli'] },

  // --- IDE-Geschwister: nur VS Code / Visual Studio (Instructions-Dateien) → hint ---
  'applyTo':                  { level: 'hint', supportedIn: ['vscode'],
                                note: 'Auto-Attach per Glob gibt es nur in VS-Code-Instructions-Dateien (.instructions.md), nicht in Copilot-CLI-Skills. Trigger gehört in die description.' },

  // --- Fremd-KI-Produkte → warning ---
  'allowed-tools':            { level: 'warning', supportedIn: ['claude-code'],
                                note: 'Auto-Approve-Liste der Anthropic Agent Skills; Copilot CLI kennt das Feld nicht.' },
  'model':                    { level: 'warning', supportedIn: [],
                                note: 'model gehört auf Agenten (.agent.md), nicht auf Skills.' },

  // --- weder hier noch dort → warning, supportedIn leer ---
  'mcp_tools':                { level: 'warning', supportedIn: [],
                                note: 'Kein reales Skill-Frontmatter-Feld; genutzte MCP-Server in description/Body nennen.' },
  'tools':                    { level: 'warning', supportedIn: [], proposedFor: ['copilot-cli'],
                                note: 'Für Copilot-CLI-Skills vorgeschlagen (github/copilot-cli#3095), aber noch nicht implementiert.' },
  'mcp-servers':              { level: 'warning', supportedIn: [], proposedFor: ['copilot-cli'],
                                note: 'Für Copilot-CLI-Skills vorgeschlagen (#3095), noch nicht implementiert. Auf Agenten teils gültig.' },
};

// Für die Fehlermeldung, wenn ein Pflichtfeld-Set gebraucht wird.
export const SKILL_OK_FIELDS = Object.entries(SKILL_FRONTMATTER)
  .filter(([, v]) => v.level === 'ok').map(([k]) => k);

/** Command- (Prompt-File-) Frontmatter. Prompt-Files kennen description/agent/model/tools. */
export const COMMAND_FRONTMATTER = {
  'description':   { level: 'ok', supportedIn: ['copilot-cli', 'vscode', 'visual-studio'] },
  'agent':         { level: 'ok', supportedIn: ['copilot-cli', 'vscode'] },
  'model':         { level: 'ok', supportedIn: ['copilot-cli', 'vscode'] },
  'tools':         { level: 'ok', supportedIn: ['copilot-cli', 'vscode'] },
  'argument-hint': { level: 'ok', supportedIn: ['copilot-cli', 'vscode'] },
  'applyTo':       { level: 'hint', supportedIn: ['vscode'],
                     note: 'Instructions-Auto-Attach ist VS-Code-only, kein Prompt-File-Feld der CLI.' },
};

/** Agent- (.agent.md-) Frontmatter. */
export const AGENT_FRONTMATTER = {
  'name':          { level: 'ok', supportedIn: ['copilot-cli', 'vscode'] },
  'description':   { level: 'ok', supportedIn: ['copilot-cli', 'vscode'] },
  'tools':         { level: 'ok', supportedIn: ['copilot-cli', 'vscode'] },
  'model':         { level: 'ok', supportedIn: ['copilot-cli', 'vscode'] },
  'target':        { level: 'ok', supportedIn: ['copilot-cli', 'vscode'] },
  'argument-hint': { level: 'ok', supportedIn: ['copilot-cli', 'vscode'] },
  'mcp-servers':   { level: 'ok', supportedIn: ['copilot-cli'] },
  'metadata':      { level: 'ok', supportedIn: ['copilot-cli'] },
  'handoffs':      { level: 'hint', supportedIn: ['vscode', 'github-cloud-agent'],
                     note: 'handoffs steuert Agent-Übergaben in VS Code / Cloud Agent — Copilot CLI wertet es (noch) nicht aus.' },
};

function classifyAgainst(map, key) {
  const t = map[key];
  if (t) return t;
  return { level: 'warning', supportedIn: [], note: 'unbekanntes Feld — keiner Zielumgebung zugeordnet.' };
}
export const classifyCommandField = key => classifyAgainst(COMMAND_FRONTMATTER, key);
export const classifyAgentField = key => classifyAgainst(AGENT_FRONTMATTER, key);

/** Gültige Copilot-CLI-Agent-Tool-Aliase. */
export const VALID_AGENT_TOOLS = new Set(['execute', 'read', 'edit', 'search', 'agent', 'web', 'todo']);

/** Bekannte VS-Code-Chat/Agent-Tool-Namen → in der CLI unwirksam (warning, nicht error). */
export const VSCODE_AGENT_TOOLS = new Set([
  'editFiles', 'runCommands', 'runTasks', 'problems', 'usages', 'findTestFiles', 'codebase',
  'searchResults', 'terminalLastCommand', 'terminalSelection', 'testFailure', 'githubRepo',
  'extensions', 'vscodeAPI', 'changes', 'openSimpleBrowser', 'runTests', 'new', 'fetch',
]);

/**
 * Klassifiziert einen Agent-Tool-Eintrag.
 * @returns {{level:'ok'|'warning', supportedIn:string[], note?:string}}
 */
export function classifyAgentTool(tool) {
  if (tool === '*' || VALID_AGENT_TOOLS.has(tool)) return { level: 'ok', supportedIn: ['copilot-cli'] };
  if (tool.includes('/')) return { level: 'ok', supportedIn: ['copilot-cli'] };   // server/* MCP-Referenz
  if (VSCODE_AGENT_TOOLS.has(tool)) {
    return { level: 'warning', supportedIn: ['vscode'],
      note: `VS-Code-Tool-Name — Copilot CLI nutzt Aliase (${[...VALID_AGENT_TOOLS].join('/')}).` };
  }
  if (/^\w+\.\w+/.test(tool)) {
    return { level: 'warning', supportedIn: [],
      note: 'Punkt-Namespacing gibt es nicht; MCP-Tools als "server/*" oder "server/tool" referenzieren.' };
  }
  return { level: 'warning', supportedIn: [],
    note: `unbekannt — nutze ${[...VALID_AGENT_TOOLS].join('/')}, "*" oder "server/*".` };
}

/**
 * Klassifiziert ein Frontmatter-Feld gegen die Skill-Taxonomie.
 * Unbekannte Felder → warning mit leerem supportedIn.
 */
export function classifyFrontmatterField(key) {
  const t = SKILL_FRONTMATTER[key];
  if (t) return t;
  return { level: 'warning', supportedIn: [], note: 'unbekanntes Feld — keiner Zielumgebung zugeordnet.' };
}
