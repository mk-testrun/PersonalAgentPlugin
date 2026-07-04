import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { randomBytes } from 'crypto';
import { spawn } from 'child_process';

export type AlarmState = 'pending' | 'fired' | 'cancelled';

export interface Alarm {
  id: string;
  type: 'alarm' | 'timer';
  label: string;
  fireAt: string; // ISO 8601
  createdAt: string;
  state: AlarmState;
}

/** Delay (ms) between the two fire beeps. */
const SECOND_BEEP_DELAY_MS = 700;

export class Scheduler {
  private alarms: Map<string, Alarm> = new Map();
  private storeFile: string;
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(storeFile?: string) {
    // Default im Home-Verzeichnis: cwd-relativ würde Alarme über Projektordner verstreuen
    // und beim nächsten Start (anderes cwd) verlieren. ALARM_STORE übersteuert (Tests).
    this.storeFile = storeFile ?? process.env.ALARM_STORE
      ?? join(homedir(), '.copilot', 'state', 'alarms.json');
    this._load();
  }

  private _load(): void {
    if (!existsSync(this.storeFile)) return;
    try {
      const data = JSON.parse(readFileSync(this.storeFile, 'utf8')) as Alarm[];
      for (const a of data) {
        // Tolerate stores written by older versions (cancelled:boolean).
        const migrated = this._migrate(a);
        this.alarms.set(migrated.id, migrated);
        // BUGFIX: re-arm timers for still-pending alarms so persistence works
        // across restarts. Past-due pending alarms fire immediately on load.
        if (migrated.state === 'pending') this._scheduleTimer(migrated);
      }
    } catch {
      // corrupt store → start fresh
    }
  }

  private _migrate(a: Alarm & { cancelled?: boolean }): Alarm {
    if (a.state) return a;
    return { ...a, state: a.cancelled ? 'cancelled' : 'pending' };
  }

  private _save(): void {
    try {
      const dir = dirname(this.storeFile);
      mkdirSync(dir, { recursive: true });
      const data = [...this.alarms.values()];
      writeFileSync(this.storeFile, JSON.stringify(data, null, 2));
    } catch {
      // best effort
    }
  }

  private _genId(): string {
    return randomBytes(4).toString('hex');
  }

  setAlarm(time: string, label: string): Alarm {
    const fireAt = this._parseTime(time);
    const alarm: Alarm = {
      id: this._genId(),
      type: 'alarm',
      label,
      fireAt: fireAt.toISOString(),
      createdAt: new Date().toISOString(),
      state: 'pending',
    };
    this.alarms.set(alarm.id, alarm);
    this._save();
    this._scheduleTimer(alarm);
    return alarm;
  }

  setTimer(durationSeconds: number, label: string): Alarm {
    const fireAt = new Date(Date.now() + durationSeconds * 1000);
    const alarm: Alarm = {
      id: this._genId(),
      type: 'timer',
      label,
      fireAt: fireAt.toISOString(),
      createdAt: new Date().toISOString(),
      state: 'pending',
    };
    this.alarms.set(alarm.id, alarm);
    this._save();
    this._scheduleTimer(alarm);
    return alarm;
  }

  /** Only pending alarms are "active". Fired and cancelled ones drop off. */
  listAlarms(): Alarm[] {
    return [...this.alarms.values()].filter(a => a.state === 'pending');
  }

  cancelAlarm(id: string): boolean {
    const alarm = this.alarms.get(id);
    if (!alarm || alarm.state !== 'pending') return false;
    alarm.state = 'cancelled';
    this._save();
    const timer = this.timers.get(id);
    if (timer) { clearTimeout(timer); this.timers.delete(id); }
    return true;
  }

  isDue(alarm: Alarm, now?: Date): boolean {
    return alarm.state === 'pending' && new Date(alarm.fireAt) <= (now ?? new Date());
  }

  private _parseTime(time: string): Date {
    if (/^\d{2}:\d{2}$/.test(time)) {
      const [h, m] = time.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      if (d <= new Date()) d.setDate(d.getDate() + 1);
      return d;
    }
    const d = new Date(time);
    if (isNaN(d.getTime())) throw new Error(`Invalid time: ${time}`);
    return d;
  }

  private _scheduleTimer(alarm: Alarm): void {
    const msUntilFire = new Date(alarm.fireAt).getTime() - Date.now();
    if (msUntilFire <= 0) { this._fire(alarm); return; } // already past → fire now
    const t = setTimeout(() => this._fire(alarm), msUntilFire);
    // Don't keep an otherwise-idle process alive just for a pending alarm.
    // The MCP server stays alive via its stdio transport, so alarms still fire;
    // batch/test runs without a transport can exit cleanly.
    t.unref?.();
    this.timers.set(alarm.id, t);
  }

  private _fire(alarm: Alarm): void {
    if (alarm.state !== 'pending') return;
    process.stderr.write(`[alarm-mcp] FIRED: ${alarm.label} (${alarm.id})\n`);
    // Fire twice — a single beep is easy to miss — then the alarm is done.
    this._platformSound();
    setTimeout(() => this._platformSound(), SECOND_BEEP_DELAY_MS).unref?.();
    alarm.state = 'fired';
    this.timers.delete(alarm.id);
    this._save();
  }

  private _platformSound(): void {
    // Async: spawnSync würde die Event-Loop (und damit JSON-RPC) bis zu 3 s blockieren.
    let cmd: string, args: string[];
    if (process.platform === 'darwin') {
      cmd = 'afplay'; args = ['/System/Library/Sounds/Glass.aiff'];
    } else if (process.platform === 'linux') {
      cmd = 'paplay'; args = ['/usr/share/sounds/freedesktop/stereo/complete.oga'];
    } else if (process.platform === 'win32') {
      cmd = 'powershell'; args = ['-Command', '[console]::beep(880,500)'];
    } else {
      return;
    }
    try {
      const p = spawn(cmd, args, { stdio: 'ignore' });
      p.on('error', () => { /* Player fehlt → still bleiben */ });
      const kill = setTimeout(() => p.kill(), 3000);
      kill.unref?.();
      p.on('exit', () => clearTimeout(kill));
      p.unref?.();
    } catch { /* best effort */ }
  }
}
