/**
 * pii-patterns.test.mjs — Known-Answer-Vektoren für Checksummen-Validatoren + Pattern-Präzision.
 *
 * Prüft beides: (1) die Validatoren isoliert gegen veröffentlichte Testnummern,
 * (2) das Zusammenspiel Regex+Validator im Masker — ein Regex-Treffer mit falscher
 * Prüfziffer darf NICHT blocken/maskieren (False-Positive-Schutz).
 * Run: node test/pii-patterns.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { iban, luhn, steuerid } from '../src/validators.mjs';
import { Masker, BlockedError } from '../src/masker.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const patterns = JSON.parse(readFileSync(join(__dir, '..', 'pii-patterns.json'), 'utf8'));
const makeMasker = () => new Masker(patterns.anonymize, patterns.block, { salt: 'pii-test' });

let n = 0; const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`); };

// --- IBAN (ISO 13616 mod-97) ---
t('iban: bekannte Test-IBANs (DE/GB) gültig, auch mit Leerzeichen', () => {
  assert.ok(iban('DE89370400440532013000'));
  assert.ok(iban('DE89 3704 0044 0532 0130 00'));
  assert.ok(iban('GB82WEST12345698765432'));
});
t('iban: eine geänderte Ziffer → ungültig; falsche Länge fürs Land → ungültig', () => {
  assert.ok(!iban('DE89370400440532013001'));
  assert.ok(!iban('DE8937040044053201300'));  // 21 statt 22 Zeichen
  assert.ok(!iban('XX00NOTANIBAN123456'));
});

// --- Luhn (Kreditkarten) ---
t('luhn: Visa/Stripe-Testkarten gültig (auch formatiert)', () => {
  assert.ok(luhn('4111111111111111'));
  assert.ok(luhn('4242 4242 4242 4242'));
  assert.ok(luhn('5555-5555-5555-4444'));
});
t('luhn: letzte Ziffer geändert → ungültig; zu kurz → ungültig', () => {
  assert.ok(!luhn('4111111111111112'));
  assert.ok(!luhn('123456789012'));
});

// --- Steuer-IdNr (ISO 7064 MOD 11,10 + Strukturregeln) ---
t('steuerid: kursierende Testnummern gültig', () => {
  for (const id of ['86095742719', '65929970489', '57549285017', '25768131411']) {
    assert.ok(steuerid(id), `${id} sollte gültig sein`);
  }
});
t('steuerid: falsche Prüfziffer, führende 0, alle Ziffern verschieden → ungültig', () => {
  assert.ok(!steuerid('86095742710'));  // Prüfziffer geändert
  assert.ok(!steuerid('06095742719'));  // führende 0
  assert.ok(!steuerid('12345678903'));  // erste 10 alle verschieden → Strukturregel verletzt
});

// --- Masker-Integration: Regex-Treffer ohne gültige Prüfziffer sind KEIN PII ---
t('masker: 11-stellige Nicht-SteuerID (z. B. unix_ms/ADO-ID) blockt nicht mehr', () => {
  const m = makeMasker();
  const out = m.maskDeep({ text: 'Timestamp 17829936000 und Build 12345678901.' });
  assert.ok(out.text.includes('17829936000'), 'harmlose 11-stellige Zahl unverändert');
});
t('masker: echte SteuerID blockt (fail-closed)', () => {
  const m = makeMasker();
  assert.throws(() => m.maskDeep({ text: 'IdNr: 86095742719' }), BlockedError);
});
t('masker: echte IBAN blockt, Zufallsstring in IBAN-Form nicht', () => {
  const m = makeMasker();
  assert.throws(() => m.maskDeep({ text: 'Konto DE89370400440532013000' }), BlockedError);
  const out = m.maskDeep({ text: 'Ticket-Key DE99ABCDEF12345678901234 ist kein Konto.' });
  assert.ok(out.text.includes('DE99ABCDEF12345678901234'));
});
t('masker: Kreditkarte (Luhn-gültig) blockt, Luhn-ungültige Ziffernfolge nicht', () => {
  const m = makeMasker();
  assert.throws(() => m.maskDeep({ text: 'Karte 4242 4242 4242 4242' }), BlockedError);
  const out = m.maskDeep({ text: 'Seriennummer 4111 1111 1111 1112 ok.' });
  assert.ok(out.text.includes('4111 1111 1111 1112'));
});

// --- neue/geschärfte Anonymize-Patterns ---
t('masker: IPv4 wird pseudonymisiert, Versionsstring 1.2.3 nicht', () => {
  const m = makeMasker();
  const out = m.maskDeep({ text: 'Server 192.168.178.42 läuft chart.js 1.2.3.' });
  assert.ok(!out.text.includes('192.168.178.42'));
  assert.ok(out.text.includes('<IP_'));
  assert.ok(out.text.includes('1.2.3'));
});
t('masker: PhoneDE matcht +49-Nummern, aber keine langen Ziffernläufe', () => {
  const m = makeMasker();
  const masked = m.maskDeep({ text: 'Ruf an: +49 30 12345678.' });
  assert.ok(masked.text.includes('<Phone_'), masked.text);
  const untouched = m.maskDeep({ text: 'Hash 0123456789012345678901234567890123456789 bleibt.' });
  assert.ok(untouched.text.includes('0123456789012345678901234567890123456789'));
});
t('masker: unbekannter validator-Name → Konstruktor wirft (fail-fast)', () => {
  assert.throws(() => new Masker([], [{ name: 'x', regex: 'y', validator: 'nope' }]), /Unknown validator/);
});

console.log(`\nAll pii-pattern tests passed (${n} checks).`);
