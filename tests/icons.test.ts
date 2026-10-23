/**
 * Site icons: host normalization, the disk cache, the off switch, and the route.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { DayflowError } from '../src/errors.js';
import { IconStore, normalizeHost } from '../src/icons.js';
import { PANEL_ICON_PATH } from '../src/panel-contract.js';
import { registerPanelRoutes } from '../src/panel.js';
import { createFixtureDatabase } from './fixtures/database.js';
import { makeRuntime } from './helpers.js';

const fixture = createFixtureDatabase();
const cacheRoot = mkdtempSync(join(tmpdir(), 'dsh-dayflow-icons-'));
after(() => {
  fixture.cleanup();
  rmSync(cacheRoot, { recursive: true, force: true });
});

test('recorded apps normalize to a fetchable host', () => {
  assert.equal(normalizeHost('github.com'), 'github.com');
  assert.equal(normalizeHost('WWW.GitHub.com'), 'www.github.com');
  assert.equal(normalizeHost('https://chat.deepseek.com/c/abc?a=1'), 'chat.deepseek.com');
  assert.equal(normalizeHost('  code.visualstudio.com:443  '), 'code.visualstudio.com');
});

test('loopback, bare IPs, and non-hosts never reach the network', () => {
  for (const value of ['127.0.0.1', 'localhost', 'printer.local', '192.168.1.4', 'not a host', '', 'http://[::1]/']) {
    assert.equal(normalizeHost(value), undefined, `${JSON.stringify(value)} must be refused`);
  }
});

test('an icon is fetched once and then served from the disk cache', async () => {
  const directory = join(cacheRoot, 'cache');
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input));
    return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    });
  }) as typeof fetch;

  try {
    const store = new IconStore(directory, true);
    const first = await store.get('github.com');
    assert.ok(first);
    assert.equal(first.mediaType, 'image/png');
    assert.equal(first.bytes.byteLength, 4);
    assert.equal(calls.length, 1);

    // A fresh store reads the same bytes back without another request.
    const second = new IconStore(directory, true);
    const cached = await second.get('github.com');
    assert.ok(cached);
    assert.deepEqual([...cached.bytes], [...first.bytes]);
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test('the icons switch makes no request at all', async () => {
  const original = globalThis.fetch;
  let called = 0;
  globalThis.fetch = (async () => {
    called += 1;
    return new Response(new Uint8Array([1]), { status: 200, headers: { 'content-type': 'image/png' } });
  }) as typeof fetch;
  try {
    const store = new IconStore(join(cacheRoot, 'off'), false);
    assert.equal(await store.get('example.com'), undefined);
    assert.equal(called, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test('a site without a favicon fails quietly and is not retried forever', async () => {
  const original = globalThis.fetch;
  let called = 0;
  globalThis.fetch = (async () => {
    called += 1;
    return new Response('nope', { status: 404 });
  }) as typeof fetch;
  try {
    const store = new IconStore(join(cacheRoot, 'miss'), true);
    assert.equal(await store.get('no-icon.example'), undefined);
    assert.equal(await store.get('no-icon.example'), undefined);
    assert.equal(called, 1, 'the failure is remembered for this process');
  } finally {
    globalThis.fetch = original;
  }
});

test('the icon route serves cached bytes and 404s everything else', async () => {
  const routes = new Map<string, { fetch: (request: Request) => Promise<Response> }>();
  const runtime = makeRuntime(fixture.path, {
    icons: true,
    iconDirectory: join(cacheRoot, 'route'),
  });
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { 'content-type': 'image/x-icon' },
    })) as typeof fetch;

  try {
    const ctx = {
      effect: (effect: () => (() => void) | void) => effect(),
      inject: (_deps: readonly string[], callback: (connected: unknown) => void) => {
        callback({
          connection: {
            fetch: {
              register: (route: { path: string; fetch: (request: Request) => Promise<Response> }) => {
                routes.set(route.path, route);
                return async () => {};
              },
            },
          },
        });
      },
    };
    registerPanelRoutes(ctx as never, runtime);

    const route = routes.get(PANEL_ICON_PATH);
    assert.ok(route);
    const hit = await route.fetch(new Request(`http://127.0.0.1${PANEL_ICON_PATH}?domain=github.com`));
    assert.equal(hit.status, 200);
    assert.equal(hit.headers.get('content-type'), 'image/x-icon');
    assert.match(hit.headers.get('cache-control') ?? '', /max-age=604800/);
    assert.equal(hit.headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await hit.arrayBuffer()).byteLength, 3);

    const miss = await route.fetch(new Request(`http://127.0.0.1${PANEL_ICON_PATH}?domain=127.0.0.1`));
    assert.equal(miss.status, 404);

    const empty = await route.fetch(new Request(`http://127.0.0.1${PANEL_ICON_PATH}`));
    assert.equal(empty.status, 404);
  } finally {
    globalThis.fetch = original;
  }
});

test('the icon cache lives under the harness home', async () => {
  const { dshHome, resolveConfig } = await import('../src/config.js');
  const previous = process.env.DSH_HOME;
  process.env.DSH_HOME = '/tmp/dsh-home-example';
  try {
    assert.equal(dshHome(), '/tmp/dsh-home-example');
    assert.equal(resolveConfig({}).iconDirectory, '/tmp/dsh-home-example/dayflow-icons');
    assert.equal(resolveConfig({ icons: false }).icons, false);
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previous;
  }
  assert.ok(DayflowError);
});
