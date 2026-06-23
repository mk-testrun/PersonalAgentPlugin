import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname as pathDirname } from 'path';

export class BlockedError extends Error {
  constructor(category) {
    super(`Blocked: PII category "${category}" detected`);
    this.category = category;
    this.name = 'BlockedError';
  }
}

export class Masker {
  /**
   * @param {Array<{name:string,regex:string,flags?:string,replace:string|null}>} anonymizePatterns
   * @param {Array<{name:string,regex:string,flags?:string}>} blockPatterns
   * @param {{salt?:string, mapFile?:string}} options
   */
  constructor(anonymizePatterns, blockPatterns, { salt = 'default-salt', mapFile = null } = {}) {
    this._salt = salt;
    this._mapFile = mapFile;
    this._fwd = new Map(); // original → pseudonym
    this._rev = new Map(); // pseudonym → original
    this._anonymizePatterns = anonymizePatterns.map(p => ({
      ...p,
      compiled: new RegExp(p.regex, p.flags ?? 'g'),
    }));
    this._blockPatterns = blockPatterns.map(p => ({
      ...p,
      compiled: new RegExp(p.regex, p.flags ?? 'g'),
    }));

    if (mapFile && existsSync(mapFile)) {
      try {
        const saved = JSON.parse(readFileSync(mapFile, 'utf8'));
        for (const [k, v] of Object.entries(saved.fwd ?? {})) this._fwd.set(k, v);
        for (const [k, v] of Object.entries(saved.rev ?? {})) this._rev.set(k, v);
      } catch {
        // corrupt map → start fresh
      }
    }
  }

  _hash(input, length) {
    return createHash('sha256').update(this._salt + '|' + input).digest('hex').slice(0, length);
  }

  _makePseudonym(original, template) {
    const base = template.replace(/\{hash:(\d+)\}/g, (_, n) => this._hash(original, Number(n)));
    if (!this._rev.has(base)) return base;
    // Collision: add incremental suffix
    let i = 2;
    while (this._rev.has(`${base}_${i}`) && this._rev.get(`${base}_${i}`) !== original) i++;
    return `${base}_${i}`;
  }

  _persistMap() {
    if (!this._mapFile) return;
    try {
      const dir = pathDirname(this._mapFile);
      mkdirSync(dir, { recursive: true });
      writeFileSync(this._mapFile, JSON.stringify({
        fwd: Object.fromEntries(this._fwd),
        rev: Object.fromEntries(this._rev),
      }, null, 2));
    } catch {
      // best effort
    }
  }

  /** Replace a single string — mask PII, throw BlockedError on block-PII. */
  maskString(str) {
    // Check block patterns first (fail-closed)
    for (const pat of this._blockPatterns) {
      pat.compiled.lastIndex = 0;
      if (pat.compiled.test(str)) {
        throw new BlockedError(pat.name);
      }
    }

    let result = str;
    for (const pat of this._anonymizePatterns) {
      pat.compiled.lastIndex = 0;
      result = result.replace(pat.compiled, (match) => {
        if (this._fwd.has(match)) return this._fwd.get(match);
        const pseudonym = this._makePseudonym(match, pat.replace);
        this._fwd.set(match, pseudonym);
        this._rev.set(pseudonym, match);
        this._persistMap();
        return pseudonym;
      });
    }
    return result;
  }

  /** Reverse-replace pseudonyms → originals in a string. */
  unmaskString(str) {
    let result = str;
    for (const [pseudonym, original] of this._rev) {
      result = result.split(pseudonym).join(original);
    }
    return result;
  }

  /** Scan for block-PII in args (client → downstream direction). Throws BlockedError. */
  scanBlockString(str) {
    for (const pat of this._blockPatterns) {
      pat.compiled.lastIndex = 0;
      if (pat.compiled.test(str)) {
        throw new BlockedError(pat.name);
      }
    }
  }

  // Deep recursive traversal over any JSON-serializable value
  maskDeep(value) {
    if (typeof value === 'string') return this.maskString(value);
    if (Array.isArray(value)) return value.map(v => this.maskDeep(v));
    if (value !== null && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = this.maskDeep(v);
      return out;
    }
    return value;
  }

  unmaskDeep(value) {
    if (typeof value === 'string') return this.unmaskString(value);
    if (Array.isArray(value)) return value.map(v => this.unmaskDeep(v));
    if (value !== null && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = this.unmaskDeep(v);
      return out;
    }
    return value;
  }

  scanBlockDeep(value) {
    if (typeof value === 'string') { this.scanBlockString(value); return; }
    if (Array.isArray(value)) { value.forEach(v => this.scanBlockDeep(v)); return; }
    if (value !== null && typeof value === 'object') {
      Object.values(value).forEach(v => this.scanBlockDeep(v));
    }
  }
}
