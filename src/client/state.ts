/**
 * The four calendar states a Dayflow day can be in.
 *
 * They must stay distinct: a recorded day, a quiet day (captured but nothing
 * to show), a day still being analyzed, and a day with no captures at all are
 * different facts, and rendering the last two as "zero activity" would be a lie.
 * @module dsh-plugin-dayflow/client/state
 */

import type { PanelDay } from '../panel-contract.js';
import type { RingState } from './ring.js';

/**
 * Classify one day.
 * @param day - the day payload; `last_capture_at` is present when the app captured it.
 * @returns the ring state to draw.
 */
export function dayState(day: PanelDay): RingState {
  if (day.tracked_minutes > 0) return 'recorded';
  if (day.pending_batches > 0) return 'pending';
  if (day.last_capture_at !== undefined) return 'empty';
  return 'no-data';
}
