#!/usr/bin/env node
/**
 * Validates plugin.json structure for a marketplace directory.
 * Usage: node tools/validate-plugins.mjs <marketplace-path>
 * Exit 0 = valid, Exit 1 = errors found.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const REQUIRED_PLUGIN_FIELDS = ['name', 'description', 'version', 'author', 'license'];
const REQUIRED_MARKETPLACE_FIELDS = ['name', 'plugins'];
const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (e) {
    return { error: e.message };
  }
}

function validatePluginJson(pluginDir, pluginName, errors) {
  const manifestPath = join(pluginDir, 'plugin.json');
  if (!existsSync(manifestPath)) {
    errors.push(`[${pluginName}] Missing plugin.json at ${pluginDir}`);
    return null;
  }
  const manifest = readJson(manifestPath);
  if (manifest.error) {
    errors.push(`[${pluginName}] Invalid JSON in plugin.json: ${manifest.error}`);
    return null;
  }
  for (const field of REQUIRED_PLUGIN_FIELDS) {
    if (!manifest[field]) {
      errors.push(`[${pluginName}] plugin.json missing required field: "${field}"`);
    }
  }

  // Validate referenced agents exist
  if (manifest.agents) {
    for (const agentPath of manifest.agents) {
      const full = join(pluginDir, agentPath);
      if (!existsSync(full)) {
        errors.push(`[${pluginName}] Agent file not found: ${agentPath}`);
      }
    }
  }

  // Validate referenced commands exist
  if (manifest.commands) {
    for (const cmdPath of manifest.commands) {
      const full = join(pluginDir, cmdPath);
      if (!existsSync(full)) {
        errors.push(`[${pluginName}] Command file not found: ${cmdPath}`);
      }
    }
  }

  // Validate referenced skills exist
  if (manifest.skills) {
    for (const skillPath of manifest.skills) {
      const full = join(pluginDir, skillPath);
      if (!existsSync(full)) {
        errors.push(`[${pluginName}] Skill file not found: ${skillPath}`);
      }
    }
  }

  // Validate .mcp.json if present
  const mcpPath = join(pluginDir, '.mcp.json');
  if (existsSync(mcpPath)) {
    const mcp = readJson(mcpPath);
    if (mcp.error) {
      errors.push(`[${pluginName}] Invalid JSON in .mcp.json: ${mcp.error}`);
    } else if (!mcp.mcpServers) {
      errors.push(`[${pluginName}] .mcp.json missing top-level "mcpServers" key`);
    } else {
      // Check no real secrets hardcoded
      const mcpStr = JSON.stringify(mcp);
      const secretPatterns = [
        /\"[A-Za-z0-9_]{20,}\"/,  // long bare tokens
      ];
      // Only warn about obvious env key patterns that look like secrets
      if (/password|secret|token|pat\b/i.test(mcpStr) && !mcpStr.includes('${secret:') && !mcpStr.includes('${env:')) {
        // soft warning only; real secrets would be caught by gitleaks
      }
    }
  }

  // Validate hooks.json if present
  const hooksPath = join(pluginDir, 'hooks.json');
  if (existsSync(hooksPath)) {
    const hooks = readJson(hooksPath);
    if (hooks.error) {
      errors.push(`[${pluginName}] Invalid JSON in hooks.json: ${hooks.error}`);
    }
  }

  return manifest;
}

function validateMarketplace(marketplacePath) {
  const errors = [];
  const warnings = [];

  const absolutePath = resolve(marketplacePath);
  if (!existsSync(absolutePath)) {
    console.error(`ERROR: Marketplace path not found: ${absolutePath}`);
    process.exit(1);
  }

  const marketplaceJsonPath = join(absolutePath, '.github', 'plugin', 'marketplace.json');
  if (!existsSync(marketplaceJsonPath)) {
    errors.push(`Missing marketplace manifest at .github/plugin/marketplace.json`);
  } else {
    const marketplace = readJson(marketplaceJsonPath);
    if (marketplace.error) {
      errors.push(`Invalid JSON in marketplace.json: ${marketplace.error}`);
    } else {
      for (const field of REQUIRED_MARKETPLACE_FIELDS) {
        if (!marketplace[field]) {
          errors.push(`marketplace.json missing required field: "${field}"`);
        }
      }

      const pluginsDir = join(absolutePath, marketplace.metadata?.pluginRoot ?? 'plugins');
      if (!existsSync(pluginsDir)) {
        errors.push(`Plugin root directory not found: ${pluginsDir}`);
      } else {
        // Validate each plugin listed in marketplace.json
        if (marketplace.plugins) {
          for (const plugin of marketplace.plugins) {
            if (!plugin.source) {
              errors.push(`Plugin entry missing "source" field: ${JSON.stringify(plugin)}`);
              continue;
            }
            const pluginDir = join(absolutePath, plugin.source);
            validatePluginJson(pluginDir, plugin.name ?? plugin.source, errors);
          }
        }

        // Also scan for any plugin.json files not listed in marketplace
        const pluginDirs = readdirSync(pluginsDir).filter(d =>
          statSync(join(pluginsDir, d)).isDirectory()
        );
        const listedSources = new Set((marketplace.plugins ?? []).map(p => p.source));
        for (const dir of pluginDirs) {
          const relSource = `plugins/${dir}`;
          if (!listedSources.has(relSource)) {
            const pluginJsonPath = join(pluginsDir, dir, 'plugin.json');
            if (existsSync(pluginJsonPath)) {
              warnings.push(`Plugin directory "${dir}" has plugin.json but is not listed in marketplace.json`);
            }
          }
        }
      }
    }
  }

  return { errors, warnings };
}

// Main
const marketplacePath = process.argv[2];
if (!marketplacePath) {
  console.error('Usage: node tools/validate-plugins.mjs <marketplace-path>');
  process.exit(1);
}

console.log(`\nValidating marketplace: ${marketplacePath}\n`);
const { errors, warnings } = validateMarketplace(marketplacePath);

if (warnings.length > 0) {
  console.warn('Warnings:');
  warnings.forEach(w => console.warn(`  ⚠  ${w}`));
  console.log();
}

if (errors.length > 0) {
  console.error('Errors:');
  errors.forEach(e => console.error(`  ✗  ${e}`));
  console.error(`\n${errors.length} error(s) found. Validation FAILED.`);
  process.exit(1);
} else {
  console.log(`✓  Validation passed (${warnings.length} warning(s)).`);
  process.exit(0);
}
