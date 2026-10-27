/**
 * Resolve the site icons the demo needs, using the plugin's own `IconStore`.
 *
 * The store is the same code that serves `/api/dayflow/icon` in the harness, so
 * the demo fetches exactly one `favicon.ico` per domain, respects the same size
 * and host rules, and caches the result on disk. The cache lives under
 * `scripts/demo/.cache/`, which is git-ignored: a rebuild without network falls
 * back to the lettered badges the panel already draws for sites without icons.
 * @module scripts/demo/icons
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { IconStore, normalizeHost } from '../../lib/icons.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, '.cache/icons');

/**
 * Every distinct host the fixture mentions, in first-seen order.
 * @param fixture - the captured payloads.
 * @returns host names.
 */
export function hostsOf(fixture) {
  const hosts = new Set();
  for (const day of fixture.month.days) {
    for (const card of day.cards) {
      for (const app of card.apps ?? []) {
        const host = normalizeHost(app);
        if (host !== undefined) hosts.add(host);
      }
    }
  }
  return [...hosts];
}

/**
 * Read or fetch every host's icon and write a copy under `outDir`.
 * @param fixture - the captured payloads.
 * @param outDir - where to place the icons the server serves.
 * @returns the resolved and the missing hosts.
 */
export async function resolveIcons(fixture, outDir) {
  await mkdir(CACHE, { recursive: true });
  await mkdir(outDir, { recursive: true });
  const store = new IconStore(CACHE, true);
  const resolved = [];
  const missing = [];

  for (const host of hostsOf(fixture)) {
    let icon;
    try {
      icon = await store.get(host);
    } catch {
      icon = undefined;
    }
    if (icon === undefined) {
      missing.push(host);
      continue;
    }
    await writeFile(join(outDir, `${host}.icon`), icon.bytes);
    await writeFile(join(outDir, `${host}.json`), JSON.stringify({ mediaType: icon.mediaType }), 'utf8');
    resolved.push(host);
  }

  return { resolved, missing };
}

/**
 * Load the icons already written for a host map.
 * @param outDir - the icon directory.
 * @param host - a host name.
 * @returns the bytes and media type, or `undefined`.
 */
export async function readIcon(outDir, host) {
  try {
    const bytes = await readFile(join(outDir, `${host}.icon`));
    const meta = JSON.parse(await readFile(join(outDir, `${host}.json`), 'utf8'));
    return { bytes, mediaType: meta.mediaType };
  } catch {
    return undefined;
  }
}

/**
 * Check whether an icon directory is already populated.
 * @param outDir - the icon directory.
 * @returns whether it holds at least one icon.
 */
export async function hasIcons(outDir) {
  try {
    const files = await readdir(outDir);
    return files.some((name) => name.endsWith('.icon'));
  } catch {
    return false;
  }
}

export const ICON_DIR = resolve(HERE, '.cache/served');
