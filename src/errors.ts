/**
 * Failure vocabulary shared by the tools.
 *
 * Every failure carries a stable `code` so a caller can tell "Dayflow is not
 * installed" from "the query was wrong" without matching on message text.
 * @module dsh-plugin-dayflow/errors
 */

/** Stable failure codes surfaced to the model and to tests. */
export type DayflowErrorCode =
  /** No database at the expected path; Dayflow has never recorded here. */
  | 'no_data'
  /** The user has not enabled edits in Dayflow's AI Tools settings. */
  | 'edits_disabled'
  /** The bridge socket is missing; the Dayflow app is not running. */
  | 'app_not_running'
  /** The requested activity, day, or category does not exist. */
  | 'not_found'
  /** The caller passed an unusable argument. */
  | 'invalid_input'
  /** The database or an SQL statement failed. */
  | 'database_error'
  /** The app answered the bridge with an error, or the protocol broke. */
  | 'bridge_error';

/** A failure that is expected, actionable, and safe to show the model verbatim. */
export class DayflowError extends Error {
  /** Stable machine-readable failure code. */
  readonly code: DayflowErrorCode;

  constructor(message: string, code: DayflowErrorCode, options?: { cause?: unknown }) {
    super(message, options as ErrorOptions | undefined);
    this.name = 'DayflowError';
    this.code = code;
  }
}

/**
 * Narrow an unknown throwable to a {@link DayflowError}.
 * @param error - whatever a `catch` block caught.
 * @returns the same error when it already is a Dayflow failure.
 */
export function isDayflowError(error: unknown): error is DayflowError {
  return error instanceof DayflowError;
}
