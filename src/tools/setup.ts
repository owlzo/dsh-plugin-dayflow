/**
 * The optional installer tool.
 *
 * Installing Dayflow changes the user's machine, so this tool exists only when
 * the profile sets `allowInstall: true`, it takes no free-form arguments, and it
 * runs one fixed command. Everything else — opening the app, granting screen
 * recording, choosing a provider — stays manual, because those are consent
 * prompts only the user can answer.
 * @module dsh-plugin-dayflow/tools/setup
 */

import { spawn } from 'node:child_process';

import { defineTool } from '@deepseek-ai/dsh-tools';
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';

import { DayflowError } from '../errors.js';
import { DOWNLOAD_URL, INSTALL_COMMAND, detectDayflow, setupStatus } from '../setup.js';
import { jsonValue } from './shared.js';
import type { ToolRuntime } from './shared.js';

/** How long a Homebrew install may take before it is abandoned. */
const INSTALL_TIMEOUT_MS = 10 * 60 * 1000;

/** Output kept from each stream, so a long Homebrew run cannot flood a tool result. */
const OUTPUT_TAIL_BYTES = 4000;

interface InstallOutcome {
  readonly ok: boolean;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
}

function tail(text: string): string {
  if (text.length <= OUTPUT_TAIL_BYTES) return text;
  return `…${text.slice(text.length - OUTPUT_TAIL_BYTES)}`;
}

/**
 * Run one fixed Homebrew install.
 * @param signal - caller cancellation from the tool execution.
 * @returns the captured outcome; never throws for a failed install.
 */
function runBrewInstall(signal: AbortSignal): Promise<InstallOutcome> {
  return new Promise<InstallOutcome>((resolve) => {
    const child = spawn('brew', ['install', '--cask', 'dayflow'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      // No shell: the argv above is the whole command surface.
      shell: false,
      env: { ...process.env, HOMEBREW_NO_AUTO_UPDATE: '1', HOMEBREW_NO_INSTALL_CLEANUP: '1' },
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    const finish = (outcome: Omit<InstallOutcome, 'stdout' | 'stderr' | 'timedOut'>): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      resolve({ ...outcome, stdout: tail(stdout), stderr: tail(stderr), timedOut });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      // Give Homebrew a moment to unwind, then insist.
      setTimeout(() => child.kill('SIGKILL'), 5000);
    }, INSTALL_TIMEOUT_MS);

    const onAbort = (): void => {
      child.kill('SIGTERM');
      finish({ ok: false, exitCode: null, signal: 'SIGTERM' });
    };
    signal.addEventListener('abort', onAbort, { once: true });

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      stdout += chunk;
      if (stdout.length > OUTPUT_TAIL_BYTES * 4) stdout = tail(stdout);
    });
    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
      if (stderr.length > OUTPUT_TAIL_BYTES * 4) stderr = tail(stderr);
    });

    child.on('error', (cause: Error) => {
      stderr += cause.message;
      finish({ ok: false, exitCode: null, signal: null });
    });
    child.on('close', (code, killSignal) => {
      finish({ ok: code === 0, exitCode: code, signal: killSignal });
    });
  });
}

/**
 * Build the installer tool.
 * @param runtime - the plugin runtime.
 * @returns the tool definition.
 */
export function setupTools(runtime: ToolRuntime): ToolDefinition[] {
  return [
    defineTool({
      name: 'dayflow_install_dayflow',
      description:
        'Install the Dayflow Mac app with Homebrew. This changes the user’s machine: only call it after they ' +
        'explicitly agree to install Dayflow, and never assume consent from an earlier message. It runs ' +
        '`brew install --cask dayflow`, does not open the app, and leaves screen-recording permission, the AI ' +
        'provider choice, and the first recordings to the user.',
      parameters: {
        confirm: {
          type: 'boolean',
          required: true,
          description: 'Must be true. Pass it only after the user asked for Dayflow to be installed.',
        },
      },
      output: {
        schema: { type: 'json' },
        render: (_args, value) => {
          const result = value as unknown as {
            ok: boolean;
            app_path?: string;
            install_command: string;
            download_url: string;
            steps: { id: string; title: string; detail: string }[];
            next_steps: string[];
            stderr?: string;
          };
          if (!result.ok) {
            return [
              {
                type: 'text',
                text:
                  `Installing Dayflow did not finish.\n\n` +
                  `Command: ${result.install_command}\n` +
                  `Download: ${result.download_url}` +
                  (result.stderr === undefined || result.stderr === '' ? '' : `\n\n${result.stderr}`),
              },
            ];
          }
          const steps = result.next_steps.map((step) => `- ${step}`).join('\n');
          return [
            {
              type: 'text',
              text: `Dayflow is installed${result.app_path === undefined ? '' : ` at ${result.app_path}`}.\n\n${steps}`,
            },
          ];
        },
      },
      async execute(args, exec) {
        if (args.confirm !== true) {
          throw new DayflowError(
            'Installing Dayflow needs explicit user consent. Ask the user first, then call again with confirm: true.',
            'invalid_input',
          );
        }
        if (process.platform !== 'darwin') {
          throw new DayflowError('Dayflow is a macOS app; this machine is not macOS.', 'invalid_input');
        }

        const presence = detectDayflow(runtime.config.databasePath);
        if (presence.appInstalled) {
          const setup = setupStatus(presence, runtime.config.databasePath);
          return jsonValue({
            ok: true,
            already_installed: true,
            install_command: setup.install_command,
            download_url: setup.download_url,
            ...(presence.appPath === undefined ? {} : { app_path: presence.appPath }),
            steps: setup.missing,
            next_steps: setup.missing.map((step) => `${step.title}: ${step.detail}`),
          });
        }
        if (!presence.homebrewInstalled) {
          throw new DayflowError(
            `Homebrew is not installed, so the plugin cannot install Dayflow for you. Download it from ${DOWNLOAD_URL} ` +
              'and drag it into Applications.',
            'invalid_input',
          );
        }

        const outcome = await runBrewInstall(exec.signal);
        const after = detectDayflow(runtime.config.databasePath);
        const setup = setupStatus(after, runtime.config.databasePath);

        return jsonValue({
          ok: outcome.ok && after.appInstalled,
          install_command: INSTALL_COMMAND,
          download_url: DOWNLOAD_URL,
          exit_code: outcome.exitCode,
          timed_out: outcome.timedOut,
          ...(after.appPath === undefined ? {} : { app_path: after.appPath }),
          steps: setup.missing,
          next_steps: setup.missing.map((step) => `${step.title}: ${step.detail}`),
          ...(outcome.stderr === '' ? {} : { stderr: outcome.stderr }),
        });
      },
      presentCall: () => ({ card: 'generic', kind: 'execute', title: 'Install Dayflow' }),
    }),
  ];
}
