/**
 * Build the self-contained demo page the README recording is taken from.
 *
 * It bundles the plugin's real client half (`src/client/`) with a replay data
 * source, so the screenshots and the GIF come from the same components the
 * harness renders. Nothing here ships in the npm package.
 *
 * Usage:
 *   node scripts/demo/build.mjs [--lang en|zh] [--out <dir>]
 * @module scripts/demo/build
 */

import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';


const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

/**
 * Pull `--flag value` pairs out of argv.
 * @param argv - the raw arguments.
 * @returns the parsed flags.
 */
function flags(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    parsed[token.slice(2)] = argv[index + 1];
    index += 1;
  }
  return parsed;
}

/**
 * Index the captured payloads by day.
 * @param raw - the captured fixture.
 * @returns the month, the week, and every day by key.
 */
function index(raw) {
  const days = {};
  for (const day of raw.month.days) days[day.date] = day;
  return { month: raw.month, week: raw.week, days };
}

/**
 * Build one language's demo directory.
 * @param language - `en` or `zh`.
 * @param outDir - where the page and bundle are written.
 * @param raw - the captured payloads.
 * @returns the written entry file.
 */
async function buildPage(language, outDir, raw) {
  const data = index(raw);
  const dir = join(outDir, language);
  await mkdir(dir, { recursive: true });

  const bundle = await build({
    entryPoints: [join(HERE, 'entry.tsx')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: ['es2022'],
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    alias: { '@deepseek-ai/dsh-client-ui-primitives': join(HERE, 'primitives.tsx') },
    logLevel: 'error',
    absWorkingDir: ROOT,
  });

  const [script] = bundle.outputFiles;
  if (script === undefined) throw new Error('esbuild produced no script');

  const harness = await readFile(join(HERE, 'assets/harness-tokens.css'), 'utf8');
  const primitiveCss = (
    await Promise.all(
      ['button.css', 'segmented.css', 'tooltip.css'].map((name) => readFile(join(HERE, 'assets', name), 'utf8')),
    )
  ).join('\n');
  const page = await readFile(join(HERE, 'page.html'), 'utf8');
  const html = page
    .replace('<!-- LANG -->', language === 'zh' ? 'zh-CN' : 'en')
    .replace('/* HARNESS_TOKENS */', harness)
    .replace('/* PRIMITIVE_CSS */', primitiveCss)
    .replace(
      '/* REPLAY */',
      `window.__DAYFLOW_DEMO__ = ${JSON.stringify({
        language,
        today: raw.month.today,
        month: data.month,
        week: data.week,
        days: data.days,
        copy: raw.copy,
      })};`,
    )
    .replace('/* BUNDLE */', script.text);

  const target = join(dir, 'index.html');
  await writeFile(target, html, 'utf8');
  return target;
}

const args = flags(process.argv.slice(2));
const language = args.lang ?? 'en';
const outDir = resolve(ROOT, args.out ?? 'scripts/demo/out');
const raw = JSON.parse(await readFile(join(HERE, 'fixtures/week.json'), 'utf8'));

console.log(`built ${await buildPage(language, outDir, raw)}`);
