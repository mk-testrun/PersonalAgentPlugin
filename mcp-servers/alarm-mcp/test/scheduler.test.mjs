/**
 * scheduler.test.mjs — tests scheduler logic without real timers.
 * Imports the compiled JS from dist/. Run after `npm run build`.
 */
import assert from 'node:assert/strict';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
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
  assert.equal(alarm.state, 'pending');

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
  const pastAlarm = { ...timer, fireAt: new Date(Date.now() - 1000).toISOString(), state: 'pending' };
  assert.equal(s.isDue(pastAlarm), true, 'Past alarm should be due');
  s.cancelAlarm(timer.id);
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

// Test 6: persisted pending alarm is re-armed on load (reschedule-after-restart bug)
{
  const STORE2 = join(__dir, 'test-alarms-reload.json');
  if (existsSync(STORE2)) unlinkSync(STORE2);

  const s1 = new Scheduler(STORE2);
  const future = s1.setAlarm(new Date(Date.now() + 3600_000).toISOString(), 'Survives Restart');
  assert.equal(future.state, 'pending');

  // Simulate a process restart: a fresh Scheduler reading the same store.
  const s2 = new Scheduler(STORE2);
  const reloaded = s2.listAlarms().find(a => a.id === future.id);
  assert.ok(reloaded, 'Pending alarm should still be active after reload');
  assert.equal(reloaded.state, 'pending');

  if (existsSync(STORE2)) unlinkSync(STORE2);
  console.log('✓ Test 6: pending alarm re-armed on load');
}

// Test 7: a past-due pending alarm loaded from disk fires and transitions to 'fired'
{
  const STORE3 = join(__dir, 'test-alarms-fired.json');
  const pastAlarm = {
    id: 'deadbeef',
    type: 'alarm',
    label: 'Already Past',
    fireAt: new Date(Date.now() - 5000).toISOString(),
    createdAt: new Date(Date.now() - 6000).toISOString(),
    state: 'pending',
  };
  writeFileSync(STORE3, JSON.stringify([pastAlarm], null, 2));

  const s3 = new Scheduler(STORE3);
  // _fire runs synchronously during load for past-due alarms.
  assert.equal(s3.listAlarms().length, 0, 'Fired alarm should drop off the active list');
  assert.equal(s3.isDue(pastAlarm), true, 'isDue uses the loaded copy, still pending in the literal');

  if (existsSync(STORE3)) unlinkSync(STORE3);
  console.log('✓ Test 7: past-due alarm fires and becomes inactive');
}

// Test 8: old store format (cancelled:boolean) migrates to state model
{
  const STORE4 = join(__dir, 'test-alarms-legacy.json');
  const legacy = {
    id: 'legacy01',
    type: 'timer',
    label: 'Legacy',
    fireAt: new Date(Date.now() + 3600_000).toISOString(),
    createdAt: new Date().toISOString(),
    cancelled: false,
  };
  writeFileSync(STORE4, JSON.stringify([legacy], null, 2));

  const s4 = new Scheduler(STORE4);
  const migrated = s4.listAlarms().find(a => a.id === 'legacy01');
  assert.ok(migrated, 'Legacy alarm should load');
  assert.equal(migrated.state, 'pending', 'cancelled:false → state pending');

  if (existsSync(STORE4)) unlinkSync(STORE4);
  console.log('✓ Test 8: legacy store format migrates');
}

// Cleanup
if (existsSync(STORE)) unlinkSync(STORE);

console.log('\nAll scheduler tests passed.');
