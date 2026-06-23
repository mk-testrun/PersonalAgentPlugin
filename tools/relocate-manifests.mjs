#!/usr/bin/env node
/**
 * Fallback: copies plugin.json from plugin root into .github/plugin/plugin.json
 * for CLI versions that expect manifests in .github/plugin/.
 * Usage: node tools/relocate-manifests.mjs <marketplace-path>
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const marketplacePath = process.argv[2];
if (!marketplacePath) {
  console.error('Usage: node tools/relocate-manifests.mjs <marketplace-path>');
  process.exit(1);
}

const absolutePath = resolve(marketplacePath);
const pluginsDir = join(absolutePath, 'plugins');

if (!existsSync(pluginsDir)) {
  console.error(`plugins/ directory not found in ${absolutePath}`);
  process.exit(1);
}

let relocated = 0;
const pluginDirs = readdirSync(pluginsDir).filter(d =>
  statSync(join(pluginsDir, d)).isDirectory()
);

for (const dir of pluginDirs) {
  const pluginRoot = join(pluginsDir, dir);
  const srcManifest = join(pluginRoot, 'plugin.json');
  const destDir = join(pluginRoot, '.github', 'plugin');
  const destManifest = join(destDir, 'plugin.json');

  if (!existsSync(srcManifest)) continue;

  mkdirSync(destDir, { recursive: true });
  writeFileSync(destManifest, readFileSync(srcManifest));
  console.log(`Relocated: ${dir}/plugin.json → ${dir}/.github/plugin/plugin.json`);
  relocated++;
}

console.log(`\nRelocated ${relocated} manifest(s).`);
