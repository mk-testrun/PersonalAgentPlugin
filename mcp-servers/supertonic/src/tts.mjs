/**
 * tts.mjs — pure, testable TTS logic for the supertonic MCP server.
 *
 * Supertonic is an on-device TTS whose Python SDK ships `supertonic serve`, a local HTTP server
 * exposing an OpenAI-compatible `/v1/audio/speech` endpoint. This module builds the request,
 * resolves output paths safely, and performs synthesis — with fs/fetch injectable for tests.
 * On-device → no API key.
 */
import { writeFile as fsWriteFile, mkdir as fsMkdir } from 'fs/promises';
import { join, resolve, sep, extname } from 'path';

export const errMsg = e => (e instanceof Error ? e.message : String(e));

// format → file extension. Whitelist doubles as validation (OpenAI /v1/audio/speech response_format).
export const FORMATS = { mp3: 'mp3', wav: 'wav', opus: 'opus', flac: 'flac', pcm: 'pcm', aac: 'aac' };
const DEFAULT_BASE_URL = 'http://127.0.0.1:8000';

export function resolveConfig(env = {}) {
  const base = (env.ST_BASE_URL || '').trim() || DEFAULT_BASE_URL;
  return {
    baseUrl: base.replace(/\/+$/, ''),               // strip trailing slash(es)
    voice: (env.ST_DEFAULT_VOICE || '').trim() || 'default',
    model: (env.ST_MODEL || '').trim() || 'supertonic',
    outDir: (env.ST_OUTPUT_DIR || '').trim() || process.cwd(),
    timeoutMs: Number(env.ST_TIMEOUT_MS) > 0 ? Number(env.ST_TIMEOUT_MS) : 30000,
  };
}

/** Build the OpenAI-compatible /v1/audio/speech request. Throws on invalid input. */
export function buildSpeechRequest(text, opts = {}, cfg) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('text is required and must be a non-empty string');
  }
  const format = (opts.format || 'mp3').toLowerCase();
  if (!FORMATS[format]) {
    throw new Error(`unsupported format "${format}" (allowed: ${Object.keys(FORMATS).join(', ')})`);
  }
  const voice = (opts.voice || cfg.voice || 'default').trim();
  return {
    url: `${cfg.baseUrl}/v1/audio/speech`,
    format,
    body: { model: cfg.model, input: text, voice, response_format: format },
  };
}

/** Resolve a safe output path under cfg.outDir. Sanitizes filename and blocks path traversal. */
export function outputPath(cfg, opts = {}, format = 'mp3') {
  const ext = FORMATS[format] || 'mp3';
  let name = (opts.filename || `tts-${Date.now()}.${ext}`).trim();
  // strip any directory components and unsafe chars — no traversal, no nesting
  name = name.split(/[\\/]/).pop().replace(/[^A-Za-z0-9._-]/g, '_');
  if (!name || name === '.' || name === '..') name = `tts-${Date.now()}.${ext}`;
  if (extname(name).toLowerCase() !== `.${ext}`) name = `${name}.${ext}`;
  const outDir = resolve(cfg.outDir);
  const full = resolve(join(outDir, name));
  if (full !== outDir && !full.startsWith(outDir + sep)) {
    throw new Error('resolved output path escapes the output directory');
  }
  return full;
}

/**
 * Synthesize text → audio file via `supertonic serve`. Returns { path, bytes }.
 * deps lets tests inject fetch/fs without touching the network or disk-at-large.
 */
export async function synthesize(text, opts = {}, cfg, deps = {}) {
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  const writeFile = deps.writeFile || fsWriteFile;
  const mkdir = deps.mkdir || fsMkdir;
  if (typeof fetchImpl !== 'function') throw new Error('global fetch unavailable — Node >= 20 required');

  const req = buildSpeechRequest(text, opts, cfg);
  const path = outputPath(cfg, opts, req.format);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), cfg.timeoutMs);
  let res;
  try {
    res = await fetchImpl(req.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: ac.signal,
    });
  } catch (e) {
    const m = errMsg(e);
    throw new Error(
      `could not reach supertonic at ${cfg.baseUrl} (${m}). ` +
      `Start it first:  pip install supertonic && supertonic serve`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = '';
    try { detail = (await res.text()).slice(0, 200); } catch { /* ignore */ }
    throw new Error(`supertonic serve returned ${res.status} ${res.statusText}${detail ? `: ${detail}` : ''}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error('supertonic returned an empty audio body');
  await mkdir(cfg.outDir, { recursive: true });
  await writeFile(path, buf);
  return { path, bytes: buf.length };
}
