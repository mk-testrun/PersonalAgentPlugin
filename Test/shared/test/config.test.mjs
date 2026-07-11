import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTenant, listTenants, requireSecret } from '../config.mjs';
import { PolicyError } from '../errors.mjs';

const cfg = {
  companies: {
    acme: {
      devops: {
        tenants: {
          main: { organizationUrl: 'https://dev.azure.com/acme', patEnv: 'P1', userEmail: 'a@acme.de', whitelistedProjects: ['Alpha'] },
          legacy: { organizationUrl: 'https://dev.azure.com/old', patEnv: 'P2', userEmail: 'a@acme.de', whitelistedProjects: ['Old'] },
        },
      },
    },
    kunde: {
      devops: {
        tenants: {
          prod: { organizationUrl: 'https://dev.azure.com/kunde', patEnv: 'P3', userEmail: 'b@kunde.de', whitelistedProjects: ['Shop'] },
        },
      },
      confluence: {
        tenants: {
          cloud: { baseUrl: 'https://kunde.atlassian.net/wiki', email: 'b@kunde.de', apiTokenEnv: 'T1', whitelistedSpaces: ['ENG'] },
        },
      },
    },
  },
};

test('resolveTenant: eindeutige Firma/Tenant wird automatisch gewählt', () => {
  const t = resolveTenant(cfg, 'confluence');
  assert.equal(t.company, 'kunde');
  assert.equal(t.tenant, 'cloud');
  assert.deepEqual(t.whitelistedSpaces, ['ENG']);
});

test('resolveTenant: mehrere Firmen erfordern den company-Parameter', () => {
  assert.throws(() => resolveTenant(cfg, 'devops'), PolicyError);
  const t = resolveTenant(cfg, 'devops', 'kunde');
  assert.equal(t.tenant, 'prod');
});

test('resolveTenant: mehrere Tenants erfordern den tenant-Parameter', () => {
  assert.throws(() => resolveTenant(cfg, 'devops', 'acme'), PolicyError);
  const t = resolveTenant(cfg, 'devops', 'acme', 'legacy');
  assert.equal(t.organizationUrl, 'https://dev.azure.com/old');
});

test('resolveTenant: unbekannte Firma/Tenant wird abgelehnt', () => {
  assert.throws(() => resolveTenant(cfg, 'devops', 'gibtsnicht'), PolicyError);
  assert.throws(() => resolveTenant(cfg, 'devops', 'acme', 'gibtsnicht'), PolicyError);
});

test('listTenants: liefert Übersicht ohne Secret-Env-Namen', () => {
  const tenants = listTenants(cfg, 'devops');
  assert.equal(tenants.length, 3);
  assert.ok(tenants.every(t => !('patEnv' in t) && !('apiTokenEnv' in t)));
  assert.ok(tenants.some(t => t.company === 'kunde' && t.tenant === 'prod'));
});

test('requireSecret: liest Env-Variable, fehlende Werte schlagen fehl', () => {
  assert.equal(requireSecret('MY_PAT', { MY_PAT: 'geheim' }), 'geheim');
  assert.throws(() => requireSecret('MY_PAT', {}), /MY_PAT/);
  assert.throws(() => requireSecret(undefined, {}));
});
