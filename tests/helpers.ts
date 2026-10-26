/**
 * Shared test helpers: a runtime pointed at the fixture database, and thin
 * wrappers that call a tool definition the way the registry would.
 * @module tests/helpers
 */

import type { ToolDefinition, ToolRunContext } from '@deepseek-ai/dsh-tools';

import { DEFAULT_CATEGORIES } from '../src/categories.js';
import type { DayflowCategory } from '../src/categories.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ResolvedConfig } from '../src/config.js';
import type { ToolRuntime } from '../src/tools/shared.js';

/** The slice of a tool definition these tests drive directly. */
export interface ExecutableTool {
  readonly name: string;
  readonly description: string;
  execute(args: Record<string, unknown>, exec: ToolRunContext): Promise<unknown>;
  readonly output: {
    render(args: Record<string, unknown>, value: unknown): { type?: string; text?: string }[];
  };
}

/** A tool execution context carrying only what these tools read. */
export function executionContext(): ToolRunContext {
  return { signal: new AbortController().signal } as unknown as ToolRunContext;
}

/**
 * Build a runtime for the fixture database.
 * @param databasePath - path to the disposable SQLite file.
 * @param overrides - config and preference overrides.
 * @returns the runtime.
 */
export function makeRuntime(
  databasePath: string,
  overrides: Partial<ResolvedConfig> & { categories?: readonly DayflowCategory[]; editsEnabled?: boolean } = {},
): ToolRuntime {
  const { categories = DEFAULT_CATEGORIES, editsEnabled = false, ...configOverrides } = overrides;
  const config: ResolvedConfig = {
    databasePath,
    agentSocket: '',
    edits: true,
    skills: true,
    panel: true,
    icons: false,
    allowInstall: false,
    iconDirectory: join(tmpdir(), 'dsh-dayflow-icons-test'),
    searchLimit: 50,
    ...configOverrides,
  };
  return { config, preferences: () => ({ categories, editsEnabled }) };
}

/**
 * Index tool definitions by name.
 * @param tools - definitions from the read or write suite.
 * @returns name-keyed access to the executable surface.
 */
export function toolMap(tools: readonly ToolDefinition[]): Map<string, ExecutableTool> {
  return new Map(tools.map((tool) => [tool.name, tool as unknown as ExecutableTool]));
}

/**
 * Look up a tool, failing loudly when the name is not registered.
 * @param tools - name-keyed tools.
 * @param name - the wanted tool name.
 * @returns the executable tool.
 */
export function toolNamed(tools: ReadonlyMap<string, ExecutableTool>, name: string): ExecutableTool {
  const tool = tools.get(name);
  if (tool === undefined) throw new Error(`tool ${name} is not registered`);
  return tool;
}

/**
 * Execute a tool and render its canonical value as text.
 * @param tools - name-keyed tools.
 * @param name - the tool to run.
 * @param args - its arguments.
 * @returns the rendered model-facing text.
 */
export async function runAndRender(
  tools: ReadonlyMap<string, ExecutableTool>,
  name: string,
  args: Record<string, unknown> = {},
): Promise<{ value: unknown; text: string }> {
  const tool = toolNamed(tools, name);
  const value = await tool.execute(args, executionContext());
  const blocks = tool.output.render(args, value);
  return { value, text: blocks.map((block) => block.text ?? '').join('\n') };
}
