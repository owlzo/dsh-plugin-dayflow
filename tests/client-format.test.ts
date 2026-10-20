/**
 * Panel formatting helpers, shared by the browser bundle and this suite.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  compactDuration,
  dayLabel,
  formatClock,
  formatDuration,
  formatShare,
  leadingBlanks,
  longDate,
  monthKeyOf,
  monthLabel,
  monthOfDay,
  panelLanguage,
  shortDate,
  todayKey,
  weekdayLabels,
} from '../src/client/format.js';
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
  assert.equal(formatClock(nineTwelve.toISOString(), 'zh-CN'), '09:12');
  assert.equal(formatClock(new Date(2026, 9, 19, 21, 5).toISOString(), 'zh-CN'), '21:05');
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

test('compact durations fit a small ring centre', () => {
  assert.equal(compactDuration(0), '0m');
  assert.equal(compactDuration(28), '28m');
  assert.equal(compactDuration(60), '1h');
  assert.equal(compactDuration(402), '6h42');
});

test('shares render as whole percentages', () => {
  assert.equal(formatShare(0.659), '66%');
  assert.equal(formatShare(0), '0%');
  assert.equal(formatShare(1), '100%');
});

test('month and weekday labels follow the panel language', () => {
  assert.equal(monthLabel('2026-10', en), 'October 2026');
  assert.match(monthLabel('2026-10', zh), /2026/);
  const weekdays = weekdayLabels(en);
  assert.equal(weekdays.length, 7);
  assert.match(weekdays[0] ?? '', /^Mon/);
  assert.match(weekdays[6] ?? '', /^Sun/);
});

test('the calendar starts on Monday', () => {
  // 2026-10-01 is a Thursday, so three blanks precede it.
  assert.equal(leadingBlanks('2026-10'), 3);
  assert.equal(leadingBlanks('2026-06'), 0, 'June 2026 starts on a Monday');
  assert.equal(leadingBlanks('2026-11'), 6, 'November 2026 starts on a Sunday');
});

test('full dates carry the weekday', () => {
  assert.equal(shortDate('2026-10-19', en), 'Mon, Oct 19');
  assert.match(longDate('2026-10-19', en), /Monday, October 19, 2026/);
});

test('local day and month keys are stable', () => {
  assert.match(todayKey(), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(monthKeyOf(new Date(2026, 9, 19, 12)), /^2026-10$/);
  assert.equal(monthOfDay('2026-10-19'), '2026-10');
});
