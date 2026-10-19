/**
 * A throwaway Dayflow database with a known day, week, standup, and backlog.
 *
 * The schema mirrors the app's real tables closely enough for every query the
 * plugin runs, and the cards exercise the rules that are easy to get wrong:
 * the 4 AM boundary, soft deletes, the System category, and metadata with
 * apps and distractions.
 * @module tests/fixtures/database
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/** The fixture's main day. */
export const FIXTURE_DAY = '2026-10-19';

/** The fixture's follow-up day. */
export const FIXTURE_NEXT_DAY = '2026-10-20';

/** A fixed "now" two minutes after the newest capture. */
export const FIXTURE_NOW = new Date(2026, 9, 20, 10, 0, 0);

/** A disposable database on disk. */
export interface FixtureDatabase {
  /** Absolute path to the SQLite file. */
  readonly path: string;
  /** Directory holding the file. */
  readonly directory: string;
  /** Remove the directory and everything in it. */
  cleanup(): void;
}

function dateFrom([year, month, day, hour, minute]: readonly [number, number, number, number, number]): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function epoch(parts: readonly [number, number, number, number, number]): number {
  return Math.floor(dateFrom(parts).getTime() / 1000);
}

function dayKeyOf([year, month, day]: readonly [number, number, number, number, number]): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const SCHEMA = `
  CREATE TABLE analysis_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_start_ts INTEGER NOT NULL,
    batch_end_ts INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reason TEXT,
    llm_metadata TEXT,
    detailed_transcription TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE timeline_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER REFERENCES analysis_batches(id) ON DELETE CASCADE,
    start TEXT NOT NULL,
    end TEXT NOT NULL,
    start_ts INTEGER,
    end_ts INTEGER,
    day DATE NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    detailed_summary TEXT,
    metadata TEXT,
    video_summary_url TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    captured_at INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    idle_seconds_at_capture INTEGER,
    frame_index INTEGER,
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE daily_standup_entries (
    standup_day TEXT NOT NULL PRIMARY KEY,
    payload_json TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

interface CardSeed {
  readonly start: [number, number, number, number, number];
  readonly end: [number, number, number, number, number];
  readonly title: string;
  readonly summary: string;
  readonly category: string;
  readonly subcategory?: string;
  readonly detailed?: string;
  readonly metadata?: unknown;
  readonly deleted?: boolean;
}

/** Oct 19 2026 cards, plus the 3:30 AM card that belongs to Oct 19, and Oct 20. */
const CARDS: readonly CardSeed[] = [
  {
    start: [2026, 10, 19, 9, 12],
    end: [2026, 10, 19, 9, 40],
    title: 'Writing the DSH plugin',
    summary: 'Implemented the Dayflow read tools',
    category: 'Work',
    subcategory: 'coding',
    detailed: 'A long write-up of the plugin work.',
    metadata: {
      appSites: { primary: 'Cursor', secondary: 'Google Chrome' },
      distractions: [{ title: 'X' }, { title: 'YouTube' }],
    },
  },
  { start: [2026, 10, 19, 10, 0], end: [2026, 10, 19, 10, 30], title: 'Team standup', summary: 'Daily sync', category: 'Work' },
  { start: [2026, 10, 19, 11, 0], end: [2026, 10, 19, 11, 30], title: 'Grocery run', summary: 'Bought lunch', category: 'Personal' },
  { start: [2026, 10, 19, 12, 0], end: [2026, 10, 19, 12, 15], title: 'YouTube break', summary: 'Watched a video', category: 'Distraction' },
  { start: [2026, 10, 19, 13, 0], end: [2026, 10, 19, 13, 20], title: 'Away from keyboard', summary: 'No activity', category: 'Idle' },
  { start: [2026, 10, 19, 14, 0], end: [2026, 10, 19, 14, 5], title: 'System update', summary: 'Background work', category: 'System' },
  {
    start: [2026, 10, 19, 15, 0],
    end: [2026, 10, 19, 15, 30],
    title: 'Deleted card',
    summary: 'Should never be read',
    category: 'Work',
    deleted: true,
  },
  {
    start: [2026, 10, 20, 3, 30],
    end: [2026, 10, 20, 3, 45],
    title: 'Late night fix',
    summary: 'Fixed the 4 AM boundary',
    category: 'Work',
  },
  { start: [2026, 10, 20, 9, 0], end: [2026, 10, 20, 9, 20], title: 'Another day', summary: 'Next day work', category: 'Work' },
];

const STANDUP = {
  highlightsTitle: 'Highlights',
  highlights: [{ text: 'Shipped the plugin' }, { text: 'Wrote tests' }],
  tasksTitle: 'Tasks',
  tasks: [{ text: 'Publish the package' }],
  blockersTitle: 'Blockers',
  blockersBody: 'None',
};

/**
 * Create a disposable database seeded with the fixture.
 * @returns the database handle.
 */
export function createFixtureDatabase(): FixtureDatabase {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-dayflow-test-'));
  const path = join(directory, 'chunks.sqlite');
  const db = new DatabaseSync(path);
  try {
    db.exec(SCHEMA);

    const insertCard = db.prepare(
      `INSERT INTO timeline_cards
         (start, end, start_ts, end_ts, day, title, summary, category, subcategory, detailed_summary, metadata, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const card of CARDS) {
      const start = dateFrom(card.start);
      const end = dateFrom(card.end);
      insertCard.run(
        start.toISOString(),
        end.toISOString(),
        epoch(card.start),
        epoch(card.end),
        dayKeyOf(card.start),
        card.title,
        card.summary,
        card.category,
        card.subcategory ?? null,
        card.detailed ?? null,
        card.metadata === undefined ? null : JSON.stringify(card.metadata),
        card.deleted === true ? 1 : 0,
      );
    }

    db.prepare(
      `INSERT INTO analysis_batches (batch_start_ts, batch_end_ts, status)
       VALUES (?, ?, 'pending'), (?, ?, 'failed:llm'), (?, ?, 'complete')`,
    ).run(
      epoch([2026, 10, 20, 9, 0]),
      epoch([2026, 10, 20, 9, 30]),
      epoch([2026, 10, 20, 8, 0]),
      epoch([2026, 10, 20, 8, 30]),
      epoch([2026, 10, 20, 7, 0]),
      epoch([2026, 10, 20, 7, 30]),
    );

    const insertScreenshot = db.prepare(
      'INSERT INTO screenshots (captured_at, file_path, is_deleted) VALUES (?, ?, ?)',
    );
    insertScreenshot.run(epoch([2026, 10, 20, 9, 58]), '/tmp/frame-1.jpg', 0);
    insertScreenshot.run(epoch([2026, 10, 20, 9, 59]), '/tmp/frame-2.jpg', 0);
    insertScreenshot.run(epoch([2026, 10, 20, 9, 59]), '/tmp/frame-3.jpg', 1);

    db.prepare('INSERT INTO daily_standup_entries (standup_day, payload_json) VALUES (?, ?)').run(
      FIXTURE_DAY,
      JSON.stringify(STANDUP),
    );
  } finally {
    db.close();
  }

  return {
    path,
    directory,
    cleanup(): void {
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
