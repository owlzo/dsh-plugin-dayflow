/**
 * Panel formatting helpers, shared by the browser bundle and this suite.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dayLabel, formatClock, formatDuration, panelLanguage } from '../src/client/format.js';
import { EN, ZH } from '../src/client/locale.js';

const en = (key: string): string => EN[key] ?? key;
const zh = (key: string): string => ZH[key] ?? key;

test('durations match the host rendering', () => {
  assert.equal(formatDuration(0), '0m');
  assert.equal(formatDuration(45), '45m');
  assert.equal(formatDuration(60), '1h');
  assert.equal(formatDuration(125), '2h 05m');
  assert.equal(formatDuration(-5), '0m');
});

test('clock times read as the app shows them', () => {
  const nineTwelve = new Date(2026, 9, 19, 9, 12, 0);
  assert.equal(formatClock(nineTwelve.toISOString()), '9:12 AM');
  assert.equal(formatClock('not-a-date'), '');
});

test('the panel formats dates in the language the translator speaks', () => {
  assert.equal(panelLanguage(en), 'en-US');
  assert.equal(panelLanguage(zh), 'zh-CN');
});

test('the day label prefers Today and Yesterday', () => {
  assert.equal(dayLabel('2026-10-19', '2026-10-19', en), 'Today');
  assert.equal(dayLabel('2026-10-18', '2026-10-19', en), 'Yesterday');
  assert.equal(dayLabel('2026-10-19', '2026-10-19', zh), '今天');
  assert.equal(dayLabel('2026-10-18', '2026-10-19', zh), '昨天');

  const older = dayLabel('2026-10-01', '2026-10-19', en);
  assert.match(older, /Oct/);
  assert.match(older, /1/);
});

test('both dictionaries carry the same keys', () => {
  assert.deepEqual(Object.keys(ZH).sort(), Object.keys(EN).sort());
  for (const [key, value] of Object.entries(EN)) {
    assert.ok(value.length > 0, `English copy for ${key} is not empty`);
  }
});
