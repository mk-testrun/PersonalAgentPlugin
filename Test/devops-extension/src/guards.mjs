/**
 * Sicherheitsregeln der DevOps-Extension (reine Funktionen, unit-getestet):
 *
 * 1. Nur gewhitelistete Projekte sind erreichbar (Lesen UND Schreiben).
 * 2. Bearbeitet werden dürfen nur Work Items, die mir selbst zugeordnet sind.
 * 3. Löschen ist unmöglich: kein Delete-Tool, und der Soft-Delete über
 *    State = "Removed" wird ebenfalls blockiert.
 * 4. Von der KI erzeugte/bearbeitete Objekte werden getaggt (AI-Generated / AI-Edited).
 * 5. WIQL-Abfragen müssen ein einzelnes SELECT-Statement sein (read-only).
 */
import { PolicyError } from '../../shared/errors.mjs';

export const AI_CREATED_TAG = 'AI-Generated';
export const AI_EDITED_TAG = 'AI-Edited';

/** Felder, die die KI nie ändern darf (Projekt-Verschiebung, Historie, Identität). */
const BLOCKED_FIELDS = new Set([
  'system.teamproject',
  'system.id',
  'system.rev',
  'system.createdby',
  'system.createddate',
  'system.changedby',
  'system.changeddate',
  'system.authorizedas',
]);

export function assertProjectAllowed(tenantCfg, project) {
  if (!project) throw new PolicyError('Projekt fehlt');
  const whitelist = tenantCfg.whitelistedProjects ?? [];
  const ok = whitelist.some(p => p.toLowerCase() === String(project).toLowerCase());
  if (!ok) {
    throw new PolicyError(
      `Projekt "${project}" steht nicht auf der Whitelist (erlaubt: ${whitelist.join(', ') || '—'})`
    );
  }
}

/** Filtert Abfrage-Ergebnisse hart auf gewhitelistete Projekte (Defense-in-Depth zu WIQL). */
export function filterToAllowedProjects(tenantCfg, workItems) {
  const whitelist = new Set((tenantCfg.whitelistedProjects ?? []).map(p => p.toLowerCase()));
  return workItems.filter(wi =>
    whitelist.has(String(wi.fields?.['System.TeamProject'] ?? '').toLowerCase())
  );
}

/** Extrahiert die E-Mail aus einer ADO-Identität (String "Name <mail>" oder Identity-Objekt). */
export function identityEmail(identity) {
  if (!identity) return null;
  if (typeof identity === 'string') {
    const match = identity.match(/<([^>]+)>/);
    const raw = (match ? match[1] : identity).trim().toLowerCase();
    return raw || null;
  }
  const raw = (identity.uniqueName ?? identity.mailAddress ?? identity.emailAddress ?? '')
    .trim()
    .toLowerCase();
  return raw || null;
}

/** Regel 2: Nur mir zugeordnete Items dürfen bearbeitet werden. */
export function assertAssignedToMe(workItem, userEmail) {
  if (!userEmail) throw new PolicyError('userEmail ist im Tenant nicht konfiguriert');
  const assignee = identityEmail(workItem.fields?.['System.AssignedTo']);
  if (!assignee) {
    throw new PolicyError(
      `Work Item ${workItem.id} ist niemandem zugeordnet — bearbeitet werden dürfen nur Items, ` +
        `die dir (${userEmail}) zugeordnet sind`
    );
  }
  if (assignee !== userEmail.trim().toLowerCase()) {
    throw new PolicyError(
      `Work Item ${workItem.id} ist "${assignee}" zugeordnet, nicht dir (${userEmail}) — Bearbeitung blockiert`
    );
  }
}

/** Regel 5: WIQL nur als einzelnes SELECT (read-only Abfragesprache, Defense-in-Depth). */
export function assertReadOnlyWiql(wiql) {
  const query = String(wiql ?? '').trim();
  if (!/^select\s/i.test(query)) {
    throw new PolicyError('WIQL muss ein einzelnes SELECT-Statement sein');
  }
  if (query.includes(';')) {
    throw new PolicyError('WIQL darf kein ";" enthalten (nur ein Statement erlaubt)');
  }
}

/** Regel 1+3: Feld-Änderungen prüfen — gesperrte Felder und Soft-Delete blockieren. */
export function assertFieldChangesAllowed(fields = {}) {
  for (const [name, value] of Object.entries(fields)) {
    const key = name.toLowerCase();
    if (BLOCKED_FIELDS.has(key)) {
      throw new PolicyError(`Feld "${name}" darf nicht geändert werden`);
    }
    if (key === 'system.state' && String(value).trim().toLowerCase() === 'removed') {
      throw new PolicyError(
        'State "Removed" ist ein Soft-Delete und blockiert — Löschen von Objekten ist nicht möglich'
      );
    }
  }
}

/** Regel 4: AI-Tag zu bestehender Tag-Liste ("a; b") hinzufügen, ohne Duplikate. */
export function mergeAiTag(existingTags, tag) {
  const tags = String(existingTags ?? '')
    .split(';')
    .map(t => t.trim())
    .filter(Boolean);
  if (!tags.some(t => t.toLowerCase() === tag.toLowerCase())) tags.push(tag);
  return tags.join('; ');
}

/** Escaped einen Wert für die Verwendung in einem WIQL-String-Literal. */
export function wiqlEscape(value) {
  return String(value).replace(/'/g, "''");
}
