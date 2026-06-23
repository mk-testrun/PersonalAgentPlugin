import assert from 'node:assert/strict';
import { Masker, BlockedError } from '../src/masker.mjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const patterns = JSON.parse(readFileSync(join(__dir, '..', 'pii-patterns.json'), 'utf8'));

function makeMasker(salt = 'test-salt') {
  return new Masker(patterns.anonymize, patterns.block, { salt });
}

// Test 1: Round-trip — mask result name → pseudonym, then unmask arg with pseudonym → original
{
  const masker = makeMasker('rt-salt');
  const original = 'Frau Maria Müller arbeitet hier.';
  const masked = masker.maskDeep({ text: original });
  assert.ok(masked.text !== original, 'Should have masked the name');
  assert.ok(masked.text.includes('<PERSON_'), `Pseudonym should start with <PERSON_: got ${masked.text}`);

  // Extract pseudonym and unmask it
  const pseudonymMatch = masked.text.match(/<PERSON_[a-f0-9]+>/);
  assert.ok(pseudonymMatch, 'Should have a PERSON pseudonym in result');
  const pseudonym = pseudonymMatch[0];

  const unmasked = masker.unmaskDeep({ arg: `Please update ${pseudonym}` });
  assert.ok(unmasked.arg.includes('Maria Müller'), `Should unmask back to original: ${unmasked.arg}`);
  console.log('✓ Test 1: Round-trip mask/unmask across directions');
}

// Test 2: Determinism — same input → same pseudonym
{
  const masker1 = makeMasker('det-salt');
  const masker2 = makeMasker('det-salt');
  const text = 'Kontakt: Herr Klaus Schmidt bitte melden';
  const r1 = masker1.maskString(text);
  const r2 = masker2.maskString(text);
  assert.equal(r1, r2, 'Same salt + same input → same pseudonym');
  console.log('✓ Test 2: Determinism');
}

// Test 3: Block — maskDeep with IBAN → BlockedError
{
  const masker = makeMasker();
  const textWithIBAN = 'Bitte überweise auf DE89370400440532013000 bis Freitag';
  assert.throws(
    () => masker.maskDeep({ result: textWithIBAN }),
    (err) => err instanceof BlockedError && err.category === 'IBAN',
    'Should throw BlockedError for IBAN'
  );
  console.log('✓ Test 3: Block on IBAN in maskDeep');
}

// Test 4: scanBlockDeep — arg with Steuer-ID → BlockedError
{
  const masker = makeMasker();
  assert.throws(
    () => masker.scanBlockDeep({ query: 'Steuer-ID ist 12345678901' }),
    (err) => err instanceof BlockedError && err.category === 'SteuerID',
    'Should throw BlockedError for SteuerID in scanBlockDeep'
  );
  console.log('✓ Test 4: scanBlockDeep on Steuer-ID');
}

// Test 5: Non-PII unchanged
{
  const masker = makeMasker();
  const clean = 'Die Funktion gibt einen Integer zurück.';
  const result = masker.maskDeep(clean);
  assert.equal(result, clean, 'Non-PII text should pass through unchanged');
  console.log('✓ Test 5: Non-PII unchanged');
}

// Test 6: Email masking
{
  const masker = makeMasker('email-salt');
  const text = 'Sende an john.doe@example.com';
  const masked = masker.maskString(text);
  assert.ok(!masked.includes('john.doe@example.com'), 'Email should be masked');
  assert.ok(masked.includes('<'), 'Should have a pseudonym token');
  console.log('✓ Test 6: Email masking');
}

console.log('\nAll roundtrip tests passed.');
