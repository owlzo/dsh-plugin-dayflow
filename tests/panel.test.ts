/**
 * Host half of the panel: the payload builder and the two exact Fetch routes.
 */
import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { PANEL_CONFIG_PATH, PANEL_DAY_PATH, shiftDayKey } from '../src/panel-contract.js';
import type { PanelConfig, PanelDay } from '../src/panel-contract.js';
import { buildPanelDay, registerPanelRoutes } from '../src/panel.js';
import { createFixtureDatabase } from './fixtures/database.js';
import { makeRuntime } from './helpers.js';

const fixture = createFixtureDatabase();
after(() => {
  fixture.cleanup();
});

interface RegisteredRoute {
  path: string;
  methods: readonly string[];
  requestBody: string;
  fetch: (request: Request) => Promise<Response>;
}

function fakeHost(runtime: ReturnType<typeof makeRuntime>): Map<string, RegisteredRoute> {
  const routes = new Map<string, RegisteredRoute>();
  const ctx = {
    effect: (effect: () => (() => void) | void) => effect(),
    inject: (_deps: readonly string[], callback: (connected: unknown) => void) => {
      callback({
        connection: {
          fetch: {
            register: (route: RegisteredRoute) => {
              routes.set(route.path, route);
              return async () => {};
            },
          },
        },
      });
    },
  };
  registerPanelRoutes(ctx as never, runtime);
  return routes;
}

test('the panel payload matches the tools for a day', () => {
  const runtime = makeRuntime(fixture.path);
  const payload = buildPanelDay(runtime, '2026-10-19');

  assert.equal(payload.date, '2026-10-19');
  assert.equal(payload.day_boundary_hour, 4);
  assert.equal(payload.cards.length, 7);
  assert.equal(payload.tracked_minutes, 138);
  assert.equal(payload.pending_batches, 1);
  assert.equal(payload.edits_enabled, false);
  assert.equal(payload.cards[0]?.title, 'Writing the DSH plugin');
  assert.deepEqual(
    payload.categories.map((category) => category.name),
    ['Work', 'Personal', 'Idle', 'Distraction'],
  );
  assert.equal(payload.categories[0]?.color_hex, '#B984FF');
  assert.equal(typeof payload.today, 'string');
  assert.ok(payload.last_capture_at !== undefined);
});

test('a category without a stored color falls back to the neutral token color', () => {
  const runtime = makeRuntime(fixture.path, { categories: [] });
  const payload = buildPanelDay(runtime, '2026-10-19');
  assert.equal(payload.categories[0]?.color_hex, '#A0AEC0');
});

test('the day route answers JSON and rejects an impossible date', async () => {
  const routes = fakeHost(makeRuntime(fixture.path));
  assert.deepEqual([...routes.keys()].sort(), [PANEL_DAY_PATH, PANEL_CONFIG_PATH].sort());

  const day = routes.get(PANEL_DAY_PATH);
  assert.ok(day);
  assert.deepEqual([...day.methods], ['GET']);
  assert.equal(day.requestBody, 'buffered');

  const ok = await day.fetch(new Request(`http://127.0.0.1${PANEL_DAY_PATH}?date=2026-10-19`));
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(ok.headers.get('cache-control'), 'no-store');
  const payload = (await ok.json()) as PanelDay;
  assert.equal(payload.date, '2026-10-19');
  assert.equal(payload.cards.length, 7);

  const bad = await day.fetch(new Request(`http://127.0.0.1${PANEL_DAY_PATH}?date=2026-02-30`));
  assert.equal(bad.status, 400);
  assert.match(((await bad.json()) as { error: string }).error, /YYYY-MM-DD/);

  const today = await day.fetch(new Request(`http://127.0.0.1${PANEL_DAY_PATH}`));
  assert.equal(today.status, 200);
  assert.equal(typeof ((await today.json()) as PanelDay).date, 'string');
});

test('a missing database answers 503 so the panel can explain it', async () => {
  const routes = fakeHost(makeRuntime('/nonexistent/dayflow/chunks.sqlite'));
  const route = routes.get(PANEL_DAY_PATH);
  assert.ok(route);
  const response = await route.fetch(new Request(`http://127.0.0.1${PANEL_DAY_PATH}`));
  assert.equal(response.status, 503);
  assert.match(((await response.json()) as { error: string }).error, /No Dayflow database/);
});

test('the config route reports the panel switch', async () => {
  const enabled = fakeHost(makeRuntime(fixture.path, { panel: true }));
  const enabledRoute = enabled.get(PANEL_CONFIG_PATH);
  assert.ok(enabledRoute);
  assert.deepEqual((await (await enabledRoute.fetch(new Request('http://127.0.0.1'))).json()) as PanelConfig, {
    enabled: true,
  });

  const disabled = fakeHost(makeRuntime(fixture.path, { panel: false }));
  const disabledRoute = disabled.get(PANEL_CONFIG_PATH);
  assert.ok(disabledRoute);
  assert.deepEqual((await (await disabledRoute.fetch(new Request('http://127.0.0.1'))).json()) as PanelConfig, {
    enabled: false,
  });
});

test('day keys shift across month and year boundaries', () => {
  assert.equal(shiftDayKey('2026-10-19', 1), '2026-10-20');
  assert.equal(shiftDayKey('2026-10-01', -1), '2026-09-30');
  assert.equal(shiftDayKey('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftDayKey('not-a-day', 1), 'not-a-day');
});
