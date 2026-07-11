#!/usr/bin/env node
/**
 * confluence-drafts — GitHub-Copilot-CLI-Extension (lokaler MCP-Server) für sicheres Confluence.
 *
 * Garantien:
 * - Nur gewhitelistete Spaces sind erreichbar (Lesen + Schreiben), Multi-Company + Multi-Tenant.
 * - Die KI kann NIE publishen: Es entstehen ausschließlich Entwürfe (status "draft"),
 *   und nur Entwürfe dürfen aktualisiert werden. Publish-/Delete-Tools existieren nicht.
 * - Suchen (CQL) werden hart auf die Whitelist-Spaces eingeschränkt.
 * - Optionale PII-Redaction (Schritt 3) auf allen Ausgaben.
 */
import { McpServer } from '../../shared/mcp-server.mjs';
import { loadConfig, resolveTenant, listTenants, requireSecret } from '../../shared/config.mjs';
import { applyPii } from '../../shared/pii-filter.mjs';
import { ConfluenceClient } from './confluence-client.mjs';
import {
  assertPageIsDraft,
  assertSpaceIdAllowed,
  assertSpaceKeyAllowed,
  buildScopedCql,
  cqlEscape,
} from './guards.mjs';

const config = loadConfig();

const tenantParams = {
  company: {
    type: 'string',
    description: 'Firma aus der Konfiguration (optional, wenn nur eine Firma konfiguriert ist)',
  },
  tenant: {
    type: 'string',
    description: 'Tenant/Site der Firma (optional, wenn eindeutig)',
  },
};

// Cache der aufgelösten Whitelist-Spaces pro company/tenant: Map<spaceId, spaceKey>
const spaceCache = new Map();

function connect(args) {
  const tenantCfg = resolveTenant(config, 'confluence', args.company, args.tenant);
  const client = new ConfluenceClient({
    baseUrl: tenantCfg.baseUrl,
    email: tenantCfg.email,
    apiToken: requireSecret(tenantCfg.apiTokenEnv),
  });
  return { tenantCfg, client };
}

async function allowedSpaces(tenantCfg, client) {
  const cacheKey = `${tenantCfg.company}/${tenantCfg.tenant}`;
  if (!spaceCache.has(cacheKey)) {
    const spaces = await client.spacesByKeys(tenantCfg.whitelistedSpaces ?? []);
    spaceCache.set(cacheKey, {
      byId: new Map(spaces.map(s => [String(s.id), s.key])),
      byKey: new Map(spaces.map(s => [s.key.toLowerCase(), s])),
      spaces,
    });
  }
  return spaceCache.get(cacheKey);
}

function out(data) {
  return applyPii(data, config);
}

function summarizePage(page, spaceKey) {
  return {
    id: page.id,
    status: page.status,
    title: page.title,
    spaceKey,
    spaceId: page.spaceId,
    version: page.version?.number,
    parentId: page.parentId,
  };
}

const tools = [
  {
    name: 'confluence_list_tenants',
    description:
      'Listet alle konfigurierten Firmen/Tenants (Multi-Company) inkl. gewhitelisteter Spaces. Keine Secrets.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => out({ tenants: listTenants(config, 'confluence') }),
  },

  {
    name: 'confluence_list_spaces',
    description: 'Listet die erreichbaren (gewhitelisteten) Confluence-Spaces eines Tenants.',
    inputSchema: { type: 'object', properties: { ...tenantParams }, additionalProperties: false },
    handler: async args => {
      const { tenantCfg, client } = connect(args);
      const { spaces } = await allowedSpaces(tenantCfg, client);
      return out({
        company: tenantCfg.company,
        tenant: tenantCfg.tenant,
        spaces: spaces.map(s => ({ id: s.id, key: s.key, name: s.name, type: s.type })),
      });
    },
  },

  {
    name: 'confluence_get_page',
    description: 'Liest eine Seite (inkl. Storage-Body). Nur Seiten aus Whitelist-Spaces.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'Seiten-ID' },
        ...tenantParams,
      },
      required: ['pageId'],
      additionalProperties: false,
    },
    handler: async args => {
      const { tenantCfg, client } = connect(args);
      const page = await client.getPage(args.pageId);
      const { byId } = await allowedSpaces(tenantCfg, client);
      const spaceKey = assertSpaceIdAllowed(byId, page.spaceId);
      return out({ ...summarizePage(page, spaceKey), body: page.body?.storage?.value });
    },
  },

  {
    name: 'confluence_search',
    description:
      'Sucht Inhalte per CQL oder Freitext — automatisch hart auf die Whitelist-Spaces eingeschränkt.',
    inputSchema: {
      type: 'object',
      properties: {
        cql: { type: 'string', description: 'Optionale eigene CQL-Abfrage (wird mit Space-Whitelist UND-verknüpft)' },
        text: { type: 'string', description: 'Alternativ: Freitextsuche' },
        limit: { type: 'integer', description: 'Max. Treffer (Default 25)' },
        ...tenantParams,
      },
      additionalProperties: false,
    },
    handler: async args => {
      const { tenantCfg, client } = connect(args);
      const userCql = args.cql ?? (args.text ? `text ~ "${cqlEscape(args.text)}"` : '');
      const cql = buildScopedCql(userCql, tenantCfg.whitelistedSpaces);
      const res = await client.search(cql, { limit: Math.min(Math.max(args.limit ?? 25, 1), 100) });
      const results = (res.results ?? []).map(r => ({
        id: r.content?.id,
        type: r.content?.type,
        status: r.content?.status,
        title: r.content?.title ?? r.title,
        spaceKey: r.resultGlobalContainer?.displayUrl?.split('/').pop(),
        excerpt: r.excerpt,
        url: r.url,
      }));
      return out({ cql, count: results.length, results });
    },
  },

  {
    name: 'confluence_create_draft',
    description:
      'Erstellt eine NEUE Seite als Entwurf (status "draft") in einem Whitelist-Space. ' +
      'Veröffentlichen ist über diese Extension nicht möglich — der Mensch publisht im Browser.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: { type: 'string', description: 'Ziel-Space (muss gewhitelistet sein)' },
        title: { type: 'string', description: 'Seitentitel' },
        bodyStorage: {
          type: 'string',
          description: 'Inhalt im Confluence-Storage-Format (XHTML)',
        },
        parentId: { type: 'string', description: 'Optionale Eltern-Seiten-ID' },
        ...tenantParams,
      },
      required: ['spaceKey', 'title'],
      additionalProperties: false,
    },
    handler: async args => {
      const { tenantCfg, client } = connect(args);
      assertSpaceKeyAllowed(tenantCfg, args.spaceKey);
      const { byKey } = await allowedSpaces(tenantCfg, client);
      const space = byKey.get(args.spaceKey.toLowerCase());
      if (!space) throw new Error(`Space "${args.spaceKey}" wurde in Confluence nicht gefunden`);
      const page = await client.createDraft({
        spaceId: space.id,
        title: args.title,
        bodyStorage: args.bodyStorage,
        parentId: args.parentId,
      });
      return out({
        created: true,
        note: 'Als Entwurf gespeichert — Veröffentlichung nur manuell durch dich.',
        ...summarizePage(page, space.key),
      });
    },
  },

  {
    name: 'confluence_update_draft',
    description:
      'Aktualisiert einen bestehenden ENTWURF (status "draft") in einem Whitelist-Space. ' +
      'Veröffentlichte Seiten können nicht verändert und Entwürfe nicht publisht werden.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'ID des Entwurfs' },
        title: { type: 'string', description: 'Neuer Titel (optional, sonst unverändert)' },
        bodyStorage: {
          type: 'string',
          description: 'Neuer Inhalt im Storage-Format (optional, sonst unverändert)',
        },
        ...tenantParams,
      },
      required: ['pageId'],
      additionalProperties: false,
    },
    handler: async args => {
      const { tenantCfg, client } = connect(args);
      const page = await client.getPage(args.pageId);
      const { byId } = await allowedSpaces(tenantCfg, client);
      const spaceKey = assertSpaceIdAllowed(byId, page.spaceId);
      assertPageIsDraft(page);
      const updated = await client.updateDraft({
        id: page.id,
        title: args.title ?? page.title,
        bodyStorage: args.bodyStorage ?? page.body?.storage?.value ?? '',
        versionNumber: (page.version?.number ?? 0) + 1,
      });
      return out({
        updated: true,
        note: 'Änderung bleibt im Entwurf — Veröffentlichung nur manuell durch dich.',
        ...summarizePage(updated, spaceKey),
      });
    },
  },
];

new McpServer({ name: 'confluence-drafts', version: '1.0.0', tools }).start();
