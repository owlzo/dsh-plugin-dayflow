/**
 * Browser-side reads of the host's panel routes.
 *
 * Both routes sit behind the same `/api` trust fence and session cookie as the
 * rest of the client, so a same-origin fetch with credentials is enough.
 * @module dsh-plugin-dayflow/client/data
 */

import { PANEL_CONFIG_PATH, PANEL_DAY_PATH } from '../panel-contract.js';
import type { PanelConfig, PanelDay, PanelError } from '../panel-contract.js';

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as Partial<PanelError>;
    if (typeof body.error === 'string' && body.error !== '') return body.error;
  } catch {
    // Fall through to the status line.
  }
  return `Dayflow request failed (${response.status}).`;
}

/**
 * Read whether the panel is enabled for this profile.
 * @param signal - caller cancellation.
 * @returns the host's answer.
 */
export async function fetchPanelConfig(signal?: AbortSignal): Promise<PanelConfig> {
  const response = await fetch(PANEL_CONFIG_PATH, {
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as PanelConfig;
}

/**
 * Read one day of the timeline.
 * @param date - `YYYY-MM-DD`, or `undefined` for the current Dayflow day.
 * @param signal - caller cancellation.
 * @returns the day payload.
 */
export async function fetchDay(date?: string, signal?: AbortSignal): Promise<PanelDay> {
  const query = date === undefined || date === '' ? '' : `?date=${encodeURIComponent(date)}`;
  const response = await fetch(`${PANEL_DAY_PATH}${query}`, {
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as PanelDay;
}
