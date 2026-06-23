/**
 * scheduler.test.mjs — tests scheduler logic without real timers.
 * Imports the compiled JS from dist/. Run after `npm run build`.
 */
import assert from 'node:assert/strict';
import { existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const distScheduler = join(__dir, '..', 'dist', 'scheduler.js');

if (!existsSync(distScheduler)) {
  console.error('dist/scheduler.js not found — run npm run build first');
  process.exit(1);
}

const { Scheduler } = await import(distScheduler);

const STORE = join(__dir, 'test-alarms.json');
// Clean up any previous test store
if (existsSync(STORE)) unlinkSync(STORE);

const s = new Scheduler(STORE);

// Test 1: set alarm → list → cancel
{
  const futureISO = new Date(Date.now() + 3600_000).toISOString();
  const alarm = s.setAlarm(futureISO, 'Test Alarm');
  assert.ok(alarm.id, 'Alarm should have an id');
  assert.equal(alarm.label, 'Test Alarm');
  assert.equal(alarm.cancelled, false);

  const list = s.listAlarms();
  assert.ok(list.some(a => a.id === alarm.id), 'Alarm should appear in list');

  const ok = s.cancelAlarm(alarm.id);
  assert.equal(ok, true, 'Cancel should succeed');

  const listAfter = s.listAlarms();
  assert.ok(!listAfter.some(a => a.id === alarm.id), 'Alarm should not appear after cancel');
  console.log('✓ Test 1: set → list → cancel');
}

// Test 2: set timer → check isDue
{
  const timer = s.setTimer(3600, 'Test Timer');
  assert.equal(timer.type, 'timer');
  assert.equal(s.isDue(timer), false, 'Timer 1h out should not be due yet');

  // Simulate past alarm
  const pastAlarm = { ...timer, fireAt: new Date(Date.now() - 1000).toISOString(), cancelled: false };
  assert.equal(s.isDue(pastAlarm), true, 'Past alarm should be due');
  console.log('✓ Test 2: timer isDue logic');
}

// Test 3: cancel non-existing id → false
{
  const ok = s.cancelAlarm('nonexistent-id');
  assert.equal(ok, false);
  console.log('✓ Test 3: cancel non-existing id');
}

// Test 4: HH:MM alarm time parsing (≥ now → tomorrow)
{
  const alarm = s.setAlarm('23:59', 'Late Alarm');
  const fireAt = new Date(alarm.fireAt);
  assert.ok(fireAt > new Date(), 'Alarm at 23:59 should be in the future');
  s.cancelAlarm(alarm.id);
  console.log('✓ Test 4: HH:MM time parsing');
}

// Test 5: Invalid time throws
{
  assert.throws(() => s.setAlarm('not-a-time', 'Bad'), /Invalid time/);
  console.log('✓ Test 5: Invalid time throws');
}

// Cleanup
if (existsSync(STORE)) unlinkSync(STORE);

console.log('\nAll scheduler tests passed.');
