/**
 * Reading the app's preferences: category list, edit switch, and fallbacks.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_CATEGORIES,
  categoryPayloads,
  parseCategories,
  readPreferences,
} from '../src/categories.js';

function plistWithData(key: string, value: unknown): string {
  const encoded = Buffer.from(JSON.stringify(value), 'utf8').toString('base64').replace(/(.{40})/g, '$1\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>${key}</key>
  <data>
  ${encoded}
  </data>
</dict>
</plist>`;
}

const STORED_CATEGORIES = [
  { name: 'Deep Work', colorHex: '#111111', order: 0, isSystem: false, isIdle: false },
  { name: 'Meetings', colorHex: '#222222', order: 2, isSystem: false, isIdle: false },
  { name: 'Idle', colorHex: '#333333', order: 1, isSystem: true, isIdle: true },
  { name: '', colorHex: '#000000', order: 3 },
];

test('stored categories are decoded and sorted by order', () => {
  const categories = parseCategories(plistWithData('colorCategories', STORED_CATEGORIES));
  assert.deepEqual(categories, [
    { name: 'Deep Work', colorHex: '#111111', isSystem: false, isIdle: false },
    { name: 'Idle', colorHex: '#333333', isSystem: true, isIdle: true },
    { name: 'Meetings', colorHex: '#222222', isSystem: false, isIdle: false },
  ]);
});

test('unreadable or absent category data yields undefined', () => {
  assert.equal(parseCategories('<plist><dict></dict></plist>'), undefined);
  assert.equal(parseCategories(plistWithData('otherKey', STORED_CATEGORIES)), undefined);
  assert.equal(
    parseCategories('<plist><dict><key>colorCategories</key><data>bm90IGpzb24=</data></dict></plist>'),
    undefined,
  );
  assert.equal(parseCategories(plistWithData('colorCategories', [])), undefined);
});

test('the edit switch is read from the app domain', () => {
  const enabled = readPreferences(() =>
    plistWithData('colorCategories', STORED_CATEGORIES).replace(
      '<key>colorCategories</key>',
      '<key>agentEditsEnabled</key>\n  <true/>\n  <key>colorCategories</key>',
    ),
  );
  assert.equal(enabled.editsEnabled, true);
  assert.equal(enabled.categories.length, 3);

  const disabled = readPreferences(() => plistWithData('colorCategories', STORED_CATEGORIES));
  assert.equal(disabled.editsEnabled, false);

  const integerForm = readPreferences(() =>
    plistWithData('colorCategories', STORED_CATEGORIES).replace(
      '<key>colorCategories</key>',
      '<key>agentEditsEnabled</key>\n  <integer>1</integer>\n  <key>colorCategories</key>',
    ),
  );
  assert.equal(integerForm.editsEnabled, true);
});

test('a failing or missing preferences domain falls back to the app defaults', () => {
  const preferences = readPreferences(() => {
    throw new Error('defaults: domain does not exist');
  });
  assert.deepEqual(preferences.categories, DEFAULT_CATEGORIES);
  assert.equal(preferences.editsEnabled, false);
});

test('category payloads use the wire field names', () => {
  assert.deepEqual(categoryPayloads(DEFAULT_CATEGORIES)[3], {
    name: 'Idle',
    color_hex: '#A0AEC0',
    is_system: true,
    is_idle: true,
  });
});
