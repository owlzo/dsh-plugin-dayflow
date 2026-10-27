/**
 * Browser entry for the README demo: the real Dayflow panel, replaying a
 * sanitized week instead of reading a live database.
 *
 * `scripts/demo/build.mjs` bundles this file; it never ships in the npm
 * package. The panel below is `DayflowPanel` from `src/client/app.tsx`,
 * unchanged, so the recording shows the same components, styles, and layout the
 * plugin registers in the harness. Only the data source and the two harness
 * primitives the panel imports are supplied here.
 * @module scripts/demo/entry
 */

import { createRoot } from 'react-dom/client';

import { DayflowPanel } from '../../src/client/app.js';
import { installStyles } from '../../src/client/styles.js';
import { EN, ZH } from '../../src/client/locale.js';
import { applyCopy } from './fixture.js';
import type { Copy } from './fixture.js';

/** The sanitized replay handed to the page by the recording script. */
interface DemoData {
  language: 'en' | 'zh';
  today: string;
  month: PanelPayload;
  week: PanelPayload;
  days: Record<string, PanelPayload>;
  copy: Record<string, { en: Copy; zh: Copy }>;
}

interface PanelPayload {
  days?: { cards: { record_id: number }[] }[];
  [key: string]: unknown;
}

const demo = (window as unknown as { __DAYFLOW_DEMO__: DemoData }).__DAYFLOW_DEMO__;
const dictionary = demo.language === 'zh' ? ZH : EN;

/**
 * Resolve a key with `{name}` interpolation, like the slot runtime's bound
 * translator.
 * @param key - the locale key.
 * @param params - values for the placeholders.
 * @returns the localized string.
 */
function translate(key: string, params?: Record<string, string | number>): string {
  let text = dictionary[key] ?? key;
  for (const [name, value] of Object.entries(params ?? {})) {
    text = text.split(`{${name}}`).join(String(value));
  }
  return text;
}

/**
 * A replay payload with its copy replaced and nothing else touched.
 * @param payload - a real payload from the fixture.
 * @returns an independent, sanitized copy.
 */
function replay(payload: PanelPayload | undefined): never {
  return applyCopy(JSON.parse(JSON.stringify(payload ?? {})), demo.copy, demo.language) as never;
}

installStyles();

const container = document.getElementById('panel');
if (container !== null) {
  createRoot(container).render(
    <DayflowPanel
      loadDay={async (date?: string) => replay(demo.days[date ?? demo.today])}
      loadMonth={async () => replay(demo.month)}
      loadWeek={async () => replay(demo.week)}
      t={translate}
    />,
  );
}
