import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpTestClient } from '../../shared/test-helpers/mcp-harness.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dir, '..', 'src', 'server.mjs');

function writeConfig() {
  const dir = mkdtempSync(join(tmpdir(), 'devops-safe-'));
  const file = join(dir, 'companies.json');
  writeFileSync(
    file,
    JSON.stringify({
      companies: {
        acme: {
          devops: {
            tenants: {
              main: {
                organizationUrl: 'https://dev.azure.com/acme',
                patEnv: 'TEST_ADO_PAT',
                userEmail: 'ich@firma.de',
                whitelistedProjects: ['Alpha'],
              },
            },
          },
        },
      },
      pii: { enabled: false },
    })
  );
  return file;
}

test('devops-safe Server: Handshake, Tool-Liste und Policy-Tools über stdio', async () => {
  const client = new McpTestClient(serverPath, {
    AGENT_CONFIG: writeConfig(),
    TEST_ADO_PAT: 'dummy',
  });
  try {
    const init = await client.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'copilot-cli-test', version: '1.0' },
    });
    assert.equal(init.result.serverInfo.name, 'devops-safe');

    const list = await client.request('tools/list');
    const names = list.result.tools.map(t => t.name);
    assert.deepEqual(names.sort(), [
      'devops_create_work_item',
      'devops_get_work_item',
      'devops_list_projects',
      'devops_list_tenants',
      'devops_query_work_items',
      'devops_update_work_item',
      'devops_whoami',
    ]);
    // Garantie: kein Delete-Tool vorhanden.
    assert.ok(!names.some(n => /delete|remove|destroy/i.test(n)));

    const whoami = await client.callTool('devops_whoami');
    const info = JSON.parse(whoami.result.content[0].text);
    assert.equal(info.editableOnlyIfAssignedTo, 'ich@firma.de');
    assert.deepEqual(info.whitelistedProjects, ['Alpha']);

    // Whitelist-Verstoß wird als POLICY BLOCKED gemeldet, ohne Netzwerkzugriff.
    const blocked = await client.callTool('devops_create_work_item', {
      project: 'Geheim',
      type: 'Bug',
      title: 'x',
    });
    assert.equal(blocked.result.isError, true);
    assert.match(blocked.result.content[0].text, /^POLICY BLOCKED:.*Whitelist/);
  } finally {
    await client.close();
  }
});
