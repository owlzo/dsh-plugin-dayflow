/**
 * Host half of the optional Dayflow panel: two exact Fetch routes under
 * `/api/dayflow`, served through the connection service so they inherit the
 * browser-trust fence and the session cookie.
 *
 * The routes are registered through a dynamic `connection` injection rather
 * than the plugin's static `inject` list, because a headless composition has no
 * web surface and must still get the tools.
 * @module dsh-plugin-dayflow/panel
 */

import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection';

import { withDatabase } from './db.js';
import { formatDayKey, timeZoneName } from './day.js';
import { isDayflowError } from './errors.js';
import { PANEL_CONFIG_PATH, PANEL_DAY_PATH } from './panel-contract.js';
import type { PanelCard, PanelCategory, PanelConfig, PanelDay, PanelError } from './panel-contract.js';
import {
  activitiesForDay,
  activityPayload,
  captureStatus,
  categoryTotals,
} from './queries.js';
import type { ToolRuntime } from './tools/shared.js';
import { dayArgument } from './tools/shared.js';

/** Connection members this module uses; typed narrowly so the host stays testable. */
export interface FetchRouteRegistry {
  register(route: {
    path: string;
    methods: readonly string[];
    requestBody: 'buffered' | 'streaming';
    fetch: (request: Request) => Promise<Response>;
  }): () => Promise<void>;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

/** Map a Dayflow failure onto a status the panel can explain. */
function failureResponse(error: unknown): Response {
  if (isDayflowError(error)) {
    const status =
      error.code === 'invalid_input'
        ? 400
        : error.code === 'not_found'
          ? 404
          : error.code === 'no_data' || error.code === 'database_error'
            ? 503
            : 500;
    return jsonResponse({ error: error.message } satisfies PanelError, status);
  }
  return jsonResponse(
    { error: error instanceof Error ? error.message : String(error) } satisfies PanelError,
    500,
  );
}

/**
 * Build one day's panel payload.
 * @param runtime - the plugin runtime.
 * @param date - an optional `YYYY-MM-DD`; omitted means the current Dayflow day.
 * @returns the payload the browser renders.
 */
export function buildPanelDay(runtime: ToolRuntime, date?: string): PanelDay {
  const window = dayArgument(date);
  const preferences = runtime.preferences();
  const colors = new Map(preferences.categories.map((category) => [category.name, category.colorHex]));

  const { activities, status } = withDatabase(runtime.config.databasePath, (db) => ({
    activities: activitiesForDay(db, window),
    status: captureStatus(db),
  }));
  const { totals, tracked } = categoryTotals(activities);

  const categories: PanelCategory[] = totals.map((total) => ({
    name: total.name,
    minutes: total.minutes,
    share: total.share,
    color_hex: colors.get(total.name) ?? '#A0AEC0',
  }));

  const payload: PanelDay = {
    date: window.dayKey,
    today: formatDayKey(new Date()),
    time_zone: timeZoneName(),
    day_boundary_hour: 4,
    cards: activities.map((activity) => activityPayload(activity, false) as PanelCard),
    tracked_minutes: tracked,
    categories,
    pending_batches: status.pendingBatches,
    edits_enabled: preferences.editsEnabled,
  };
  if (status.lastCaptureAt !== undefined) {
    payload.last_capture_at = status.lastCaptureAt.toISOString();
  }
  return payload;
}

/**
 * Register the panel's routes when a web connection exists.
 * @param ctx - the plugin context.
 * @param runtime - the plugin runtime.
 */
export function registerPanelRoutes(ctx: Context, runtime: ToolRuntime): void {
  ctx.inject(['connection'], (connected) => {
    const connection = (connected as unknown as { connection: { fetch: FetchRouteRegistry } }).connection;
    connection.fetch.register({
      path: PANEL_DAY_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const date = new URL(request.url).searchParams.get('date') ?? undefined;
          return jsonResponse(buildPanelDay(runtime, date));
        } catch (error) {
          return failureResponse(error);
        }
      },
    });
    connection.fetch.register({
      path: PANEL_CONFIG_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => jsonResponse({ enabled: runtime.config.panel } satisfies PanelConfig),
    });
  });
}
