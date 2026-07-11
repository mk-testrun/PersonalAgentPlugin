/**
 * Multi-Company/Multi-Tenant-Konfiguration für beide Extensions.
 *
 * Pfad zur Konfigurationsdatei kommt aus der Env-Variable AGENT_CONFIG.
 * Schema: siehe Test/config/companies.example.json
 *
 * - "company" = Firma (Multi-Company-Betrieb, z. B. eigener Arbeitgeber + Kunde)
 * - "tenant"  = Mandant innerhalb der Firma (z. B. ADO-Organisation oder Confluence-Site)
 *
 * Secrets (PATs, API-Tokens) stehen NIE in der Datei, sondern nur als Name der
 * Env-Variable (patEnv / apiTokenEnv), die den Wert enthält.
 */
import { readFileSync } from 'node:fs';
import { PolicyError } from './errors.mjs';

export function loadConfig(env = process.env) {
  const file = env.AGENT_CONFIG;
  if (!file) {
    throw new Error('AGENT_CONFIG ist nicht gesetzt (Pfad zur companies.json)');
  }
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`Konfiguration ${file} nicht lesbar: ${err.message}`);
  }
  if (!cfg.companies || typeof cfg.companies !== 'object') {
    throw new Error(`Konfiguration ${file}: Objekt "companies" fehlt`);
  }
  return cfg;
}

/**
 * Löst company + tenant für einen Dienst ("devops" | "confluence") auf.
 * Sind Firma bzw. Mandant eindeutig, dürfen die Parameter entfallen.
 */
export function resolveTenant(cfg, kind, company, tenant) {
  const companiesWithKind = Object.entries(cfg.companies).filter(([, c]) => c?.[kind]);
  if (companiesWithKind.length === 0) {
    throw new PolicyError(`keine Firma mit "${kind}"-Konfiguration vorhanden`);
  }

  let companyKey = company;
  if (!companyKey) {
    if (companiesWithKind.length === 1) {
      companyKey = companiesWithKind[0][0];
    } else {
      const names = companiesWithKind.map(([k]) => k).join(', ');
      throw new PolicyError(`mehrere Firmen konfiguriert (${names}) — Parameter "company" angeben`);
    }
  }
  const companyCfg = cfg.companies[companyKey]?.[kind];
  if (!companyCfg) {
    throw new PolicyError(`Firma "${companyKey}" hat keine ${kind}-Konfiguration`);
  }

  const tenants = companyCfg.tenants ?? {};
  const tenantKeys = Object.keys(tenants);
  if (tenantKeys.length === 0) {
    throw new PolicyError(`Firma "${companyKey}" hat keine ${kind}-Tenants konfiguriert`);
  }

  let tenantKey = tenant;
  if (!tenantKey) {
    if (tenantKeys.length === 1) {
      tenantKey = tenantKeys[0];
    } else {
      throw new PolicyError(
        `mehrere Tenants für "${companyKey}" (${tenantKeys.join(', ')}) — Parameter "tenant" angeben`
      );
    }
  }
  const tenantCfg = tenants[tenantKey];
  if (!tenantCfg) {
    throw new PolicyError(`unbekannter Tenant "${tenantKey}" für Firma "${companyKey}"`);
  }
  return { company: companyKey, tenant: tenantKey, ...tenantCfg };
}

/** Übersicht aller Firmen/Tenants eines Dienstes — ohne Secrets, für Discovery-Tools. */
export function listTenants(cfg, kind) {
  const out = [];
  for (const [companyKey, companyCfg] of Object.entries(cfg.companies)) {
    const tenants = companyCfg?.[kind]?.tenants ?? {};
    for (const [tenantKey, t] of Object.entries(tenants)) {
      const { patEnv, apiTokenEnv, ...rest } = t;
      out.push({ company: companyKey, tenant: tenantKey, ...rest });
    }
  }
  return out;
}

/** Liest ein Secret aus der in der Konfiguration benannten Env-Variable. */
export function requireSecret(envVarName, env = process.env) {
  if (!envVarName) throw new Error('Secret-Env-Variable ist in der Konfiguration nicht benannt');
  const value = env[envVarName];
  if (!value) throw new Error(`Env-Variable ${envVarName} ist nicht gesetzt`);
  return value;
}
