import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { randomBytes } from 'crypto';
import { spawnSync } from 'child_process';

export interface Alarm {
  id: string;
  type: 'alarm' | 'timer';
  label: string;
  fireAt: string; // ISO 8601
  createdAt: string;
  cancelled: boolean;
}

export class Scheduler {
  private alarms: Map<string, Alarm> = new Map();
  private storeFile: string;
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(storeFile?: string) {
    this.storeFile = storeFile ?? (process.env.ALARM_STORE ?? '.copilot/state/alarms.json');
    this._load();
  }

  private _load(): void {
    if (!existsSync(this.storeFile)) return;
    try {
      const data = JSON.parse(readFileSync(this.storeFile, 'utf8')) as Alarm[];
      for (const a of data) this.alarms.set(a.id, a);
    } catch {
      // corrupt store → start fresh
    }
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
      cancelled: false,
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
      cancelled: false,
    };
    this.alarms.set(alarm.id, alarm);
    this._save();
    this._scheduleTimer(alarm);
    return alarm;
  }

  listAlarms(): Alarm[] {
    return [...this.alarms.values()].filter(a => !a.cancelled);
  }

  cancelAlarm(id: string): boolean {
    const alarm = this.alarms.get(id);
    if (!alarm) return false;
    alarm.cancelled = true;
    this._save();
    const timer = this.timers.get(id);
    if (timer) { clearTimeout(timer); this.timers.delete(id); }
    return true;
  }

  isDue(alarm: Alarm, now?: Date): boolean {
    return !alarm.cancelled && new Date(alarm.fireAt) <= (now ?? new Date());
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
    if (msUntilFire <= 0) return; // already past
    const t = setTimeout(() => this._fire(alarm), msUntilFire);
    this.timers.set(alarm.id, t);
  }

  private _fire(alarm: Alarm): void {
    if (alarm.cancelled) return;
    process.stderr.write(`[alarm-mcp] FIRED: ${alarm.label} (${alarm.id})\n`);
    this._platformSound();
  }

  private _platformSound(): void {
    if (process.platform === 'darwin') {
      spawnSync('afplay', ['/System/Library/Sounds/Glass.aiff'], { timeout: 3000 });
    } else if (process.platform === 'linux') {
      spawnSync('paplay', ['/usr/share/sounds/freedesktop/stereo/complete.oga'], { timeout: 3000 });
    } else if (process.platform === 'win32') {
      spawnSync('powershell', ['-Command', '[console]::beep(880,500)'], { timeout: 3000 });
    }
  }
}
