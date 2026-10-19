/**
 * Filesystem locations owned by the Dayflow Mac app.
 *
 * The app keeps everything under `~/Library/Application Support/Dayflow`: the
 * SQLite database, the recordings, and the write bridge's socket.
 * @module dsh-plugin-dayflow/paths
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

/** Directory the Dayflow Mac app stores its local data in. */
export function dayflowDataDir(): string {
  return join(homedir(), 'Library', 'Application Support', 'Dayflow');
}

/** The app's SQLite database, `chunks.sqlite`. */
export function defaultDatabasePath(): string {
  return join(dayflowDataDir(), 'chunks.sqlite');
}

/** Unix-domain socket the running app listens on for edits. */
export function defaultAgentSocketPath(): string {
  return join(dayflowDataDir(), 'agent.sock');
}
