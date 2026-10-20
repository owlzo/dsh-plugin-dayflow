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

/** A tighter duration for a small ring centre: `6h42`, `2h`, `45m`. */
export function compactDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h${pad(rest)}`;
}

/**
 * Local wall-clock time: `9:12 AM` in English, `09:12` in Chinese.
 * @param iso - an ISO timestamp.
 * @param language - the panel language; Chinese uses a 24-hour clock.
 * @returns the formatted time, or an empty string for an invalid timestamp.
 */
export function formatClock(iso: string, language = 'en-US'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const hours = date.getHours();
  if (language.startsWith('zh')) return `${pad(hours)}:${pad(date.getMinutes())}`;
  const suffix = hours < 12 ? 'AM' : 'PM';
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${pad(date.getMinutes())} ${suffix}`;
}

/** `45%`, from a 0-1 share. */
export function formatShare(share: number): string {
  return `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%`;
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

function formatter(t: Translate, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(panelLanguage(t), options);
}

/** The local day key for an instant. */
export function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today's local day key; the host settles the 4 AM Dayflow rollover. */
export function todayKey(): string {
  return dayKeyOf(new Date());
}

/** The local month key for an instant. */
export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** The month containing a day key. */
export function monthOfDay(dayKey: string): string {
  return dayKey.slice(0, 7);
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
  return shortDate(date, t);
}

/** `Mon, Oct 19` in the panel's language. */
export function shortDate(date: string, t: Translate): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (match === null) return date;
  const value = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return formatter(t, { weekday: 'short', month: 'short', day: 'numeric' }).format(value);
}

/** `Monday, October 19, 2026` in the panel's language. */
export function longDate(date: string, t: Translate): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (match === null) return date;
  const value = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return formatter(t, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(value);
}

/** `October 2026` in the panel's language. */
export function monthLabel(month: string, t: Translate): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (match === null) return month;
  const value = new Date(Number(match[1]), Number(match[2]) - 1, 1, 12);
  return formatter(t, { year: 'numeric', month: 'long' }).format(value);
}

/**
 * Short weekday names, Monday first, matching the calendar's columns.
 * @param t - the bound translator.
 * @returns seven labels.
 */
export function weekdayLabels(t: Translate): string[] {
  const format = formatter(t, { weekday: 'short' });
  // 2024-01-01 was a Monday, so counting from it gives Monday-first names.
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2024, 0, 1 + index, 12)));
}

/**
 * The calendar's leading blank cells: how many days of the previous month
 * precede the first, with Monday as the first column.
 * @param month - `YYYY-MM`.
 * @returns 0-6 blanks.
 */
export function leadingBlanks(month: string): number {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (match === null) return 0;
  const weekday = new Date(Number(match[1]), Number(match[2]) - 1, 1, 12).getDay();
  return (weekday + 6) % 7;
}
