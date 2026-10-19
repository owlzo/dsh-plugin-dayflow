/**
 * The wire contract shared by the host routes and the browser panel.
 *
 * This module must stay dependency-free and browser-safe: the client bundle
 * imports it, so nothing here may reach for `node:` builtins or host services.
 * @module dsh-plugin-dayflow/panel-contract
 */

/** One timeline card, as the panel renders it. */
export interface PanelCard {
  record_id: number;
  start: string;
  end: string;
  duration_minutes: number;
  title: string;
  summary: string;
  category: string;
  subcategory?: string;
  apps?: string[];
  distraction_count?: number;
}

/** One category's share of the day, with the user's own color. */
export interface PanelCategory {
  name: string;
  minutes: number;
  share: number;
  color_hex: string;
}

/** Everything the panel needs for one day, in one response. */
export interface PanelDay {
  /** The Dayflow day these cards belong to. */
  date: string;
  /** The Dayflow day containing now, so the panel can label "Today". */
  today: string;
  time_zone: string;
  day_boundary_hour: number;
  cards: PanelCard[];
  tracked_minutes: number;
  categories: PanelCategory[];
  pending_batches: number;
  last_capture_at?: string;
  edits_enabled: boolean;
}

/** Whether the panel's entry points are exposed. */
export interface PanelConfig {
  enabled: boolean;
}

/** Failure body the routes return. */
export interface PanelError {
  error: string;
}

/** Exact Fetch route for one day's timeline. */
export const PANEL_DAY_PATH = '/api/dayflow/day';

/** Exact Fetch route for the panel's enablement. */
export const PANEL_CONFIG_PATH = '/api/dayflow/panel';

const DAY_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Shift a `YYYY-MM-DD` label by whole calendar days.
 * @param dayKey - the label to shift.
 * @param days - signed day count.
 * @returns the shifted label, or the input unchanged when it is not a day key.
 */
export function shiftDayKey(dayKey: string, days: number): string {
  const match = DAY_KEY_PATTERN.exec(dayKey);
  if (match === null) return dayKey;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
