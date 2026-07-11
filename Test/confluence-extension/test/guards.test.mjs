import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDraftPayload,
  assertPageIsDraft,
  assertSpaceIdAllowed,
  assertSpaceKeyAllowed,
  buildScopedCql,
  cqlEscape,
} from '../src/guards.mjs';
import { PolicyError } from '../../shared/errors.mjs';

const tenant = { whitelistedSpaces: ['ENG', 'DOCS'] };

test('Space-Whitelist per Key: erlaubt (case-insensitive) vs. blockiert', () => {
  assert.doesNotThrow(() => assertSpaceKeyAllowed(tenant, 'ENG'));
  assert.doesNotThrow(() => assertSpaceKeyAllowed(tenant, 'docs'));
  assert.throws(() => assertSpaceKeyAllowed(tenant, 'HR'), PolicyError);
  assert.throws(() => assertSpaceKeyAllowed(tenant, undefined), PolicyError);
});

test('Space-Whitelist per ID: nur aufgelöste Whitelist-Spaces passieren', () => {
  const byId = new Map([['111', 'ENG'], ['222', 'DOCS']]);
  assert.equal(assertSpaceIdAllowed(byId, '111'), 'ENG');
  assert.equal(assertSpaceIdAllowed(byId, 222), 'DOCS');
  assert.throws(() => assertSpaceIdAllowed(byId, '999'), PolicyError);
});

test('Draft-only: veröffentlichte Seiten dürfen nicht bearbeitet werden', () => {
  assert.doesNotThrow(() => assertPageIsDraft({ id: '1', status: 'draft' }));
  assert.throws(() => assertPageIsDraft({ id: '2', status: 'current' }), PolicyError);
  assert.throws(() => assertPageIsDraft({ id: '3', status: 'archived' }), PolicyError);
  assert.throws(() => assertPageIsDraft(undefined), PolicyError);
});

test('Choke-Point: Schreib-Payload ohne status "draft" wird blockiert (kein Publish)', () => {
  assert.doesNotThrow(() => assertDraftPayload({ status: 'draft', title: 'x' }));
  assert.throws(() => assertDraftPayload({ status: 'current', title: 'x' }), PolicyError);
  assert.throws(() => assertDraftPayload({ title: 'x' }), PolicyError);
});

test('CQL wird immer mit der Space-Whitelist UND-verknüpft', () => {
  assert.equal(buildScopedCql('', ['ENG', 'DOCS']), 'space in ("ENG", "DOCS")');
  assert.equal(
    buildScopedCql('text ~ "login"', ['ENG']),
    '(text ~ "login") AND space in ("ENG")'
  );
  // Auch eine CQL mit fremdem Space liefert nur die Schnittmenge mit der Whitelist.
  assert.equal(
    buildScopedCql('space = HR', ['ENG']),
    '(space = HR) AND space in ("ENG")'
  );
});

test('buildScopedCql: leere oder ungültige Whitelist blockiert die Suche', () => {
  assert.throws(() => buildScopedCql('text ~ "x"', []), PolicyError);
  assert.throws(() => buildScopedCql('text ~ "x"', ['bad key"']), PolicyError);
});

test('cqlEscape entschärft Anführungszeichen und Backslashes', () => {
  assert.equal(cqlEscape('sagt "hallo"\\'), 'sagt \\"hallo\\"\\\\');
});
