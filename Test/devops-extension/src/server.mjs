#!/usr/bin/env node
/**
 * devops-safe — GitHub-Copilot-CLI-Extension (lokaler MCP-Server) für sicheres Azure DevOps.
 *
 * Garantien:
 * - Nur gewhitelistete Projekte (Lesen + Schreiben), Multi-Company + Multi-Tenant.
 * - Lesen aller Stories/Bugs/Epics/Features ist erlaubt.
 * - Bearbeiten nur bei Work Items, die dem konfigurierten Benutzer zugeordnet sind.
 * - Löschen ist unmöglich (kein Delete-Tool, Soft-Delete via State "Removed" blockiert).
 * - Von der KI erzeugte/bearbeitete Items werden getaggt (AI-Generated / AI-Edited).
 * - Eigenes Abfrage-Tool (WIQL, read-only, hart auf Whitelist-Projekte gefiltert).
 * - Optionale PII-Redaction (Schritt 3) auf allen Ausgaben.
 */
import { McpServer } from '../../shared/mcp-server.mjs';
import { loadConfig, resolveTenant, listTenants, requireSecret } from '../../shared/config.mjs';
import { applyPii } from '../../shared/pii-filter.mjs';
import { AdoClient } from './ado-client.mjs';
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
} from './guards.mjs';

const config = loadConfig();

const SUMMARY_FIELDS = [
  'System.Id',
  'System.Title',
  'System.WorkItemType',
  'System.State',
  'System.AssignedTo',
  'System.TeamProject',
  'System.Tags',
  'System.ChangedDate',
];

const tenantParams = {
  company: {
    type: 'string',
    description: 'Firma aus der Konfiguration (optional, wenn nur eine Firma konfiguriert ist)',
  },
  tenant: {
    type: 'string',
    description: 'Tenant/Organisation der Firma (optional, wenn eindeutig)',
  },
};

function connect(args) {
  const tenantCfg = resolveTenant(config, 'devops', args.company, args.tenant);
  const client = new AdoClient({
    organizationUrl: tenantCfg.organizationUrl,
    pat: requireSecret(tenantCfg.patEnv),
  });
  return { tenantCfg, client };
}

function out(data) {
  return applyPii(data, config);
}

function summarize(workItem) {
  const f = workItem.fields ?? {};
  return {
    id: workItem.id,
    project: f['System.TeamProject'],
    type: f['System.WorkItemType'],
    title: f['System.Title'],
    state: f['System.State'],
    assignedTo: f['System.AssignedTo'],
    tags: f['System.Tags'],
    changedDate: f['System.ChangedDate'],
    url: workItem._links?.html?.href ?? workItem.url,
  };
}

const tools = [
  {
    name: 'devops_list_tenants',
    description:
      'Listet alle konfigurierten Firmen/Tenants (Multi-Company) inkl. gewhitelisteter Projekte. Keine Secrets.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => out({ tenants: listTenants(config, 'devops') }),
  },

  {
    name: 'devops_list_projects',
    description: 'Listet die erreichbaren (gewhitelisteten) Azure-DevOps-Projekte eines Tenants.',
    inputSchema: { type: 'object', properties: { ...tenantParams }, additionalProperties: false },
    handler: async args => {
      const { tenantCfg, client } = connect(args);
      const whitelist = new Set(
        (tenantCfg.whitelistedProjects ?? []).map(p => p.toLowerCase())
      );
      const res = await client.listProjects();
      const projects = (res.value ?? [])
        .filter(p => whitelist.has(p.name.toLowerCase()))
        .map(p => ({ id: p.id, name: p.name, description: p.description, state: p.state }));
      return out({ company: tenantCfg.company, tenant: tenantCfg.tenant, projects });
    },
  },

  {
    name: 'devops_get_work_item',
    description:
      'Liest ein einzelnes Work Item (Story, Bug, Epic, Feature, …) inkl. aller Felder. Nur Whitelist-Projekte.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Work-Item-ID' },
        ...tenantParams,
      },
      required: ['id'],
      additionalProperties: false,
    },
    handler: async args => {
      const { tenantCfg, client } = connect(args);
      const workItem = await client.getWorkItem(args.id);
      assertProjectAllowed(tenantCfg, workItem.fields?.['System.TeamProject']);
      return out({
        ...summarize(workItem),
        description: workItem.fields?.['System.Description'],
        fields: workItem.fields,
      });
    },
  },

  {
    name: 'devops_query_work_items',
    description:
      'Eigenes Abfrage-Tool (read-only): sucht Work Items per Filter oder eigener WIQL-SELECT-Abfrage. ' +
      'Ergebnisse werden hart auf gewhitelistete Projekte gefiltert.',
    inputSchema: {
      type: 'object',
      properties: {
        wiql: {
          type: 'string',
          description: 'Optionale eigene WIQL-Abfrage (nur SELECT). Alternativ Filter nutzen.',
        },
        project: { type: 'string', description: 'Auf ein Whitelist-Projekt einschränken' },
        type: {
          type: 'string',
          description: 'Work-Item-Typ, z. B. "User Story", "Bug", "Epic", "Feature"',
        },
        state: { type: 'string', description: 'Zustand, z. B. "Active"' },
        assignedToMe: { type: 'boolean', description: 'Nur mir zugeordnete Items' },
        text: { type: 'string', description: 'Freitextsuche im Titel' },
        top: { type: 'integer', description: 'Max. Anzahl Ergebnisse (Default 50)' },
        ...tenantParams,
      },
      additionalProperties: false,
    },
    handler: async args => {
      const { tenantCfg, client } = connect(args);
      const top = Math.min(Math.max(args.top ?? 50, 1), 200);

      let wiql = args.wiql;
      if (wiql) {
        assertReadOnlyWiql(wiql);
      } else {
        const conditions = [];
        if (args.project) {
          assertProjectAllowed(tenantCfg, args.project);
          conditions.push(`[System.TeamProject] = '${wiqlEscape(args.project)}'`);
        } else {
          const list = (tenantCfg.whitelistedProjects ?? [])
            .map(p => `'${wiqlEscape(p)}'`)
            .join(', ');
          conditions.push(`[System.TeamProject] IN (${list})`);
        }
        if (args.type) conditions.push(`[System.WorkItemType] = '${wiqlEscape(args.type)}'`);
        if (args.state) conditions.push(`[System.State] = '${wiqlEscape(args.state)}'`);
        if (args.assignedToMe) {
          conditions.push(`[System.AssignedTo] = '${wiqlEscape(tenantCfg.userEmail)}'`);
        }
        if (args.text) conditions.push(`[System.Title] CONTAINS '${wiqlEscape(args.text)}'`);
        wiql =
          `SELECT [System.Id] FROM WorkItems WHERE ${conditions.join(' AND ')} ` +
          'ORDER BY [System.ChangedDate] DESC';
      }

      const queryResult = await client.queryWiql(wiql, { top });
      const ids = (queryResult.workItems ?? []).slice(0, top).map(wi => wi.id);
      if (ids.length === 0) {
        return out({ count: 0, workItems: [], wiql });
      }
      const batch = await client.getWorkItemsBatch(ids, SUMMARY_FIELDS);
      const allowed = filterToAllowedProjects(tenantCfg, batch.value ?? []);
      return out({ count: allowed.length, wiql, workItems: allowed.map(summarize) });
    },
  },

  {
    name: 'devops_create_work_item',
    description:
      'Erstellt ein Work Item in einem Whitelist-Projekt. Wird automatisch mit "AI-Generated" getaggt ' +
      'und standardmäßig dir zugewiesen. Löschen ist über diese Extension nicht möglich.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Ziel-Projekt (muss gewhitelistet sein)' },
        type: {
          type: 'string',
          description: 'Work-Item-Typ, z. B. "User Story", "Bug", "Task", "Feature", "Epic"',
        },
        title: { type: 'string', description: 'Titel' },
        description: { type: 'string', description: 'Beschreibung (HTML erlaubt)' },
        fields: {
          type: 'object',
          description: 'Weitere Felder als { "System.XYZ": wert } (gesperrte Felder werden blockiert)',
        },
        assignToMe: {
          type: 'boolean',
          description: 'Dem konfigurierten Benutzer zuweisen (Default: true)',
        },
        ...tenantParams,
      },
      required: ['project', 'type', 'title'],
      additionalProperties: false,
    },
    handler: async args => {
      const { tenantCfg, client } = connect(args);
      assertProjectAllowed(tenantCfg, args.project);
      const extraFields = { ...(args.fields ?? {}) };
      assertFieldChangesAllowed(extraFields);

      const requestedTags = extraFields['System.Tags'];
      delete extraFields['System.Tags'];

      const ops = [
        { op: 'add', path: '/fields/System.Title', value: args.title },
        { op: 'add', path: '/fields/System.Tags', value: mergeAiTag(requestedTags, AI_CREATED_TAG) },
      ];
      if (args.description) {
        ops.push({ op: 'add', path: '/fields/System.Description', value: args.description });
      }
      if (args.assignToMe !== false) {
        ops.push({ op: 'add', path: '/fields/System.AssignedTo', value: tenantCfg.userEmail });
      }
      for (const [name, value] of Object.entries(extraFields)) {
        ops.push({ op: 'add', path: `/fields/${name}`, value });
      }

      const created = await client.createWorkItem(args.project, args.type, ops);
      return out({ created: true, ...summarize(created) });
    },
  },

  {
    name: 'devops_update_work_item',
    description:
      'Aktualisiert ein Work Item — NUR wenn es dir zugeordnet ist. Projekt muss gewhitelistet sein. ' +
      'Fügt automatisch das Tag "AI-Edited" hinzu. State "Removed" (Soft-Delete) ist blockiert.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Work-Item-ID' },
        fields: {
          type: 'object',
          description: 'Zu ändernde Felder als { "System.XYZ": wert }, z. B. System.Title, System.State',
        },
        ...tenantParams,
      },
      required: ['id', 'fields'],
      additionalProperties: false,
    },
    handler: async args => {
      const { tenantCfg, client } = connect(args);
      const current = await client.getWorkItem(args.id, { expand: 'none' });
      assertProjectAllowed(tenantCfg, current.fields?.['System.TeamProject']);
      assertAssignedToMe(current, tenantCfg.userEmail);

      const fields = { ...(args.fields ?? {}) };
      assertFieldChangesAllowed(fields);
      if (Object.keys(fields).length === 0) {
        throw new Error('keine Felder zum Ändern angegeben');
      }

      const requestedTags = fields['System.Tags'] ?? current.fields?.['System.Tags'];
      fields['System.Tags'] = mergeAiTag(requestedTags, AI_EDITED_TAG);

      const ops = [
        // Optimistische Sperre: Update schlägt fehl, wenn das Item zwischenzeitlich geändert wurde.
        { op: 'test', path: '/rev', value: current.rev },
        ...Object.entries(fields).map(([name, value]) => ({
          op: 'add',
          path: `/fields/${name}`,
          value,
        })),
      ];

      const updated = await client.updateWorkItem(args.id, ops);
      return out({ updated: true, ...summarize(updated) });
    },
  },

  {
    name: 'devops_whoami',
    description: 'Zeigt, als welcher Benutzer die Assigned-to-me-Regel pro Tenant geprüft wird.',
    inputSchema: { type: 'object', properties: { ...tenantParams }, additionalProperties: false },
    handler: args => {
      const tenantCfg = resolveTenant(config, 'devops', args.company, args.tenant);
      return {
        company: tenantCfg.company,
        tenant: tenantCfg.tenant,
        editableOnlyIfAssignedTo: identityEmail(tenantCfg.userEmail),
        whitelistedProjects: tenantCfg.whitelistedProjects ?? [],
      };
    },
  },
];

new McpServer({ name: 'devops-safe', version: '1.0.0', tools }).start();
