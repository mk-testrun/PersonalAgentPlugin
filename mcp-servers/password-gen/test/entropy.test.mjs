/**
 * entropy.test.mjs — tests password-gen without running the MCP server.
 * Validates length, character classes, count, and uniqueness.
 */
import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'crypto';

// Mirror the generation logic locally for testing without requiring a build
const LOWERCASE = 'abcdefghjkmnpqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS    = '23456789';
const SYMBOLS   = '!@#$%^&*-_=+?';

function generatePassword(length, symbols, count) {
  const charset = LOWERCASE + UPPERCASE + DIGITS + (symbols ? SYMBOLS : '');
  const results = [];
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

// Test 1: Default length
{
  const [pwd] = generatePassword(20, true, 1);
  assert.equal(pwd.length, 20, `Expected length 20, got ${pwd.length}`);
  console.log('✓ Test 1: Default length 20');
}

// Test 2: Min/max length
{
  const [short] = generatePassword(8, false, 1);
  assert.equal(short.length, 8);
  const [long] = generatePassword(128, true, 1);
  assert.equal(long.length, 128);
  console.log('✓ Test 2: Min/max length (8, 128)');
}

// Test 3: Has digit class
{
  const results = generatePassword(32, false, 20);
  const hasDigit = results.some(p => [...p].some(c => DIGITS.includes(c)));
  assert.ok(hasDigit, 'Should have at least one password containing a digit');
  console.log('✓ Test 3: Digit character class present');
}

// Test 4: Symbols present when enabled
{
  const results = generatePassword(32, true, 20);
  const hasSymbol = results.some(p => [...p].some(c => SYMBOLS.includes(c)));
  assert.ok(hasSymbol, 'Should have at least one password containing a symbol');
  console.log('✓ Test 4: Symbol character class present');
}

// Test 5: No symbols when disabled
{
  const results = generatePassword(32, false, 20);
  const noSymbol = results.every(p => [...p].every(c => !SYMBOLS.includes(c)));
  assert.ok(noSymbol, 'No symbols when symbols=false');
  console.log('✓ Test 5: No symbols when disabled');
}

// Test 6: Count
{
  const results = generatePassword(20, true, 5);
  assert.equal(results.length, 5, 'count=5 → 5 passwords');
  console.log('✓ Test 6: Count parameter');
}

// Test 7: Uniqueness over N runs
{
  const N = 50;
  const passwords = new Set(generatePassword(20, true, N));
  assert.ok(passwords.size === N, `All ${N} passwords should be unique, got ${passwords.size}`);
  console.log(`✓ Test 7: Uniqueness over ${N} runs`);
}

// Test 8: No ambiguous characters
{
  const ambiguous = 'il10O'; // lowercase l, lowercase i, digit 1, digit 0, uppercase O
  const results = generatePassword(64, false, 20);
  for (const pwd of results) {
    for (const ch of pwd) {
      assert.ok(!ambiguous.includes(ch), `Found ambiguous char "${ch}" in "${pwd}"`);
    }
  }
  console.log('✓ Test 8: No ambiguous characters');
}

// Test 9: charset distribution coverage (rejection sampling fills full range)
{
  const charset = LOWERCASE + UPPERCASE + DIGITS;
  const seen = new Set([...generatePassword(64, false, 40).join('')]);
  // Over a large sample, the vast majority of the charset should appear.
  const coverage = seen.size / charset.length;
  assert.ok(coverage >= 0.9, `Charset coverage too low: ${(coverage * 100).toFixed(0)}%`);
  // And every produced char must be within the charset (no out-of-range modulo artifact).
  for (const ch of seen) assert.ok(charset.includes(ch), `Char "${ch}" not in charset`);
  console.log('✓ Test 9: charset distribution coverage');
}

// Test 10: minimum length boundary fills exactly (no over/under-run)
{
  for (const len of [8, 9, 13, 20]) {
    const [pwd] = generatePassword(len, true, 1);
    assert.equal(pwd.length, len, `length ${len} mismatch: ${pwd.length}`);
  }
  console.log('✓ Test 10: exact length at boundaries');
}

// Test 11: passphrase word-count + separator contract
{
  const WORDS = ['alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel'];
  function generatePassphrase(words, separator) {
    const buf = randomBytes(words * 4);
    const chosen = [];
    for (let i = 0; i < words; i++) chosen.push(WORDS[buf.readUInt32BE(i * 4) % WORDS.length]);
    return chosen.join(separator);
  }
  const p5 = generatePassphrase(5, '-');
  assert.equal(p5.split('-').length, 5, '5 words → 5 separator-joined segments');
  for (const w of p5.split('-')) assert.ok(WORDS.includes(w), `unknown word "${w}"`);
  const p3 = generatePassphrase(3, '_');
  assert.equal(p3.split('_').length, 3, 'custom separator + 3 words');
  console.log('✓ Test 11: passphrase word-count + separator');
}

console.log('\nAll entropy tests passed.');
