#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Scheduler } from './scheduler.js';

const scheduler = new Scheduler();

const server = new McpServer({
  name: 'alarm-mcp',
  version: '1.0.0',
});

server.tool(
  'set_alarm',
  'Set an alarm at a specific time (ISO 8601 or HH:MM). Fires twice (sound), then it is done.',
  {
    time:  z.string().describe('Time as ISO 8601 or HH:MM'),
    label: z.string().default('Alarm').describe('Label for the alarm'),
  },
  async ({ time, label }) => {
    const alarm = scheduler.setAlarm(time, label);
    return {
      content: [{ type: 'text', text: `Alarm set: ${alarm.label} at ${alarm.fireAt} (id: ${alarm.id})` }],
    };
  }
);

server.tool(
  'set_timer',
  'Set a countdown timer (seconds). Fires twice (sound), then it is done.',
  {
    duration_seconds: z.number().int().min(1).describe('Timer duration in seconds'),
    label:            z.string().default('Timer').describe('Label for the timer'),
  },
  async ({ duration_seconds, label }) => {
    const alarm = scheduler.setTimer(duration_seconds, label);
    return {
      content: [{ type: 'text', text: `Timer set: ${alarm.label}, fires at ${alarm.fireAt} (id: ${alarm.id})` }],
    };
  }
);

server.tool(
  'list_alarms',
  'List active (pending) alarms and timers. Fired and cancelled ones are not shown.',
  {},
  async () => {
    const alarms = scheduler.listAlarms();
    if (alarms.length === 0) {
      return { content: [{ type: 'text', text: 'No active alarms.' }] };
    }
    const lines = alarms.map(a =>
      `[${a.id}] ${a.type} "${a.label}" → ${a.fireAt}`
    );
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

server.tool(
  'cancel_alarm',
  'Cancel a pending alarm or timer by id (before it fires).',
  {
    id: z.string().describe('Alarm id to cancel'),
  },
  async ({ id }) => {
    const ok = scheduler.cancelAlarm(id);
    return {
      content: [{ type: 'text', text: ok ? `Alarm ${id} cancelled.` : `No alarm found with id ${id}.` }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
