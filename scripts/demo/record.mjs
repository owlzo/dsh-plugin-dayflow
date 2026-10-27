/**
 * Capture the README demo as a GIF.
 *
 * The tour (`tour.mjs`) is replayed in a headless Chromium, but instead of
 * recording video the capture takes a still at each settled state and ffmpeg
 * joins them with short crossfades. That keeps every frame crisp and
 * deterministic — a screen recording picks up mid-transition frames and a
 * leading blank frame from before the page paints — and it keeps the GIF small
 * enough to inline in a README.
 *
 * The page is the plugin's own client half (`src/client/`) on a frozen,
 * sanitized week (`build.mjs`), so the result shows real components, real
 * layout, and real interactions.
 *
 * Usage:
 *   node scripts/demo/record.mjs [--lang en|zh] [--fps 10] [--width 820] [--out docs]
 * @module scripts/demo/record
 */

import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { launch } from './browser.mjs';
import { ICON_DIR, resolveIcons } from './icons.mjs';
import { serve } from './serve.mjs';
import { VIEWPORT, dayDetail, monthWithHover, park, scrollWeekTo, settled, weekWithHover } from './tour.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const FIXTURE = JSON.parse(await readFile(join(HERE, 'fixtures/week.json'), 'utf8'));

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

/** How long each state is held, in seconds; the crossfade overlaps neighbours. */
const HOLDS = { month: 1.7, monthHover: 2.0, week: 1.5, weekHover: 2.0, day: 2.4 };

/** Crossfade length in seconds; short enough to read as a transition, not a fade. */
const FADE = 0.28;

/**
 * Capture every state the tour passes through.
 * @param page - the loaded page.
 * @param dir - where to write the stills.
 * @returns the stills and their hold times, in tour order.
 */
async function capture(page, dir) {
  const stills = [];
  const shot = async (name, hold) => {
    const path = join(dir, `${name}.png`);
    await page.screenshot({ path });
    stills.push({ path, hold });
  };

  await settled(page);
  await page.waitForTimeout(500);
  await shot('month', HOLDS.month);

  await monthWithHover(page);
  await page.waitForTimeout(500);
  await shot('month-hover', HOLDS.monthHover);

  await park(page, 400);
  await page.locator('#dayflow-view-week').click();
  await page.waitForSelector('.dfp-week-card', { timeout: 15_000 });
  // The axis starts at the week's first card, which here is after midnight, so
  // scroll to the working day before the first week frame.
  await scrollWeekTo(page, 10);
  await page.waitForTimeout(600);
  await shot('week', HOLDS.week);

  // The pool's idle copy is the one card in the week worth skipping: it is the
  // tallest block of the day and says "you were idle" in both languages.
  await weekWithHover(page, ['Idle', '空闲']);
  await page.waitForTimeout(500);
  await shot('week-hover', HOLDS.weekHover);

  await park(page, 400);
  await dayDetail(page);
  await shot('day', HOLDS.day);
  return stills;
}

/**
 * Downscale a still into the still image the README shows for that section, for
 * readers whose Markdown renderer does not animate GIFs.
 * @param still - the source PNG.
 * @param out - the destination PNG.
 * @param width - output width in pixels.
 */
function poster(still, out, width) {
  const result = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', still.path, '-vf', `scale=${width}:-1:flags=lanczos`, '-frames:v', '1', out],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr}`);
}

/** The still each README section shows, and the name it is saved under. */
const POSTERS = { 'week-hover': 'demo', month: 'panel', day: 'day' };

/**
 * Join the stills into one GIF: hold each, then crossfade into the next.
 * @param stills - the stills and their holds.
 * @param out - the destination GIF.
 * @param options - frame rate and output width.
 */
function encode(stills, out, options) {
  const inputs = stills.flatMap((still) => ['-loop', '1', '-t', String(still.hold), '-i', still.path]);

  // Chain `xfade` so each fade starts at the end of everything before it.
  const steps = [];
  let offset = 0;
  let previous = '0:v';
  for (let index = 1; index < stills.length; index += 1) {
    offset += stills[index - 1].hold - FADE;
    const label = `stage${index}`;
    steps.push(`[${previous}][${index}:v]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(3)}[${label}]`);
    previous = label;
  }

  const filter = [
    ...steps,
    `[${previous}]fps=${options.fps},scale=${options.width}:-1:flags=lanczos,split[paletteSource][frames]`,
    '[paletteSource]palettegen=max_colors=200:stats_mode=diff[palette]',
    '[frames][palette]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle[out]',
  ].join(';');

  const result = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-map', '[out]', '-loop', '0', out],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr}`);
}

const args = flags(process.argv.slice(2));
const language = args.lang ?? 'en';
const width = Number(args.width ?? 820);
const fps = Number(args.fps ?? 10);
const outDir = resolve(ROOT, args.out ?? 'docs');

const icons = await resolveIcons(FIXTURE, ICON_DIR);
console.log(`icons: ${icons.resolved.length} resolved, ${icons.missing.length} without a favicon`);

const { server, origin } = await serve(join(HERE, 'out', language), ICON_DIR);
const work = await mkdtemp(join(tmpdir(), 'dayflow-demo-'));
const browser = await launch();

try {
  // Two device pixels per CSS pixel, so the downscale to the GIF's width keeps
  // text sharp.
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  await page.goto(`${origin}/index.html`, { waitUntil: 'load' });
  const stills = await capture(page, work);

  await mkdir(outDir, { recursive: true });
  const gif = join(outDir, `demo.${language}.gif`);
  encode(stills, gif, { fps, width });

  // One still per README section: the GIF above the fold, and a sharp frame for
  // each part of the panel the text walks through.
  for (const [stillName, base] of Object.entries(POSTERS)) {
    const still = stills.find((entry) => entry.path.endsWith(`${stillName}.png`));
    if (still !== undefined) poster(still, join(outDir, `${base}.${language}.png`), width);
  }

  const { size } = await stat(gif);
  console.log(`wrote ${gif} (${(size / 1024 / 1024).toFixed(2)} MB, ${stills.length} states)`);
} finally {
  await browser.close().catch(() => {});
  server.close();
  await rm(work, { recursive: true, force: true });
}
