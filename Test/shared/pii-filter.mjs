/**
 * Schritt 3: Optionale PII-Entfernung.
 *
 * Entfernt personenbezogene Daten aus Tool-Ausgaben, bevor sie an die KI gehen:
 * - Felder, die eindeutig Benutzer identifizieren (System.AssignedTo, createdBy,
 *   displayName, emailAddress, …) werden komplett durch "[PII-REDACTED]" ersetzt.
 * - E-Mail-Adressen in beliebigen Textwerten werden durch "[EMAIL-REDACTED]" ersetzt.
 *
 * Aktivierung (optional, Default: aus):
 * - Konfiguration: { "pii": { "enabled": true, "extraUserFields": [...] } }
 * - Env-Override:  PII_REDACTION=on | off  (gewinnt gegenüber der Konfiguration)
 */

export const PII_PLACEHOLDER = '[PII-REDACTED]';
export const EMAIL_PLACEHOLDER = '[EMAIL-REDACTED]';

/** Felder, deren Wert eindeutig als Benutzer-Identität erkennbar ist. */
export const DEFAULT_USER_FIELDS = [
  // Azure DevOps
  'System.AssignedTo',
  'System.CreatedBy',
  'System.ChangedBy',
  'System.AuthorizedAs',
  'Microsoft.VSTS.Common.ActivatedBy',
  'Microsoft.VSTS.Common.ResolvedBy',
  'Microsoft.VSTS.Common.ClosedBy',
  'assignedTo',
  'createdBy',
  'changedBy',
  'modifiedBy',
  'revisedBy',
  'identity',
  // Confluence / Atlassian
  'authorId',
  'ownerId',
  'accountId',
  'author',
  'lastOwner',
  // generische Identitätsfelder
  'displayName',
  'uniqueName',
  'userPrincipalName',
  'emailAddress',
  'mailAddress',
  'email',
  'userName',
  'user',
];

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

/** Entscheidet, ob Redaction aktiv ist (Env-Override > Konfiguration > Default aus). */
export function piiEnabled(cfg, env = process.env) {
  if (env.PII_REDACTION === 'on') return true;
  if (env.PII_REDACTION === 'off') return false;
  return cfg?.pii?.enabled === true;
}

/**
 * Redigiert PII in einem beliebigen JSON-Wert (deep, ohne das Original zu verändern).
 * piiCfg: optionaler Abschnitt { extraUserFields: [...] } aus der Konfiguration.
 */
export function redactPii(value, piiCfg = {}) {
  const fieldSet = new Set(
    [...DEFAULT_USER_FIELDS, ...(piiCfg.extraUserFields ?? [])].map(f => f.toLowerCase())
  );
  return walk(value, fieldSet);
}

function walk(value, fieldSet) {
  if (typeof value === 'string') {
    return value.replace(EMAIL_RE, EMAIL_PLACEHOLDER);
  }
  if (Array.isArray(value)) {
    return value.map(item => walk(item, fieldSet));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = fieldSet.has(key.toLowerCase()) ? PII_PLACEHOLDER : walk(val, fieldSet);
    }
    return out;
  }
  return value;
}

/** Bequemer Wrapper: redigiert nur, wenn aktiviert. */
export function applyPii(value, cfg, env = process.env) {
  return piiEnabled(cfg, env) ? redactPii(value, cfg?.pii ?? {}) : value;
}
