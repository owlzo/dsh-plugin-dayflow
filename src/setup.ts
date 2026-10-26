/**
 * Is Dayflow installed on this Mac?
 *
 * Everything here is read-only and cheap: a few path probes, one `brew list`
 * when Homebrew exists, and one process check. Failures degrade to "not
 * detected" instead of throwing, because a broken probe must not make the rest
 * of the plugin look broken.
 * @module dsh-plugin-dayflow/setup
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Where a Homebrew-installed Dayflow lands. */
const APP_CANDIDATES = ['/Applications/Dayflow.app', join(homedir(), 'Applications', 'Dayflow.app')];

/** Dayflow's only supported install command. */
export const INSTALL_COMMAND = 'brew install --cask dayflow';

/** The project's download page, for machines without Homebrew. */
export const DOWNLOAD_URL = 'https://dayflow.so';

/** How long a probe may take. */
const PROBE_TIMEOUT_MS = 5000;

/** What was found on this Mac. */
export interface DayflowPresence {
  /** Whether `Dayflow.app` exists in an Applications folder. */
  readonly appInstalled: boolean;
  /** The bundle path when found. */
  readonly appPath?: string;
  /** Whether the app is running right now. */
  readonly running: boolean;
  /** Whether the `dayflow` command from the app's CLI is on PATH. */
  readonly cliInstalled: boolean;
  /** Whether Homebrew itself is available. */
  readonly homebrewInstalled: boolean;
  /** Whether the `dayflow` cask is recorded by Homebrew. */
  readonly caskInstalled: boolean;
  /** Whether the local database file exists. */
  readonly databasePresent: boolean;
}

/** One step the user still has to take. */
export interface SetupStep {
  /** Stable machine-readable id. */
  readonly id: 'install-app' | 'open-app' | 'grant-permission' | 'choose-provider' | 'record';
  /** Short imperative title. */
  readonly title: string;
  /** What to do, in one or two sentences. */
  readonly detail: string;
}

/** The setup view the tools return. */
export interface SetupStatus {
  /** Whether the plugin can read a timeline at all. */
  readonly ready: boolean;
  /** What is missing, in the order the user should address it. */
  readonly missing: readonly SetupStep[];
  /** The install command this Mac should use, or the download page. */
  readonly install_command: string;
  readonly download_url: string;
  readonly app_path?: string;
  /** Whether Homebrew is available to run that command. */
  readonly homebrew_installed: boolean;
}

function has(command: string): boolean {
  try {
    execFileSync('which', [command], { stdio: 'ignore', timeout: PROBE_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

function isRunning(): boolean {
  try {
    execFileSync('pgrep', ['-x', 'Dayflow'], { stdio: 'ignore', timeout: PROBE_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

function caskPresent(): boolean {
  try {
    const output = execFileSync('brew', ['list', '--cask', 'dayflow'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: PROBE_TIMEOUT_MS,
    });
    return output.trim() === 'dayflow';
  } catch {
    return false;
  }
}

/**
 * Probe this Mac for Dayflow.
 * @param databasePath - the database path the plugin would read.
 * @returns what was found; every failure reads as "not detected".
 */
export function detectDayflow(databasePath: string): DayflowPresence {
  const appPath = APP_CANDIDATES.find((candidate) => existsSync(candidate));
  const homebrewInstalled = has('brew');
  return {
    appInstalled: appPath !== undefined,
    ...(appPath === undefined ? {} : { appPath }),
    running: isRunning(),
    cliInstalled: has('dayflow'),
    homebrewInstalled,
    caskInstalled: homebrewInstalled && caskPresent(),
    databasePresent: existsSync(databasePath),
  };
}

/**
 * Turn a probe into the setup view the tools and the skill speak from.
 * @param presence - the probe result.
 * @param databasePath - the database path the plugin would read.
 * @returns the ordered steps still missing, and the command that fixes the first one.
 */
export function setupStatus(presence: DayflowPresence, databasePath: string): SetupStatus {
  const missing: SetupStep[] = [];

  if (!presence.appInstalled) {
    missing.push({
      id: 'install-app',
      title: 'Install Dayflow',
      detail: presence.homebrewInstalled
        ? `Run \`${INSTALL_COMMAND}\`, or download it from ${DOWNLOAD_URL}.`
        : `Download Dayflow from ${DOWNLOAD_URL} and drag it into Applications (Homebrew is not installed).`,
    });
  }
  if (presence.appInstalled && !presence.running) {
    missing.push({
      id: 'open-app',
      title: 'Open Dayflow',
      detail: presence.appPath === undefined ? 'Open Dayflow from Applications.' : `Open ${presence.appPath}.`,
    });
  }
  // A database means the user already got through onboarding: permission and
  // provider are settled facts by then, not steps to repeat.
  if (presence.appInstalled && !presence.databasePresent) {
    missing.push(
      {
        id: 'grant-permission',
        title: 'Grant screen recording',
        detail: 'Dayflow asks for Screen & System Audio Recording on first launch; without it nothing is captured.',
      },
      {
        id: 'choose-provider',
        title: 'Choose an AI provider',
        detail: 'Pick local models (Ollama or LM Studio) or a cloud provider in Dayflow’s onboarding.',
      },
    );
  }
  if (!presence.databasePresent) {
    missing.push({
      id: 'record',
      title: 'Let it record for a few minutes',
      detail: `The plugin reads ${databasePath}; it appears once Dayflow captures and analyzes its first activity.`,
    });
  }

  return {
    ready: presence.appInstalled && presence.databasePresent,
    missing,
    install_command: presence.homebrewInstalled ? INSTALL_COMMAND : DOWNLOAD_URL,
    download_url: DOWNLOAD_URL,
    ...(presence.appPath === undefined ? {} : { app_path: presence.appPath }),
    homebrew_installed: presence.homebrewInstalled,
  };
}
