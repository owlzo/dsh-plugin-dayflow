/**
 * Query semantics and the stable JSON payloads.
 */
import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { dayWindowForKey } from '../src/day.js';
import { openDatabase } from '../src/db.js';
import {
  activitiesForDay,
  activitiesInRange,
  activityById,
  activityPayload,
  captureStatus,
  categoryTotals,
  searchActivities,
  standupForDay,
  timelinePayload,
  weeklyPayload,
} from '../src/queries.js';
import { FIXTURE_DAY, createFixtureDatabase } from './fixtures/database.js';

const fixture = createFixtureDatabase();
const db = openDatabase(fixture.path);

after(() => {
  db.close();
  fixture.cleanup();
});

const window = dayWindowForKey(FIXTURE_DAY)!;

test('a day returns the cards starting inside its 4 AM window', () => {
  const activities = activitiesForDay(db, window);
  assert.equal(activities.length, 7, 'six daytime cards plus the 3:30 AM card');
  assert.deepEqual(
    activities.map((activity) => activity.title),
    ['Writing the DSH plugin', 'Team standup', 'Grocery run', 'YouTube break', 'Away from keyboard', 'System update', 'Late night fix'],
  );
});

test('soft-deleted cards never appear', () => {
  const titles = activitiesForDay(db, window).map((activity) => activity.title);
  assert.equal(titles.includes('Deleted card'), false);
  assert.equal(activityById(db, 7), undefined);
});

test('a card after midnight belongs to the previous day', () => {
  const lateNight = activitiesForDay(db, window).find((activity) => activity.title === 'Late night fix');
  assert.ok(lateNight);
  assert.equal(lateNight.start.getHours(), 3);

  // 3:30 AM is still day 19, so day 20 starts with the 9:00 card.
  const nextDay = activitiesForDay(db, dayWindowForKey('2026-10-20')!);
  assert.deepEqual(
    nextDay.map((activity) => activity.title),
    ['Another day'],
  );
});

test('a range query uses overlap, not start time', () => {
  const from = new Date(2026, 9, 19, 0, 0);
  const to = new Date(2026, 9, 20, 0, 0);
  const activities = activitiesInRange(db, from, to);
  assert.equal(activities.length, 6, 'the 3:30 AM card starts after the range ends');
  assert.equal(activities.some((activity) => activity.category === 'System'), true);
});

test('cards project to the stable payload shape', () => {
  const writing = activitiesForDay(db, window).find((activity) => activity.title === 'Writing the DSH plugin');
  assert.ok(writing);

  const brief = activityPayload(writing, false);
  assert.equal(brief.record_id, 1);
  assert.equal(brief.duration_minutes, 28);
  assert.equal(brief.subcategory, 'coding');
  assert.deepEqual(brief.apps, ['Cursor', 'Google Chrome']);
  assert.equal(brief.distraction_count, 2);
  assert.equal(brief.detailed_summary, undefined);
  assert.match(brief.start, /^2026-10-19T09:12:00/);

  const full = activityPayload(writing, true);
  assert.equal(full.detailed_summary, 'A long write-up of the plugin work.');

  const standup = activitiesForDay(db, window).find((activity) => activity.title === 'Team standup');
  assert.ok(standup);
  const plain = activityPayload(standup, false);
  assert.equal(plain.subcategory, undefined);
  assert.equal(plain.apps, undefined);
  assert.equal(plain.distraction_count, undefined);
});

test('search matches title and summary and escapes LIKE wildcards', () => {
  assert.equal(searchActivities(db, 'plugin', 50).length, 1);
  assert.equal(searchActivities(db, 'PLUGIN', 50).length, 1, 'LIKE is case-insensitive');
  assert.equal(searchActivities(db, 'Daily sync', 50).length, 1, 'summaries are searched too');
  assert.equal(searchActivities(db, '%', 50).length, 0, 'a literal % is not a wildcard');
  assert.equal(searchActivities(db, '_', 50).length, 0, 'a literal _ is not a wildcard');
  assert.equal(searchActivities(db, 'YouTube', 1).length, 1, 'limit is honoured');
});

test('the Daily standup document is decoded', () => {
  const standup = standupForDay(db, FIXTURE_DAY);
  assert.ok(standup);
  assert.deepEqual([...standup.highlights], ['Shipped the plugin', 'Wrote tests']);
  assert.deepEqual([...standup.tasks], ['Publish the package']);
  assert.equal(standup.blockers, 'None');
  assert.equal(standupForDay(db, '2026-01-01'), undefined);
});

test('capture status reports freshness and backlog', () => {
  const status = captureStatus(db);
  assert.equal(status.pendingBatches, 1);
  assert.equal(status.failedBatches, 1);
  assert.ok(status.lastCaptureAt);
  assert.equal(status.lastCaptureAt.getMinutes(), 59);
});

test('category totals exclude System and rank by time', () => {
  const { totals, tracked } = categoryTotals(activitiesForDay(db, window));
  assert.equal(tracked, 138);
  assert.deepEqual(
    totals.map((total) => [total.name, total.minutes]),
    [
      ['Work', 73],
      ['Personal', 30],
      ['Idle', 20],
      ['Distraction', 15],
    ],
  );
  assert.equal(totals.some((total) => total.name === 'System'), false);
  assert.equal(Math.round(totals.reduce((sum, total) => sum + total.share, 0)), 1);
});

test('the timeline payload carries the day, timezone, and hint', () => {
  const payload = timelinePayload(activitiesForDay(db, window), window);
  assert.equal(payload.date, FIXTURE_DAY);
  assert.equal(payload.day_boundary_hour, 4);
  assert.equal(payload.cards.length, 7);
  assert.equal(payload.detail_available, true);
  assert.ok(payload.hint.includes('dayflow_activity'));
  assert.equal(typeof payload.time_zone, 'string');
});

test('the weekly payload separates tracked from focus time', () => {
  const weekStart = new Date(2026, 9, 19, 4, 0);
  const weekEnd = new Date(2026, 9, 26, 4, 0);
  const payload = weeklyPayload(activitiesInRange(db, weekStart, weekEnd), weekStart, weekEnd);
  assert.equal(payload.tracked_minutes, 158, 'the week adds the next day 20 minute card');
  assert.equal(payload.focus_minutes, 138, 'focus excludes Idle but keeps the rest');
  assert.deepEqual(
    payload.categories.map((total) => total.name),
    ['Work', 'Personal', 'Idle', 'Distraction'],
  );
});
