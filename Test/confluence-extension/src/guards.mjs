/**
 * Sicherheitsregeln der Confluence-Extension (reine Funktionen, unit-getestet):
 *
 * 1. Nur gewhitelistete Spaces sind erreichbar (Lesen + Schreiben), Multi-Company/-Tenant.
 * 2. Die KI kann NIE publishen: Neue Seiten entstehen ausschließlich als Draft
 *    (status = "draft"), und aktualisiert werden dürfen nur Seiten, die bereits
 *    Draft sind. Ein Publish- oder Delete-Tool existiert nicht.
 * 3. CQL-Suchen werden hart auf die Whitelist-Spaces eingeschränkt.
 */
import { PolicyError } from '../../shared/errors.mjs';

const SPACE_KEY_RE = /^[A-Za-z0-9_~.-]+$/;

export function assertSpaceKeyAllowed(tenantCfg, spaceKey) {
  if (!spaceKey) throw new PolicyError('Space-Key fehlt');
  const whitelist = tenantCfg.whitelistedSpaces ?? [];
  const ok = whitelist.some(k => k.toLowerCase() === String(spaceKey).toLowerCase());
  if (!ok) {
    throw new PolicyError(
      `Space "${spaceKey}" steht nicht auf der Whitelist (erlaubt: ${whitelist.join(', ') || '—'})`
    );
  }
}

/**
 * Prüft eine Space-ID gegen die Map der aufgelösten Whitelist-Spaces (id → key).
 * Liefert den Space-Key zurück, wenn erlaubt.
 */
export function assertSpaceIdAllowed(allowedSpacesById, spaceId) {
  const key = allowedSpacesById.get(String(spaceId));
  if (!key) {
    throw new PolicyError(`Seite liegt in einem nicht gewhitelisteten Space (spaceId ${spaceId})`);
  }
  return key;
}

/** Regel 2: Nur Drafts dürfen verändert werden — veröffentlichte Seiten sind tabu. */
export function assertPageIsDraft(page) {
  if (page?.status !== 'draft') {
    throw new PolicyError(
      `Seite ${page?.id} hat Status "${page?.status}" — nur Entwürfe (status "draft") dürfen ` +
        'bearbeitet werden. Veröffentlichen ist über diese Extension nicht möglich.'
    );
  }
}

/**
 * Choke-Point vor jedem schreibenden Confluence-Call: Payload MUSS status "draft" haben.
 * Verhindert, dass irgendein Codepfad versehentlich mit status "current" publisht.
 */
export function assertDraftPayload(payload) {
  if (payload?.status !== 'draft') {
    throw new PolicyError(
      `Schreib-Payload hat status "${payload?.status}" statt "draft" — Publish ist blockiert`
    );
  }
}

/** Regel 3: CQL immer mit der Space-Whitelist UND-verknüpfen. */
export function buildScopedCql(userCql, whitelistedSpaces) {
  const keys = (whitelistedSpaces ?? []).filter(k => SPACE_KEY_RE.test(k));
  if (keys.length === 0) {
    throw new PolicyError('keine (gültigen) Spaces auf der Whitelist — Suche nicht möglich');
  }
  const spaceClause = `space in (${keys.map(k => `"${k}"`).join(', ')})`;
  const cql = String(userCql ?? '').trim();
  return cql ? `(${cql}) AND ${spaceClause}` : spaceClause;
}

/** Escaped Freitext für ein CQL-String-Literal. */
export function cqlEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
