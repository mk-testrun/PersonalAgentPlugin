/**
 * PolicyError — wird geworfen, wenn eine Sicherheitsregel (Whitelist, Assigned-to-me,
 * Draft-only, Delete-Verbot, …) eine Aktion blockiert. Der MCP-Server wandelt sie in
 * ein `isError`-Tool-Ergebnis mit "POLICY BLOCKED"-Präfix um, damit die KI den Grund
 * lesen kann, statt dass der Server crasht.
 */
export class PolicyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PolicyError';
  }
}
