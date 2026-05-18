import { spawn } from 'node:child_process';

import type { SetupState } from '../domain/types.js';
import type {
  AgentDriver,
  AgentDriverRunInput,
  AgentRunResult,
  AgentStreamEvent,
  AgentToolCall,
} from './driver.js';

export type CliProcessResult = Readonly<{
  exitCode: number;
  stderr: string;
  stdout: string;
}>;

export type CliProcessRunner = (
  command: string,
  args: ReadonlyArray<string>,
  options: Readonly<{ cwd: string; signal?: AbortSignal | undefined }>,
) => Promise<CliProcessResult>;

type CliDriverOptions = Readonly<{
  executablePath?: string | null | undefined;
  model?: string | null | undefined;
  runner?: CliProcessRunner | undefined;
  workspacePath: string;
}>;

const defaultClaudePath = 'claude';
const defaultCopilotPath = 'copilot';
const maxOutputBytes = 2_000_000;
const copilotNoDirectToolArgs = [
  '--available-tools=',
  '--disable-builtin-mcps',
  '--deny-tool=shell',
  '--deny-tool=write',
];

function normalizeExecutablePath(path: string | null | undefined, fallback: string): string {
  return path === undefined || path === null || path.trim().length === 0 ? fallback : path;
}

function formatPrompt(input: AgentDriverRunInput): string {
  const prompt =
    input.systemPrompt === undefined
      ? input.prompt
      : `${input.systemPrompt.trim()}\n\n${input.prompt}`;

  if (input.tools.length === 0) {
    return prompt;
  }

  const toolDescriptions = input.tools
    .map(
      (tool) =>
        `- ${tool.name}: ${tool.description}. Parameters JSON Schema: ${tool.parametersJsonSchema}`,
    )
    .join('\n');

  return `${prompt}

Available backend-mediated tools:
${toolDescriptions}

If you need a backend tool, emit a line exactly in this format and wait for Code Sherpa to execute it:
CS_TOOL_CALL: {"name":"tool_name","arguments":{}}`;
}

function normalizeOutput(output: string): string {
  return output.trim();
}

function createCliProcessOptions(
  cwd: string,
  signal: AbortSignal | undefined,
): Readonly<{ cwd: string; signal?: AbortSignal | undefined }> {
  return signal === undefined ? { cwd } : { cwd, signal };
}

function cliFailureMessage(result: CliProcessResult): string {
  return normalizeOutput(result.stderr) || normalizeOutput(result.stdout) || 'CLI command failed';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'CLI command failed';
}

function parseMediatedToolPayload(payloadText: string): unknown {
  try {
    return JSON.parse(payloadText) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('CLI returned an invalid mediated tool call');
    }

    throw error;
  }
}

function parseMediatedToolCalls(stdout: string) {
  const contentLines: string[] = [];
  const toolCalls: AgentToolCall[] = [];

  for (const line of stdout.split(/\r?\n/u)) {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith('CS_TOOL_CALL:')) {
      contentLines.push(line);
      continue;
    }

    const payloadText = trimmedLine.slice('CS_TOOL_CALL:'.length).trim();
    const payload = parseMediatedToolPayload(payloadText);
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('name' in payload) ||
      typeof payload.name !== 'string' ||
      !('arguments' in payload)
    ) {
      throw new Error('CLI returned an invalid mediated tool call');
    }

    toolCalls.push({
      argumentsJson: JSON.stringify(payload.arguments),
      name: payload.name,
    });
  }

  return {
    contentMd: normalizeOutput(contentLines.join('\n')),
    toolCalls,
  };
}

async function checkCliHealth(check: () => Promise<CliProcessResult>, okMessage: string) {
  try {
    const result = await check();
    return result.exitCode === 0
      ? { message: okMessage, ok: true }
      : { message: cliFailureMessage(result), ok: false };
  } catch (error) {
    return { message: errorMessage(error), ok: false };
  }
}

async function runChecked(
  runner: CliProcessRunner,
  command: string,
  args: ReadonlyArray<string>,
  cwd: string,
  signal: AbortSignal | undefined,
): Promise<AgentRunResult> {
  const result = await runner(command, args, createCliProcessOptions(cwd, signal));
  if (result.exitCode !== 0) {
    throw new Error(cliFailureMessage(result));
  }

  const parsed = parseMediatedToolCalls(result.stdout);
  return parsed.toolCalls.length === 0 ? { contentMd: parsed.contentMd } : parsed;
}

async function* runAsStream(run: () => Promise<AgentRunResult>): AsyncIterable<AgentStreamEvent> {
  const result = await run();
  if (result.contentMd.length > 0) {
    yield { delta: result.contentMd, type: 'content' };
  }
  for (const toolCall of result.toolCalls ?? []) {
    yield { toolCall, type: 'tool_call' };
  }
}

export function createCopilotCliDriver(options: CliDriverOptions): AgentDriver {
  const command = normalizeExecutablePath(options.executablePath, defaultCopilotPath);
  const runner = options.runner ?? runCliProcess;
  const modelArgs =
    options.model && options.model.trim().length > 0 ? ['--model', options.model.trim()] : [];
  const run = async (input: AgentDriverRunInput, signal?: AbortSignal) =>
    await runChecked(
      runner,
      command,
      ['-p', formatPrompt(input), ...modelArgs, ...copilotNoDirectToolArgs],
      options.workspacePath,
      signal,
    );

  return {
    kind: 'copilot',
    healthCheck: (signal) =>
      checkCliHealth(
        () =>
          runner(
            command,
            ['-p', 'Reply with exactly: OK', ...modelArgs, ...copilotNoDirectToolArgs],
            createCliProcessOptions(options.workspacePath, signal),
          ),
        'Copilot CLI responded successfully.',
      ),
    run,
    stream: (input, signal) => runAsStream(() => run(input, signal)),
  };
}

export function createClaudeCliDriver(options: CliDriverOptions): AgentDriver {
  const command = normalizeExecutablePath(options.executablePath, defaultClaudePath);
  const runner = options.runner ?? runCliProcess;
  const modelArgs =
    options.model && options.model.trim().length > 0 ? ['--model', options.model.trim()] : [];
  const run = async (input: AgentDriverRunInput, signal?: AbortSignal) =>
    await runChecked(
      runner,
      command,
      [
        '-p',
        formatPrompt(input),
        ...modelArgs,
        '--output-format',
        'text',
        '--no-session-persistence',
        '--tools',
        '',
      ],
      options.workspacePath,
      signal,
    );

  return {
    kind: 'claude',
    healthCheck: (signal) =>
      checkCliHealth(
        () =>
          runner(
            command,
            ['auth', 'status'],
            createCliProcessOptions(options.workspacePath, signal),
          ),
        'Claude CLI is authenticated.',
      ),
    run,
    stream: (input, signal) => runAsStream(() => run(input, signal)),
  };
}

export function createAgentDriverForSetup(
  input: Readonly<{
    runner?: CliProcessRunner | undefined;
    setup: SetupState;
    workspacePath: string;
  }>,
): AgentDriver {
  const options = {
    model: input.setup.agentModel,
    runner: input.runner,
    workspacePath: input.workspacePath,
  };

  return input.setup.agentDriver === 'claude'
    ? createClaudeCliDriver({ ...options, executablePath: input.setup.claudePath })
    : createCopilotCliDriver({ ...options, executablePath: input.setup.copilotPath });
}

export function runCliProcess(
  command: string,
  args: ReadonlyArray<string>,
  options: Readonly<{ cwd: string; signal?: AbortSignal | undefined }>,
): Promise<CliProcessResult> {
  return new Promise((resolve, reject) => {
    let stderr = '';
    let stdout = '';
    let settled = false;

    // Node child_process.spawn runs the executable directly without shell interpolation.
    // Source: https://nodejs.org/api/child_process.html#child_processspawncommand-args-options
    // eslint-disable-next-line security/detect-child-process -- CLI path is configured locally and invoked without a shell.
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      shell: false,
      signal: options.signal,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout = `${stdout}${chunk}`.slice(0, maxOutputBytes);
    });
    child.stderr.on('data', (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(0, maxOutputBytes);
    });
    child.on('error', (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
    child.on('close', (code) => {
      if (!settled) {
        settled = true;
        resolve({ exitCode: code ?? 1, stderr, stdout });
      }
    });
  });
}
