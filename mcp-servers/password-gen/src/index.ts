#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { randomBytes, randomUUID, createHash } from 'crypto';

const LOWERCASE = 'abcdefghjkmnpqrstuvwxyz'; // ambiguity-free (no i,l,o)
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I,O
const DIGITS    = '23456789';                  // no 0,1
const SYMBOLS   = '!@#$%^&*-_=+?';

const WORDLIST = [
  'alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel','india','juliet',
  'kilo','lima','mike','november','oscar','papa','quebec','romeo','sierra','tango',
  'uniform','victor','whiskey','xray','yankee','zulu','solar','lunar','river','ocean',
  'forest','storm','ember','frost','prism','quartz','ridge','vault','nexus','orbit',
  'pixel','cipher','token','beacon','bridge','canopy','drift','epoch','flare','grove',
];

function generatePassword(length: number, symbols: boolean, count: number): string[] {
  const charset = LOWERCASE + UPPERCASE + DIGITS + (symbols ? SYMBOLS : '');
  const results: string[] = [];
  for (let c = 0; c < count; c++) {
    const buf = randomBytes(length * 2);
    let pwd = '';
    let i = 0;
    while (pwd.length < length && i < buf.length) {
      const idx = buf[i] % charset.length;
      if (buf[i] < Math.floor(256 / charset.length) * charset.length) {
        pwd += charset[idx];
      }
      i++;
    }
    while (pwd.length < length) {
      const extra = randomBytes(4);
      const idx = extra.readUInt32BE(0) % charset.length;
      pwd += charset[idx];
    }
    results.push(pwd);
  }
  return results;
}

function generatePassphrase(words: number, separator: string): string {
  const chosen: string[] = [];
  const buf = randomBytes(words * 4);
  for (let i = 0; i < words; i++) {
    const idx = buf.readUInt32BE(i * 4) % WORDLIST.length;
    chosen.push(WORDLIST[idx]);
  }
  return chosen.join(separator);
}

// --- UUID v7 (time-ordered) — Node's randomUUID is v4 only ---
function uuidV7(time = Date.now()): string {
  const b = randomBytes(16);
  b[0] = Math.floor(time / 2 ** 40) & 0xff;
  b[1] = Math.floor(time / 2 ** 32) & 0xff;
  b[2] = Math.floor(time / 2 ** 24) & 0xff;
  b[3] = Math.floor(time / 2 ** 16) & 0xff;
  b[4] = Math.floor(time / 2 ** 8) & 0xff;
  b[5] = time & 0xff;
  b[6] = (b[6] & 0x0f) | 0x70; // version 7
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// --- ULID (Crockford base32: 48-bit time + 80-bit random = 26 chars) ---
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function ulid(time = Date.now()): string {
  let ts = '';
  let t = time;
  for (let i = 0; i < 10; i++) { ts = CROCKFORD[t % 32] + ts; t = Math.floor(t / 32); }
  let bits = 0n;
  for (const byte of randomBytes(10)) bits = (bits << 8n) | BigInt(byte);
  let rnd = '';
  for (let i = 0; i < 16; i++) { rnd = CROCKFORD[Number(bits & 31n)] + rnd; bits >>= 5n; }
  return ts + rnd;
}

// --- timezone-aware ISO-8601 (Z for UTC, ±HH:MM otherwise) ---
function isoInZone(date: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const offMin = Math.round((asUTC - date.getTime()) / 60000);
  const sign = offMin >= 0 ? '+' : '-';
  const oh = String(Math.floor(Math.abs(offMin) / 60)).padStart(2, '0');
  const om = String(Math.abs(offMin) % 60).padStart(2, '0');
  const zone = timeZone === 'UTC' ? 'Z' : `${sign}${oh}:${om}`;
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${zone}`;
}

function formatTime(timezone: string, format: string, now = new Date()): string {
  switch (format) {
    case 'unix':    return String(Math.floor(now.getTime() / 1000));
    case 'unix_ms': return String(now.getTime());
    case 'human':   return new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'long', timeZone: timezone }).format(now);
    case 'iso':
    case 'rfc3339': return isoInZone(now, timezone);
    default:        return isoInZone(now, timezone);
  }
}

const HASH_ALGOS = ['sha256', 'sha512', 'sha384', 'sha224', 'sha1', 'md5'] as const;
function hashValue(input: string, algorithm: string, encoding: 'hex' | 'base64' | 'base64url'): string {
  return createHash(algorithm).update(input, 'utf8').digest().toString(encoding);
}

const server = new McpServer({ name: 'password-gen', version: '1.1.0' });

server.tool(
  'generate_password',
  'Generate one or more cryptographically secure passwords.',
  {
    length:  z.number().int().min(8).max(128).default(20).describe('Password length (8–128)'),
    symbols: z.boolean().default(true).describe('Include symbol characters'),
    count:   z.number().int().min(1).max(20).default(1).describe('Number of passwords to generate'),
  },
  async ({ length, symbols, count }) => ({
    content: [{ type: 'text', text: generatePassword(length, symbols, count).join('\n') }],
  }),
);

server.tool(
  'generate_passphrase',
  'Generate a diceware-style passphrase.',
  {
    words:     z.number().int().min(3).max(12).default(5).describe('Number of words'),
    separator: z.string().max(3).default('-').describe('Word separator'),
  },
  async ({ words, separator }) => ({
    content: [{ type: 'text', text: generatePassphrase(words, separator) }],
  }),
);

server.tool(
  'generate_guid',
  'Generate a UUID. version v4 (random, default) or v7 (time-ordered, sortable).',
  {
    version: z.enum(['v4', 'v7']).default('v4').describe('UUID version'),
    count:   z.number().int().min(1).max(50).default(1).describe('How many'),
  },
  async ({ version, count }) => {
    const out = Array.from({ length: count }, () => (version === 'v7' ? uuidV7() : randomUUID()));
    return { content: [{ type: 'text', text: out.join('\n') }] };
  },
);

server.tool(
  'generate_ulid',
  'Generate a ULID (lexicographically sortable, Crockford base32, 26 chars).',
  {
    count: z.number().int().min(1).max(50).default(1).describe('How many'),
  },
  async ({ count }) => ({
    content: [{ type: 'text', text: Array.from({ length: count }, () => ulid()).join('\n') }],
  }),
);

server.tool(
  'current_time',
  'Current time in a given IANA timezone and format.',
  {
    timezone: z.string().default('UTC').describe('IANA zone, e.g. UTC, Europe/Berlin, America/New_York'),
    format:   z.enum(['iso', 'rfc3339', 'unix', 'unix_ms', 'human']).default('iso').describe('Output format'),
  },
  async ({ timezone, format }) => {
    try {
      const value = formatTime(timezone, format);
      return { content: [{ type: 'text', text: value }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Invalid timezone "${timezone}": ${e instanceof Error ? e.message : String(e)}` }], isError: true };
    }
  },
);

server.tool(
  'hash',
  'Hash a string. Algorithms: sha256/sha512/sha384/sha224/sha1/md5. Encodings: hex/base64/base64url.',
  {
    input:     z.string().describe('Text to hash'),
    algorithm: z.enum(HASH_ALGOS).default('sha256').describe('Hash algorithm'),
    encoding:  z.enum(['hex', 'base64', 'base64url']).default('hex').describe('Digest encoding'),
  },
  async ({ input, algorithm, encoding }) => ({
    content: [{ type: 'text', text: hashValue(input, algorithm, encoding) }],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
