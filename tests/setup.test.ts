/**
 * Setup detection and the consent-gated installer.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DayflowError } from '../src/errors.js';
import { DOWNLOAD_URL, INSTALL_COMMAND, detectDayflow, setupStatus } from '../src/setup.js';
import { setupTools } from '../src/tools/setup.js';
import { createFixtureDatabase } from './fixtures/database.js';
import { makeRuntime } from './helpers.js';

const fixture = createFixtureDatabase();
const tools = setupTools(makeRuntime(fixture.path, { allowInstall: true }));
const install = tools.find((tool) => tool.name === 'dayflow_install_dayflow');

test('the installer tool has a stable name', () => {
  assert.ok(install, 'dayflow_install_dayflow is built');
  assert.deepEqual(tools.map((tool) => tool.name), ['dayflow_install_dayflow']);
});

test('a probe always answers, whatever is installed', () => {
  const presence = detectDayflow('/nonexistent/dayflow/chunks.sqlite');
  for (const key of ['appInstalled', 'running', 'cliInstalled', 'homebrewInstalled', 'caskInstalled', 'databasePresent'] as const) {
    assert.equal(typeof presence[key], 'boolean', `${key} is a boolean`);
  }
  assert.equal(presence.databasePresent, false);
});

test('a machine without Dayflow gets ordered setup steps', () => {
  const setup = setupStatus(
    {
      appInstalled: false,
      running: false,
      cliInstalled: false,
      homebrewInstalled: true,
      caskInstalled: false,
      databasePresent: false,
    },
    '/tmp/chunks.sqlite',
  );
  assert.equal(setup.ready, false);
  assert.deepEqual(
    setup.missing.map((step) => step.id),
    ['install-app', 'record'],
  );
  assert.equal(setup.install_command, INSTALL_COMMAND);
});

test('without Homebrew the steps point at the download page', () => {
  const setup = setupStatus(
    {
      appInstalled: false,
      running: false,
      cliInstalled: false,
      homebrewInstalled: false,
      caskInstalled: false,
      databasePresent: false,
    },
    '/tmp/chunks.sqlite',
  );
  assert.equal(setup.homebrew_installed, false);
  assert.equal(setup.install_command, DOWNLOAD_URL);
  assert.match(setup.missing[0]?.detail ?? '', /download/i);
});

test('an installed app without a database still lists the recording step', () => {
  const setup = setupStatus(
    {
      appInstalled: true,
      appPath: '/Applications/Dayflow.app',
      running: true,
      cliInstalled: true,
      homebrewInstalled: true,
      caskInstalled: true,
      databasePresent: false,
    },
    '/tmp/chunks.sqlite',
  );
  assert.equal(setup.ready, false);
  assert.deepEqual(
    setup.missing.map((step) => step.id),
    ['grant-permission', 'choose-provider', 'record'],
  );
  assert.equal(setup.app_path, '/Applications/Dayflow.app');
});

test('a ready machine has nothing left to do', () => {
  const setup = setupStatus(
    {
      appInstalled: true,
      appPath: '/Applications/Dayflow.app',
      running: true,
      cliInstalled: true,
      homebrewInstalled: true,
      caskInstalled: true,
      databasePresent: true,
    },
    '/tmp/chunks.sqlite',
  );
  assert.equal(setup.ready, true);
  assert.deepEqual(setup.missing, []);
});

test('the installer refuses to run without explicit consent', async () => {
  const exec = { signal: new AbortController().signal } as never;
  await assert.rejects(
    () => install!.execute({ confirm: false }, exec),
    (error: unknown) =>
      error instanceof DayflowError &&
      error.code === 'invalid_input' &&
      /consent/i.test(error.message),
  );
});

test('an already-installed Dayflow short-circuits instead of reinstalling', async () => {
  const presence = detectDayflow(fixture.path);
  if (!presence.appInstalled) {
    // A machine without Dayflow cannot exercise this branch; the other tests
    // still cover the consent guard and the setup steps.
    return;
  }
  const value = (await install!.execute({ confirm: true }, { signal: new AbortController().signal } as never)) as {
    ok: boolean;
    already_installed?: boolean;
    app_path?: string;
    next_steps: string[];
  };
  assert.equal(value.ok, true);
  assert.equal(value.already_installed, true);
  assert.ok(Array.isArray(value.next_steps));
  assert.equal(typeof value.app_path, 'string');
});
