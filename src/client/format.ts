/**
 * Panel-side formatting, kept pure so it is testable without a browser.
 * @module dsh-plugin-dayflow/client/format
 */

import { shiftDayKey } from '../panel-contract.js';

/** Translation function bound to the panel namespace. */
export type Translate = (key: string, params?: Record<string, string | number>) => string;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** `45m`, `2h`, or `2h 05m`, matching the host's rendering. */
export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${pad(rest)}m`;
}

/** Local wall-clock time, e.g. `9:12 AM`. */
export function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const hours = date.getHours();
  const suffix = hours < 12 ? 'AM' : 'PM';
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${pad(date.getMinutes())} ${suffix}`;
}

/**
 * The language the panel formats dates in.
 *
 * The slot only injects a translator, so the language is read back from the
 * copy the translator returns — a fixed pair with no guessing in between.
 * @param t - the bound translator.
 * @returns a BCP 47 tag for `Intl`.
 */
export function panelLanguage(t: Translate): string {
  return t('today') === '今天' ? 'zh-CN' : 'en-US';
}

/**
 * The toolbar's day label.
 * @param date - the day being shown.
 * @param today - the Dayflow day containing now.
 * @param t - the bound translator.
 * @returns `Today`, `Yesterday`, or a short formatted date.
 */
export function dayLabel(date: string, today: string, t: Translate): string {
  if (date === today) return t('today');
  if (date === shiftDayKey(today, -1)) return t('yesterday');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (match === null) return date;
  const value = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return new Intl.DateTimeFormat(panelLanguage(t), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(value);
}
