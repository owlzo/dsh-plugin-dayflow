/**
 * The user's timeline categories and edit switch.
 *
 * Categories live in the app's preferences (the `colorCategories` key of
 * `teleportlabs.com.Dayflow`), not in SQLite, because the app persists its
 * category list wholesale as one JSON blob. Those preferences are read through
 * `defaults export`, which works across processes and needs no permissions.
 * @module dsh-plugin-dayflow/categories
 */

import { execFileSync } from 'node:child_process';

/** One timeline category. */
export interface DayflowCategory {
  readonly name: string;
  readonly colorHex: string;
  readonly isSystem: boolean;
  readonly isIdle: boolean;
}

/** Preferences this plugin reads. */
export interface DayflowPreferences {
  readonly categories: readonly DayflowCategory[];
  /** Whether the user allowed edits in Dayflow → Settings → AI Tools. */
  readonly editsEnabled: boolean;
}

/** Preferences domain owned by the Dayflow app. */
export const PREFERENCES_DOMAIN = 'teleportlabs.com.Dayflow';

/** The category set the app falls back to when the preference is absent. */
export const DEFAULT_CATEGORIES: readonly DayflowCategory[] = [
  { name: 'Work', colorHex: '#B984FF', isSystem: false, isIdle: false },
  { name: 'Personal', colorHex: '#6AADFF', isSystem: false, isIdle: false },
  { name: 'Distraction', colorHex: '#FF5950', isSystem: false, isIdle: false },
  { name: 'Idle', colorHex: '#A0AEC0', isSystem: true, isIdle: true },
];

/** Runs `defaults` and returns its stdout; injectable so tests need no macOS. */
export type DefaultsRunner = (args: readonly string[]) => string;

function runDefaults(args: readonly string[]): string {
  return execFileSync('defaults', [...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000,
  });
}

interface StoredCategory {
  name?: unknown;
  colorHex?: unknown;
  order?: unknown;
  isSystem?: unknown;
  isIdle?: unknown;
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * The XML element that follows `<key>key</key>`.
 *
 * Reading the whole remainder would swallow the closing `</dict>`, so this
 * parses just the one element the key introduces, self-closing or not.
 * @param xml - an exported plist document.
 * @param key - the preference key to locate.
 * @returns the element text, or `undefined` when the key is absent.
 */
function elementAfterKey(xml: string, key: string): string | undefined {
  const marker = `<key>${key}</key>`;
  const index = xml.indexOf(marker);
  if (index === -1) return undefined;
  const rest = xml.slice(index + marker.length).trimStart();
  const opening = /^<([A-Za-z]+)(?:\s*\/)?>/.exec(rest);
  if (opening === null) return undefined;
  if (opening[0].endsWith('/>')) return opening[0];
  const tag = opening[1];
  const closingIndex = rest.indexOf(`</${tag}>`);
  if (closingIndex === -1) return undefined;
  return rest.slice(0, closingIndex + tag.length + 3);
}

/**
 * Parse a `<data>` element's base64 body.
 * @param element - the element text.
 * @returns the decoded UTF-8 text, or `undefined` when it is not data.
 */
function dataElementText(element: string | undefined): string | undefined {
  if (element === undefined) return undefined;
  const match = /^<data>([\s\S]*?)<\/data>$/.exec(element);
  if (match === null) return undefined;
  try {
    return Buffer.from(match[1].replace(/\s+/g, ''), 'base64').toString('utf8');
  } catch {
    return undefined;
  }
}

/** Whether a preference is stored as `<true/>` or `<integer>1</integer>`. */
function booleanElementValue(element: string | undefined): boolean {
  if (element === undefined) return false;
  if (element.startsWith('<true/>')) return true;
  const integer = /^<integer>(-?\d+)<\/integer>$/.exec(element);
  return integer !== null && integer[1] !== '0';
}

/**
 * Decode the stored category list.
 * @param xml - an exported plist document.
 * @returns the categories in stored order, or `undefined` when unreadable.
 */
export function parseCategories(xml: string): DayflowCategory[] | undefined {
  const raw = dataElementText(elementAfterKey(xml, 'colorCategories'));
  if (raw === undefined) return undefined;

  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!Array.isArray(stored) || stored.length === 0) return undefined;

  const ordered: { order: number; category: DayflowCategory }[] = [];
  for (const entry of stored as StoredCategory[]) {
    const name = asText(entry?.name);
    if (name === undefined || name === '') continue;
    ordered.push({
      order: typeof entry.order === 'number' ? entry.order : 0,
      category: {
        name,
        colorHex: asText(entry.colorHex) ?? '#A0AEC0',
        isSystem: entry.isSystem === true,
        isIdle: entry.isIdle === true,
      },
    });
  }
  ordered.sort((left, right) => left.order - right.order);
  return ordered.map((entry) => entry.category);
}

/**
 * Read categories and the edit switch from the app's preferences.
 * @param run - injectable `defaults` runner; defaults to the real command.
 * @returns the observed preferences, falling back to the app's defaults.
 */
export function readPreferences(run: DefaultsRunner = runDefaults): DayflowPreferences {
  if (process.platform !== 'darwin') {
    return { categories: DEFAULT_CATEGORIES, editsEnabled: false };
  }

  let xml: string;
  try {
    xml = run(['export', PREFERENCES_DOMAIN, '-']);
  } catch {
    return { categories: DEFAULT_CATEGORIES, editsEnabled: false };
  }

  return {
    categories: parseCategories(xml) ?? DEFAULT_CATEGORIES,
    editsEnabled: booleanElementValue(elementAfterKey(xml, 'agentEditsEnabled')),
  };
}

/**
 * Categories in the model-facing shape.
 * @param categories - resolved categories.
 * @returns JSON-ready category rows.
 */
export function categoryPayloads(categories: readonly DayflowCategory[]): {
  name: string;
  color_hex: string;
  is_system: boolean;
  is_idle: boolean;
}[] {
  return categories.map((category) => ({
    name: category.name,
    color_hex: category.colorHex,
    is_system: category.isSystem,
    is_idle: category.isIdle,
  }));
}
