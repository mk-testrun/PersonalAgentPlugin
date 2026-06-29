#!/usr/bin/env node
/**
 * anonymizer-proxy — transparent stdio JSON-RPC proxy.
 * Client → proxy → downstream MCP server.
 * Masks PII in results (downstream→client) and unmasks in args (client→downstream).
 *
 * Env:
 *   DOWNSTREAM_CMD        command for the downstream MCP server
 *   DOWNSTREAM_ARGS       JSON array of args (default [])
 *   PII_PATTERNS          path to pii-patterns.json (default: bundled)
 *   ANON_SALT             salt for deterministic hashing (default: "anon-salt")
 *   ANON_MAP_FILE         path for persistent pseudonym map
 *   UNMASK_RESULTS        "false" to skip unmask on client→downstream (default: "true")
 *
 * Robustheit: newline-delimited JSON-RPC-Framing; unparsbare Zeilen werden durchgereicht;
 * Block-PII fail-closed (JSON-RPC-Error); unerwartete Masker-Fehler crashen den Proxy nicht
 * (fail-closed + stderr-Log). Pseudonym-Map wird persistiert (ANON_MAP_FILE).
 */

import { createInterface } from 'readline';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { Masker, BlockedError } from './masker.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));

function loadPatterns() {
  const patternsFile = process.env.PII_PATTERNS ?? join(__dir, '..', 'pii-patterns.json');
  const raw = JSON.parse(readFileSync(patternsFile, 'utf8'));
  return raw;
}

function buildMasker() {
  const patterns = loadPatterns();
  return new Masker(
    patterns.anonymize,
    patterns.block,
    {
      salt: process.env.ANON_SALT ?? 'anon-salt',
      mapFile: process.env.ANON_MAP_FILE ?? '.copilot/state/pseudonym.map.json',
    }
  );
}

function jsonRpcError(id, code, message) {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
}

async function main() {
  const downstreamCmd = process.env.DOWNSTREAM_CMD;
  if (!downstreamCmd) {
    process.stderr.write('anonymizer-proxy: DOWNSTREAM_CMD not set\n');
    process.exit(1);
  }

  let downstreamArgs;
  try {
    downstreamArgs = JSON.parse(process.env.DOWNSTREAM_ARGS ?? '[]');
  } catch {
    downstreamArgs = [];
  }

  const masker = buildMasker();
  const unmaskResults = (process.env.UNMASK_RESULTS ?? 'true') !== 'false';

  // Spawn downstream
  const downstream = spawn(downstreamCmd, downstreamArgs, {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: { ...process.env },
  });

  downstream.on('error', err => {
    process.stderr.write(`anonymizer-proxy: downstream error: ${err.message}\n`);
    process.exit(1);
  });

  downstream.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  // Client → proxy (stdin)
  const clientReader = createInterface({ input: process.stdin, crlfDelay: Infinity });
  clientReader.on('line', (line) => {
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); } catch { return; }

    // For tools/call: unmask args, scan for raw block-PII
    if (msg.method === 'tools/call') {
      try {
        if (msg.params?.arguments) {
          masker.scanBlockDeep(msg.params.arguments); // fail-closed: raw block-PII from model
          if (unmaskResults) {
            msg.params.arguments = masker.unmaskDeep(msg.params.arguments);
          }
        }
      } catch (e) {
        if (e instanceof BlockedError) {
          const errLine = jsonRpcError(msg.id, -32001, `Blocked: ${e.category} detected in tool arguments`);
          process.stdout.write(errLine + '\n');
          return;
        }
        // Fail-closed: never forward args we could not safely process; do not crash the proxy.
        process.stderr.write(`anonymizer-proxy: mask error (args): ${e.message}\n`);
        process.stdout.write(jsonRpcError(msg.id, -32002, 'anonymizer-proxy: failed to process tool arguments') + '\n');
        return;
      }
    }

    try {
      downstream.stdin.write(JSON.stringify(msg) + '\n');
    } catch (e) {
      process.stderr.write(`anonymizer-proxy: downstream write failed: ${e.message}\n`);
    }
  });

  clientReader.on('close', () => {
    downstream.stdin.end();
  });

  // Downstream → proxy (stdout) → mask → client
  const downstreamReader = createInterface({ input: downstream.stdout, crlfDelay: Infinity });
  downstreamReader.on('line', (line) => {
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); } catch {
      process.stdout.write(line + '\n');
      return;
    }

    // Mask results coming from downstream
    try {
      if (msg.result !== undefined) {
        msg.result = masker.maskDeep(msg.result);
      }
    } catch (e) {
      if (e instanceof BlockedError) {
        const errLine = jsonRpcError(msg.id, -32001, `Blocked: ${e.category} detected in tool result`);
        process.stdout.write(errLine + '\n');
        return;
      }
      // Fail-closed: never emit an unmasked result; do not crash the proxy.
      process.stderr.write(`anonymizer-proxy: mask error (result): ${e.message}\n`);
      process.stdout.write(jsonRpcError(msg.id, -32002, 'anonymizer-proxy: failed to mask tool result') + '\n');
      return;
    }

    process.stdout.write(JSON.stringify(msg) + '\n');
  });
}

main();
