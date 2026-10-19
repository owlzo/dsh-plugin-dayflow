/**
 * Client side of Dayflow's write channel.
 *
 * Reads go straight to SQLite; writes go to the running app over a Unix-domain
 * socket, because the app owns the category store (an in-memory array persisted
 * wholesale) and its UI must refresh when data changes underneath it.
 *
 * Protocol: one JSON request line in, one JSON response line out, then the
 * connection closes. `{protocol_version, operation, arguments}` is answered by
 * `{ok: true, data}` or `{ok: false, error: {code, message}}`.
 * @module dsh-plugin-dayflow/bridge
 */

import { existsSync } from 'node:fs';
import { connect } from 'node:net';

import { DayflowError } from './errors.js';
import { defaultAgentSocketPath } from './paths.js';

/** Version of the bridge protocol this client speaks. */
export const BRIDGE_PROTOCOL_VERSION = 1;

const MAX_RESPONSE_BYTES = 1_048_576;
const DEFAULT_TIMEOUT_MS = 10_000;

/** How to reach the app for one write. */
export interface BridgeOptions {
  /** Override the socket path; defaults to the app's `agent.sock`. */
  readonly socketPath?: string;
  /** Caller cancellation from the tool execution. */
  readonly signal?: AbortSignal;
  /** Bound on the whole round trip, in milliseconds. */
  readonly timeoutMs?: number;
}

interface BridgeResponse {
  ok?: unknown;
  data?: unknown;
  error?: { code?: unknown; message?: unknown };
}

function abortError(signal: AbortSignal): DayflowError {
  return new DayflowError('The Dayflow edit was cancelled.', 'bridge_error', { cause: signal.reason });
}

/**
 * Send one operation to the running Dayflow app.
 * @param operation - bridge operation name, e.g. `activity_update`.
 * @param args - operation arguments.
 * @param options - socket override, cancellation, and timeout.
 * @returns the app's `data` payload.
 */
export function sendBridgeOperation(
  operation: string,
  args: Record<string, unknown>,
  options: BridgeOptions = {},
): Promise<Record<string, unknown>> {
  const configured = options.socketPath?.trim();
  const socketPath = configured !== undefined && configured !== '' ? configured : defaultAgentSocketPath();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const signal = options.signal;

  if (signal?.aborted === true) throw abortError(signal);
  if (!existsSync(socketPath)) {
    throw new DayflowError(
      `Dayflow's edit bridge is not listening at ${socketPath}. Open Dayflow and turn on its agent access ` +
        '(Settings → AI Tools). Reads work while the app is closed.',
      'app_not_running',
    );
  }

  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const socket = connect(socketPath);
    let settled = false;
    let received = '';

    const settle = (error: DayflowError | undefined, data?: Record<string, unknown>): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      socket.destroy();
      if (error !== undefined) reject(error);
      else resolve(data ?? {});
    };

    const timer = setTimeout(() => {
      settle(new DayflowError(`Dayflow did not answer the ${operation} request within ${timeoutMs} ms.`, 'bridge_error'));
    }, timeoutMs);

    const onAbort = (): void => {
      settle(abortError(signal!));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    socket.setEncoding('utf8');
    socket.on('connect', () => {
      socket.write(
        `${JSON.stringify({
          protocol_version: BRIDGE_PROTOCOL_VERSION,
          operation,
          arguments: args,
        })}\n`,
      );
    });
    socket.on('data', (chunk: string) => {
      received += chunk;
      if (received.length > MAX_RESPONSE_BYTES) {
        settle(new DayflowError('Dayflow sent an oversized edit response.', 'bridge_error'));
        return;
      }
      const newline = received.indexOf('\n');
      if (newline === -1) return;

      const line = received.slice(0, newline);
      let response: BridgeResponse;
      try {
        response = JSON.parse(line) as BridgeResponse;
      } catch (cause) {
        settle(new DayflowError('Dayflow sent an unreadable edit response.', 'bridge_error', { cause }));
        return;
      }

      if (response.ok === true) {
        const data = typeof response.data === 'object' && response.data !== null ? (response.data as Record<string, unknown>) : {};
        settle(undefined, data);
        return;
      }
      const code = typeof response.error?.code === 'string' ? response.error.code : 'bridge_error';
      const message = typeof response.error?.message === 'string' ? response.error.message : 'Dayflow reported an error.';
      settle(
        new DayflowError(message, code === 'app_not_running' ? 'app_not_running' : 'bridge_error', {
          cause: response.error,
        }),
      );
    });
    socket.on('error', (cause: Error) => {
      settle(
        new DayflowError(
          `Could not reach Dayflow's edit bridge at ${socketPath}: ${cause.message}. Open Dayflow and turn on ` +
            'its agent access (Settings → AI Tools). Reads work while the app is closed.',
          'app_not_running',
          { cause },
        ),
      );
    });
    socket.on('close', () => {
      settle(new DayflowError('Dayflow closed the connection before answering the edit.', 'bridge_error'));
    });
  });
}
