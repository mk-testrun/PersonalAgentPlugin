import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPii,
  piiEnabled,
  redactPii,
  EMAIL_PLACEHOLDER,
  PII_PLACEHOLDER,
} from '../pii-filter.mjs';

test('redactPii ersetzt E-Mail-Adressen in Freitext', () => {
  const out = redactPii({ note: 'Bitte an max.mustermann@firma.de melden.' });
  assert.equal(out.note, `Bitte an ${EMAIL_PLACEHOLDER} melden.`);
});

test('redactPii ersetzt eindeutig identifizierte Benutzerfelder komplett', () => {
  const workItem = {
    fields: {
      'System.Title': 'Login-Bug',
      'System.AssignedTo': {
        displayName: 'Max Mustermann',
        uniqueName: 'max.mustermann@firma.de',
      },
      'System.CreatedBy': 'Erika Musterfrau <erika@firma.de>',
    },
  };
  const out = redactPii(workItem);
  assert.equal(out.fields['System.AssignedTo'], PII_PLACEHOLDER);
  assert.equal(out.fields['System.CreatedBy'], PII_PLACEHOLDER);
  assert.equal(out.fields['System.Title'], 'Login-Bug');
});

test('redactPii redigiert Confluence-Identitätsfelder (authorId, accountId)', () => {
  const out = redactPii({ version: { authorId: 'abc123', number: 4 }, accountId: 'xyz' });
  assert.equal(out.version.authorId, PII_PLACEHOLDER);
  assert.equal(out.accountId, PII_PLACEHOLDER);
  assert.equal(out.version.number, 4);
});

test('redactPii verändert das Original nicht und behält Arrays/Skalare', () => {
  const input = { list: [{ email: 'a@b.de' }, 42, 'kein pii'], flag: true };
  const out = redactPii(input);
  assert.equal(input.list[0].email, 'a@b.de');
  assert.equal(out.list[0].email, PII_PLACEHOLDER);
  assert.equal(out.list[1], 42);
  assert.equal(out.list[2], 'kein pii');
  assert.equal(out.flag, true);
});

test('extraUserFields aus der Konfiguration werden berücksichtigt', () => {
  const out = redactPii({ Custom_Reviewer: 'Max' }, { extraUserFields: ['Custom_Reviewer'] });
  assert.equal(out.Custom_Reviewer, PII_PLACEHOLDER);
});

test('piiEnabled: Default aus, Konfiguration aktiviert, Env-Override gewinnt', () => {
  assert.equal(piiEnabled({}, {}), false);
  assert.equal(piiEnabled({ pii: { enabled: true } }, {}), true);
  assert.equal(piiEnabled({ pii: { enabled: true } }, { PII_REDACTION: 'off' }), false);
  assert.equal(piiEnabled({ pii: { enabled: false } }, { PII_REDACTION: 'on' }), true);
});

test('applyPii ist ein No-Op, wenn Redaction deaktiviert ist', () => {
  const data = { email: 'a@b.de' };
  assert.deepEqual(applyPii(data, {}, {}), data);
  assert.equal(applyPii(data, { pii: { enabled: true } }, {}).email, PII_PLACEHOLDER);
});
