import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname as pathDirname } from 'path';
import { VALIDATORS } from './validators.mjs';

export class BlockedError extends Error {
  constructor(category) {
    super(`Blocked: PII category "${category}" detected`);
    this.category = category;
    this.name = 'BlockedError';
  }
}

export class Masker {
  /**
   * @param {Array<{name:string,regex:string,flags?:string,replace:string|null,validator?:string}>} anonymizePatterns
   * @param {Array<{name:string,regex:string,flags?:string,validator?:string}>} blockPatterns
   * @param {{salt?:string, mapFile?:string}} options
   *
   * `validator` verweist auf eine Checksummen-Prüfung in validators.mjs (iban/luhn/steuerid);
   * nur Regex-Treffer, die auch die Prüfziffer bestehen, gelten als PII.
   */
  constructor(anonymizePatterns, blockPatterns, { salt = 'default-salt', mapFile = null } = {}) {
    this._salt = salt;
    this._mapFile = mapFile;
    this._fwd = new Map(); // original → pseudonym
    this._rev = new Map(); // pseudonym → original
    const compile = p => {
      if (p.validator && !VALIDATORS[p.validator]) {
        throw new Error(`Unknown validator "${p.validator}" in pattern "${p.name}"`);
      }
      return { ...p, compiled: new RegExp(p.regex, p.flags ?? 'g'), validate: p.validator ? VALIDATORS[p.validator] : null };
    };
    this._anonymizePatterns = anonymizePatterns.map(compile);
    this._blockPatterns = blockPatterns.map(compile);
    // Early-out für unmask: wenn alle Pseudonym-Templates "<" enthalten (Standard: <Email_…>),
    // kann ein String ohne "<" kein Pseudonym enthalten — spart die _rev-Schleife pro String.
    this._canEarlyOut = anonymizePatterns.every(p => (p.replace ?? '').includes('<'));
    this._persistTimer = null;

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

  // Debounced: pro neuem Pseudonym sofort synchron zu schreiben skaliert nicht
  // (ein großes ADO-Ergebnis kann hunderte Treffer haben). 50 ms Sammelfenster.
  _persistMap() {
    if (!this._mapFile || this._persistTimer) return;
    this._persistTimer = setTimeout(() => { this._persistTimer = null; this._writeMap(); }, 50);
    this._persistTimer.unref?.();
  }

  /** Ausstehenden Persist sofort schreiben (Shutdown/Tests). */
  flush() {
    if (this._persistTimer) { clearTimeout(this._persistTimer); this._persistTimer = null; }
    this._writeMap();
  }

  _writeMap() {
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

  // true wenn das Pattern in str zuschlägt — mit Checksummen-Prüfung, falls konfiguriert
  _hits(pat, str) {
    pat.compiled.lastIndex = 0;
    if (!pat.validate) return pat.compiled.test(str);
    for (const m of str.matchAll(pat.compiled)) {
      if (pat.validate(m[0])) return true;
    }
    return false;
  }

  /** Replace a single string — mask PII, throw BlockedError on block-PII. */
  maskString(str) {
    // Check block patterns first (fail-closed)
    for (const pat of this._blockPatterns) {
      if (this._hits(pat, str)) throw new BlockedError(pat.name);
    }

    let result = str;
    for (const pat of this._anonymizePatterns) {
      pat.compiled.lastIndex = 0;
      result = result.replace(pat.compiled, (match) => {
        if (pat.validate && !pat.validate(match)) return match; // Checksumme falsch → kein PII
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
    if (this._rev.size === 0) return str;
    if (this._canEarlyOut && !str.includes('<')) return str; // kein Marker → kein Pseudonym
    let result = str;
    for (const [pseudonym, original] of this._rev) {
      result = result.split(pseudonym).join(original);
    }
    return result;
  }

  /** Scan for block-PII in args (client → downstream direction). Throws BlockedError. */
  scanBlockString(str) {
    for (const pat of this._blockPatterns) {
      if (this._hits(pat, str)) throw new BlockedError(pat.name);
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
