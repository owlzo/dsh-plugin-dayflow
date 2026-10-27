/**
 * Take still frames of the demo, for checking layout before recording the GIF.
 *
 * Usage:
 *   node scripts/demo/shots.mjs [--lang en|zh] [--out scripts/demo/shots]
 * @module scripts/demo/shots
 */

import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { launch } from './browser.mjs';
import { ICON_DIR, resolveIcons } from './icons.mjs';
import { serve } from './serve.mjs';
import { VIEWPORT, dayDetail, monthWithHover, park, settled, weekWithHover } from './tour.mjs';

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

const args = flags(process.argv.slice(2));
const language = args.lang ?? 'en';
const outDir = resolve(ROOT, args.out ?? 'scripts/demo/shots');

await resolveIcons(FIXTURE, ICON_DIR);
const { server, origin } = await serve(join(HERE, 'out', language), ICON_DIR);
const browser = await launch();
await mkdir(outDir, { recursive: true });

try {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  await page.goto(`${origin}/index.html`, { waitUntil: 'load' });

  await settled(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(outDir, `${language}-month.png`) });

  await monthWithHover(page);
  await page.screenshot({ path: join(outDir, `${language}-month-hover.png`) });

  await park(page, 400);
  await weekWithHover(page);
  await page.screenshot({ path: join(outDir, `${language}-week-hover.png`) });

  await park(page, 400);
  await dayDetail(page);
  await page.screenshot({ path: join(outDir, `${language}-day.png`) });

  console.log('shots in', outDir);
} finally {
  await browser.close();
  server.close();
}
