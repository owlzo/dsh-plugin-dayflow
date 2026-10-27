/**
 * Capture a real week of Dayflow data as the demo's frozen fixture.
 *
 * The fixture keeps what makes the demo credible — timestamps, durations,
 * categories, apps, capture freshness — and drops what does not belong in a
 * public repository: every title and summary is replaced at capture time, using
 * the fictional pool in `fixture-text.mjs`. The file that gets committed
 * therefore never contains a real activity title, a colleague's name, or a
 * document title, and the build step only has to pick a language.
 *
 * Usage:
 *   node scripts/demo/capture.mjs [--week 2026-10-21] [--today 2026-10-25]
 * @module scripts/demo/capture
 */

import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPanelMonth, buildPanelWeek } from '../../lib/panel.js';
import { readPreferences } from '../../lib/categories.js';
import { resolveDatabasePath } from '../../lib/db.js';

import { dealCopy } from './fixture-text.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

/**
 * Parse `--flag value` pairs.
 * @param argv - the raw arguments.
 * @returns the flags.
 */
function flags(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith('--')) continue;
    parsed[argv[index].slice(2)] = argv[index + 1];
    index += 1;
  }
  return parsed;
}

/**
 * A runtime over this Mac's real Dayflow database, reading the app's own
 * categories so the demo uses the same colours the user sees.
 * @returns the runtime the panel builders take.
 */
function liveRuntime() {
  const preferences = readPreferences();
  return {
    config: {
      databasePath: resolveDatabasePath(),
      agentSocket: '',
      edits: false,
      skills: false,
      panel: true,
      icons: true,
      iconDirectory: join(HERE, '.cache/icons'),
      searchLimit: 50,
    },
    preferences: () => preferences,
  };
}

/**
 * Hosts that either name a specific project or paper, or hold private
 * communication, mapped to a neutral stand-in.
 *
 * Generic developer and infrastructure sites are kept on purpose — `github.com`,
 * `arxiv.org`, `chat.deepseek.com`, the editor, the model hubs — because they are
 * what makes the badges look real without saying what the work was about. A
 * project page is a topic in disguise, though: `human2sim2robot.github.io` tells
 * a reader more than any title would, and a chat or mail host marks where
 * private conversations happened even after their text is gone.
 *
 * The list stays short enough to audit at a glance; anything unlisted is kept.
 */
const NEUTRAL_HOSTS = {
  'human2sim2robot.github.io': 'papers.example.org',
  'omniretarget.github.io': 'papers.example.org',
  'docs.feishu.cn': 'docs.example.com',
  'mp.weixin.qq.com': 'news.example.com',
  'weixin.qq.com': 'chat.example.com',
  'wechat.com': 'chat.example.com',
  'xiaohongshu.com': 'feed.example.com',
  'mail.163.com': 'mail.example.com',
  'workbuddy.ai': 'notes.example.com',
  'meoo.com': 'design.example.com',
  'termius.com': 'shell.example.com',
  'pi.dev': 'editor.example.com',
  'pi.website': 'blog.example.com',
  'worldlabs.ai': 'labs.example.com',
  'commandcode.ai': 'build.example.com',
  'tianchi.aliyun.com': 'code.example.org',
};

/**
 * Blank every model-facing string and neutralize identifying sites, leaving
 * structure, times, categories, and the site metadata shape intact.
 * @param payload - a month or week payload.
 * @returns the same payload, sanitized.
 */
function stripCopy(payload) {
  for (const day of payload.days) {
    for (const card of day.cards) {
      card.title = '';
      card.summary = '';
      if (card.apps === undefined) continue;
      card.apps = [...new Set(card.apps.map((app) => NEUTRAL_HOSTS[app] ?? app))];
    }
  }
  return payload;
}

const args = flags(process.argv.slice(2));
const week = args.week ?? '2026-10-21';
const today = args.today ?? '2026-10-25';
const out = resolve(ROOT, args.out ?? 'scripts/demo/fixtures/week.json');

const runtime = liveRuntime();
const month = stripCopy(buildPanelMonth(runtime, week.slice(0, 7)));
const weekPayload = stripCopy(buildPanelWeek(runtime, week));

// The demo shows a finished week, so "today" is its last recorded day: later
// days read as no-data, exactly as the panel draws them live.
for (const day of month.days) {
  day.today = today;
  if (day.date > today) {
    day.cards = [];
    day.categories = [];
    day.tracked_minutes = 0;
    day.pending_batches = 0;
    delete day.last_capture_at;
  }
}
month.today = today;
for (const day of weekPayload.days) day.today = today;
weekPayload.today = today;

const fixture = {
  note:
    'Timings, durations, categories, and capture times are real; every title and summary is fictional ' +
    '(see fixture-text.mjs), and project-specific sites are mapped to neutral hosts (NEUTRAL_HOSTS in capture.mjs).',
  week_start: weekPayload.week_start,
  week_end: weekPayload.week_end,
  month,
  week: weekPayload,
  copy: dealCopy(month.days),
};

await writeFile(out, `${JSON.stringify(fixture, null, 1)}\n`, 'utf8');
console.log(`wrote ${out} (${month.days.length} days, ${Object.keys(fixture.copy).length} cards)`);
