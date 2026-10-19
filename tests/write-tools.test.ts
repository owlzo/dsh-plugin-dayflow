/**
 * The editing suite: the app's edit switch, the bridge protocol, and the
 * failure codes a caller sees.
 */
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { createServer } from 'node:net';
import type { Server, Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { DayflowError } from '../src/errors.js';
import { writeTools } from '../src/tools/write.js';
import { makeRuntime, toolMap, toolNamed } from './helpers.js';

interface BridgeRequest {
  protocol_version: number;
  operation: string;
  arguments: Record<string, unknown>;
}

const socketPath = join(tmpdir(), `dsh-dayflow-bridge-${process.pid}-${Date.now()}.sock`);
const requests: BridgeRequest[] = [];
let server: Server;

function respond(socket: Socket, request: BridgeRequest): void {
  if (request.operation === 'category_remove') {
    socket.end(`${JSON.stringify({ ok: false, error: { code: 'not_found', message: 'No such category.' } })}\n`);
    return;
  }
  const data: Record<string, unknown> = { updated: true };
  if (typeof request.arguments.record_id === 'number') data.record_id = request.arguments.record_id;
  socket.end(`${JSON.stringify({ ok: true, data })}\n`);
}

before(async () => {
  server = createServer((socket: Socket) => {
    let received = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      received += chunk;
      const newline = received.indexOf('\n');
      if (newline === -1) return;
      const request = JSON.parse(received.slice(0, newline)) as BridgeRequest;
      requests.push(request);
      respond(socket, request);
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(socketPath, resolve);
  });
});

after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  rmSync(socketPath, { force: true });
});

const enabledRuntime = makeRuntime('/nonexistent/chunks.sqlite', {
  agentSocket: socketPath,
  editsEnabled: true,
});
const enabledTools = toolMap(writeTools(enabledRuntime));

test('the editing suite registers six tools with stable names', () => {
  assert.deepEqual([...enabledTools.keys()], [
    'dayflow_update_activity',
    'dayflow_delete_activity',
    'dayflow_create_category',
    'dayflow_update_category',
    'dayflow_delete_category',
    'dayflow_set_goal',
  ]);
});

test('an edit sends the bridge envelope and drops unset arguments', async () => {
  requests.length = 0;
  const value = await toolNamed(enabledTools, 'dayflow_update_activity').execute(
    { record_id: 12, title: 'Renamed' },
    { signal: new AbortController().signal } as never,
  );

  assert.deepEqual(requests, [
    {
      protocol_version: 1,
      operation: 'activity_update',
      arguments: { record_id: 12, title: 'Renamed' },
    },
  ]);
  assert.deepEqual(value, { updated: true, record_id: 12 });
});

test('deleting and goal setting map onto their bridge operations', async () => {
  requests.length = 0;
  await toolNamed(enabledTools, 'dayflow_delete_activity').execute(
    { record_id: 9 },
    { signal: new AbortController().signal } as never,
  );
  await toolNamed(enabledTools, 'dayflow_set_goal').execute(
    { date: '2026-10-19', focus_minutes: 180, distraction_categories: ['Distraction'] },
    { signal: new AbortController().signal } as never,
  );

  assert.deepEqual(requests.map((request) => request.operation), ['activity_delete', 'goal_set']);
  assert.deepEqual(requests[1]?.arguments, {
    date: '2026-10-19',
    focus_minutes: 180,
    distraction_categories: ['Distraction'],
  });
});

test("the app's own edit switch gates every write", async () => {
  const disabledRuntime = makeRuntime('/nonexistent/chunks.sqlite', {
    agentSocket: socketPath,
    editsEnabled: false,
  });
  const disabledTools = toolMap(writeTools(disabledRuntime));
  requests.length = 0;

  await assert.rejects(
    () =>
      toolNamed(disabledTools, 'dayflow_update_activity').execute(
        { record_id: 1, title: 'Nope' },
        { signal: new AbortController().signal } as never,
      ),
    (error: unknown) =>
      error instanceof DayflowError &&
      error.code === 'edits_disabled' &&
      /Settings → AI Tools/.test(error.message),
  );
  assert.equal(requests.length, 0, 'nothing reaches the app');
});

test('a missing app socket is reported as app_not_running', async () => {
  const offlineRuntime = makeRuntime('/nonexistent/chunks.sqlite', {
    agentSocket: join(tmpdir(), 'dsh-dayflow-no-such.sock'),
    editsEnabled: true,
  });
  const offlineTools = toolMap(writeTools(offlineRuntime));

  await assert.rejects(
    () =>
      toolNamed(offlineTools, 'dayflow_create_category').execute(
        { name: 'Focus' },
        { signal: new AbortController().signal } as never,
      ),
    (error: unknown) => error instanceof DayflowError && error.code === 'app_not_running',
  );
});

test("an app-side refusal surfaces the app's message", async () => {
  await assert.rejects(
    () =>
      toolNamed(enabledTools, 'dayflow_delete_category').execute(
        { name: 'Missing' },
        { signal: new AbortController().signal } as never,
      ),
    (error: unknown) =>
      error instanceof DayflowError && error.code === 'bridge_error' && error.message === 'No such category.',
  );
});

test('an already-cancelled call never opens the socket', async () => {
  const controller = new AbortController();
  controller.abort();
  requests.length = 0;
  await assert.rejects(
    () =>
      toolNamed(enabledTools, 'dayflow_update_category').execute(
        { name: 'Work', color: '#000000' },
        { signal: controller.signal } as never,
      ),
    (error: unknown) => error instanceof DayflowError && /cancelled/.test(error.message),
  );
  assert.equal(requests.length, 0);
});
