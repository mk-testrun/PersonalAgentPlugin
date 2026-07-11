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
  const dir = mkdtempSync(join(tmpdir(), 'confluence-drafts-'));
  const file = join(dir, 'companies.json');
  writeFileSync(
    file,
    JSON.stringify({
      companies: {
        acme: {
          confluence: {
            tenants: {
              cloud: {
                baseUrl: 'https://acme.atlassian.net/wiki',
                email: 'ich@firma.de',
                apiTokenEnv: 'TEST_CONFLUENCE_TOKEN',
                whitelistedSpaces: ['ENG'],
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

test('confluence-drafts Server: Handshake, Tool-Liste und Whitelist-Policy über stdio', async () => {
  const client = new McpTestClient(serverPath, {
    AGENT_CONFIG: writeConfig(),
    TEST_CONFLUENCE_TOKEN: 'dummy',
  });
  try {
    const init = await client.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'copilot-cli-test', version: '1.0' },
    });
    assert.equal(init.result.serverInfo.name, 'confluence-drafts');

    const list = await client.request('tools/list');
    const names = list.result.tools.map(t => t.name);
    assert.deepEqual(names.sort(), [
      'confluence_create_draft',
      'confluence_get_page',
      'confluence_list_spaces',
      'confluence_list_tenants',
      'confluence_search',
      'confluence_update_draft',
    ]);
    // Garantie: weder Publish- noch Delete-Tool vorhanden.
    assert.ok(!names.some(n => /publish|delete|remove/i.test(n)));

    const tenants = await client.callTool('confluence_list_tenants');
    const info = JSON.parse(tenants.result.content[0].text);
    assert.deepEqual(info.tenants[0].whitelistedSpaces, ['ENG']);
    assert.ok(!('apiTokenEnv' in info.tenants[0]));

    // Whitelist-Verstoß wird als POLICY BLOCKED gemeldet, ohne Netzwerkzugriff.
    const blocked = await client.callTool('confluence_create_draft', {
      spaceKey: 'HR',
      title: 'x',
    });
    assert.equal(blocked.result.isError, true);
    assert.match(blocked.result.content[0].text, /^POLICY BLOCKED:.*Whitelist/);
  } finally {
    await client.close();
  }
});
