#!/usr/bin/env node
/**
 * Regenerate the README's demo media.
 *
 * The pipeline is three steps, run per language: build the page from the frozen
 * fixture, record it, and let the recorder write both the GIF and the section
 * stills. `capture.mjs` is separate on purpose — it is the only step that reads a
 * real Dayflow database, and it is the one that stamps the fictional copy onto
 * the fixture, so a committed fixture never holds a real activity title.
 *
 * Usage:
 *   node scripts/demo/render.mjs [--lang en|zh] [--fps 10] [--width 820]
 * @module scripts/demo/render
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

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
 * Run one pipeline step, inheriting its output.
 * @param script - the file under `scripts/demo/`.
 * @param args - arguments to pass through.
 */
function run(script, args) {
  const result = spawnSync(process.execPath, [join(HERE, script), ...args], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${script} failed`);
}

const args = flags(process.argv.slice(2));
const languages = args.lang === undefined ? ['en', 'zh'] : [args.lang];
// 820px keeps the panel's 11px card titles legible while holding each GIF
// under a megabyte, which matters for a file committed to the repository.
const passthrough = ['--fps', args.fps ?? '10', '--width', args.width ?? '820'];

for (const language of languages) {
  run('build.mjs', ['--lang', language]);
  run('record.mjs', ['--lang', language, ...passthrough]);
}
