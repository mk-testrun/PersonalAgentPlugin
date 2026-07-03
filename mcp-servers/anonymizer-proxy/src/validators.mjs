/**
 * validators.mjs — Checksummen-Validatoren für PII-Regex-Treffer.
 *
 * Ein Regex allein produziert False Positives (z. B. matcht `\d{11}` jede ADO-ID
 * und jeden Timestamp). Patterns in pii-patterns.json können deshalb ein
 * `"validator"`-Feld tragen; nur Treffer, die auch die Prüfziffer bestehen,
 * gelten als PII (Vorbild: Microsoft Presidio, das Regex + checksum kombiniert).
 *
 * Anti-Ziel: Adress-/IPv6-Erkennung — bewusst außerhalb des Scopes.
 */

// IBAN-Längen je Land (nur die im Alltag relevanten; unbekannte Länder → nur mod-97).
const IBAN_LENGTHS = {
  DE: 22, AT: 20, CH: 21, LI: 21, LU: 20, NL: 18, BE: 16, FR: 27, IT: 27,
  ES: 24, PT: 25, GB: 22, IE: 22, DK: 18, SE: 24, NO: 15, FI: 18, PL: 28, CZ: 24,
};

/** ISO 13616 / mod-97: erste 4 Zeichen ans Ende, A=10..Z=35, Rest mod 97 === 1. */
export function iban(match) {
  const s = match.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  const expected = IBAN_LENGTHS[s.slice(0, 2)];
  if (expected && s.length !== expected) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const v = ch >= 'A' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1;
}

/** Luhn (ISO/IEC 7812) für Kreditkartennummern; toleriert Leerzeichen/Bindestriche. */
export function luhn(match) {
  const digits = match.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

/**
 * Deutsche Steuer-IdNr (§139b AO): 11 Ziffern, erste ≠ 0; in den ersten 10 Ziffern
 * kommt genau eine Ziffer doppelt ODER dreifach vor; Prüfziffer nach ISO 7064 MOD 11,10.
 */
export function steuerid(match) {
  const s = match.replace(/\s+/g, '');
  if (!/^\d{11}$/.test(s) || s[0] === '0') return false;
  const first10 = s.slice(0, 10);
  const counts = new Map();
  for (const d of first10) counts.set(d, (counts.get(d) ?? 0) + 1);
  const multiples = [...counts.values()].filter(c => c > 1);
  if (multiples.length !== 1 || multiples[0] > 3) return false;
  let product = 10;
  for (const ch of first10) {
    let sum = (Number(ch) + product) % 10;
    if (sum === 0) sum = 10;
    product = (sum * 2) % 11;
  }
  let check = 11 - product;
  if (check === 10) check = 0;
  return check === Number(s[10]);
}

export const VALIDATORS = { iban, luhn, steuerid };
