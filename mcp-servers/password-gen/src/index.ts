#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { randomInt, randomBytes } from 'crypto';

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
    // Fill remainder if rejection sampling ran out of bytes
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

const server = new McpServer({
  name: 'password-gen',
  version: '1.0.0',
});

server.tool(
  'generate_password',
  'Generate one or more cryptographically secure passwords.',
  {
    length:  z.number().int().min(8).max(128).default(20).describe('Password length (8–128)'),
    symbols: z.boolean().default(true).describe('Include symbol characters'),
    count:   z.number().int().min(1).max(20).default(1).describe('Number of passwords to generate'),
  },
  async ({ length, symbols, count }) => {
    const passwords = generatePassword(length, symbols, count);
    return {
      content: [{ type: 'text', text: passwords.join('\n') }],
    };
  }
);

server.tool(
  'generate_passphrase',
  'Generate a diceware-style passphrase.',
  {
    words:     z.number().int().min(3).max(12).default(5).describe('Number of words'),
    separator: z.string().max(3).default('-').describe('Word separator'),
  },
  async ({ words, separator }) => {
    const phrase = generatePassphrase(words, separator);
    return {
      content: [{ type: 'text', text: phrase }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
