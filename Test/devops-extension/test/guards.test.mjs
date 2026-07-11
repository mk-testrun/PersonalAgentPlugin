import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_CREATED_TAG,
  AI_EDITED_TAG,
  assertAssignedToMe,
  assertFieldChangesAllowed,
  assertProjectAllowed,
  assertReadOnlyWiql,
  filterToAllowedProjects,
  identityEmail,
  mergeAiTag,
  wiqlEscape,
} from '../src/guards.mjs';
import { PolicyError } from '../../shared/errors.mjs';

const tenant = { whitelistedProjects: ['Alpha', 'Beta'], userEmail: 'ich@firma.de' };

test('Projekt-Whitelist: erlaubt (case-insensitive) vs. blockiert', () => {
  assert.doesNotThrow(() => assertProjectAllowed(tenant, 'Alpha'));
  assert.doesNotThrow(() => assertProjectAllowed(tenant, 'beta'));
  assert.throws(() => assertProjectAllowed(tenant, 'Geheim'), PolicyError);
  assert.throws(() => assertProjectAllowed(tenant, undefined), PolicyError);
});

test('Abfrage-Ergebnisse werden hart auf Whitelist-Projekte gefiltert', () => {
  const items = [
    { id: 1, fields: { 'System.TeamProject': 'Alpha' } },
    { id: 2, fields: { 'System.TeamProject': 'Geheim' } },
    { id: 3, fields: { 'System.TeamProject': 'beta' } },
    { id: 4, fields: {} },
  ];
  assert.deepEqual(filterToAllowedProjects(tenant, items).map(i => i.id), [1, 3]);
});

test('identityEmail versteht Strings, "Name <mail>" und Identity-Objekte', () => {
  assert.equal(identityEmail('Max Mustermann <Max@Firma.DE>'), 'max@firma.de');
  assert.equal(identityEmail('max@firma.de'), 'max@firma.de');
  assert.equal(identityEmail({ displayName: 'Max', uniqueName: 'Max@Firma.de' }), 'max@firma.de');
  assert.equal(identityEmail(null), null);
  assert.equal(identityEmail({}), null);
});

test('Assigned-to-me: nur eigene Items sind bearbeitbar', () => {
  const mine = { id: 7, fields: { 'System.AssignedTo': { uniqueName: 'ICH@firma.de' } } };
  const theirs = { id: 8, fields: { 'System.AssignedTo': 'Kollege <er@firma.de>' } };
  const unassigned = { id: 9, fields: {} };
  assert.doesNotThrow(() => assertAssignedToMe(mine, 'ich@firma.de'));
  assert.throws(() => assertAssignedToMe(theirs, 'ich@firma.de'), PolicyError);
  assert.throws(() => assertAssignedToMe(unassigned, 'ich@firma.de'), PolicyError);
  assert.throws(() => assertAssignedToMe(mine, ''), PolicyError);
});

test('WIQL muss ein einzelnes SELECT sein', () => {
  assert.doesNotThrow(() => assertReadOnlyWiql('SELECT [System.Id] FROM WorkItems'));
  assert.doesNotThrow(() => assertReadOnlyWiql('  select [System.Id] from WorkItems  '));
  assert.throws(() => assertReadOnlyWiql('DELETE FROM WorkItems'), PolicyError);
  assert.throws(() => assertReadOnlyWiql('SELECT [System.Id] FROM WorkItems; SELECT 1'), PolicyError);
  assert.throws(() => assertReadOnlyWiql(''), PolicyError);
});

test('Soft-Delete über State "Removed" ist blockiert, normale Änderungen nicht', () => {
  assert.doesNotThrow(() => assertFieldChangesAllowed({ 'System.State': 'Active' }));
  assert.throws(() => assertFieldChangesAllowed({ 'System.State': 'Removed' }), PolicyError);
  assert.throws(() => assertFieldChangesAllowed({ 'system.state': ' removed ' }), PolicyError);
});

test('gesperrte Felder (Projekt-Verschiebung, Historie) sind blockiert', () => {
  assert.throws(() => assertFieldChangesAllowed({ 'System.TeamProject': 'Anderes' }), PolicyError);
  assert.throws(() => assertFieldChangesAllowed({ 'System.CreatedBy': 'x' }), PolicyError);
  assert.throws(() => assertFieldChangesAllowed({ 'System.Rev': 1 }), PolicyError);
  assert.doesNotThrow(() => assertFieldChangesAllowed({ 'System.Title': 'Neu' }));
});

test('AI-Tagging: Tag wird ergänzt, Duplikate vermieden, bestehende Tags bleiben', () => {
  assert.equal(mergeAiTag(undefined, AI_CREATED_TAG), 'AI-Generated');
  assert.equal(mergeAiTag('Backend; Sprint-12', AI_CREATED_TAG), 'Backend; Sprint-12; AI-Generated');
  assert.equal(mergeAiTag('ai-generated', AI_CREATED_TAG), 'ai-generated');
  assert.equal(mergeAiTag('Backend', AI_EDITED_TAG), 'Backend; AI-Edited');
});

test('wiqlEscape verdoppelt Hochkommas', () => {
  assert.equal(wiqlEscape("O'Brien"), "O''Brien");
});
