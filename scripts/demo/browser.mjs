/**
 * Locate a usable Playwright and Chromium for the demo recorder.
 *
 * Playwright is a demo-only tool, so it is not a dependency of the package: a
 * checkout may have neither. This module looks in the usual places (a local
 * install first, then the global npm prefix and Homebrew's), explains what to
 * install when it finds nothing, and picks the newest Chromium build that is
 * already downloaded instead of triggering a download mid-recording.
 * @module scripts/demo/browser
 */

import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ALTERNATE_ROOTS = [
  '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules',
  '/usr/local/lib/node_modules/@playwright/cli/node_modules',
  join(homedir(), '.npm-global/lib/node_modules/@playwright/cli/node_modules'),
];

/**
 * Import `playwright-core` from wherever it is installed.
 * @returns the playwright-core module.
 */
export async function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = ['playwright-core', 'playwright'];
  for (const name of candidates) {
    try {
      return require(name);
    } catch {
      // Try the next name.
    }
  }
  for (const root of ALTERNATE_ROOTS) {
    for (const name of candidates) {
      const entry = join(root, name);
      if (!existsSync(entry)) continue;
      const manifest = JSON.parse(await (await import('node:fs/promises')).readFile(join(entry, 'package.json'), 'utf8'));
      const main = join(entry, manifest.main ?? 'index.js');
      return (await import(pathToFileURL(main).href)).default ?? (await import(pathToFileURL(main).href));
    }
  }
  throw new Error(
    'The demo needs Playwright: run `npm i -D playwright` (or `npm i -g @playwright/cli`) and `npx playwright install chromium`.',
  );
}

/**
 * The newest downloaded Chromium build on this Mac.
 * @returns the executable path, or `undefined` when none is installed.
 */
export async function chromiumPath() {
  const cache = join(homedir(), 'Library/Caches/ms-playwright');
  const entries = await readdir(cache).catch(() => []);
  const builds = entries
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((left, right) => Number(right.split('-')[1]) - Number(left.split('-')[1]));
  for (const build of builds) {
    const path = join(cache, build, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents/MacOS/Google Chrome for Testing');
    if (existsSync(path)) return path;
  }
  return undefined;
}

/**
 * Launch Chromium, failing with an actionable message.
 * @returns the browser.
 */
export async function launch() {
  const playwright = await loadPlaywright();
  const executablePath = await chromiumPath();
  return playwright.chromium.launch(executablePath === undefined ? {} : { executablePath });
}
