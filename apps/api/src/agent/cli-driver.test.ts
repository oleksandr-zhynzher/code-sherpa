import { describe, expect, it } from 'vitest';

import type { SetupState } from '../domain/types.js';
import {
  type CliProcessRunner,
  createAgentDriverForSetup,
  createClaudeCliDriver,
  createCopilotCliDriver,
} from './cli-driver.js';

const workspacePath = '/tmp/code-sherpa-workspace';
const claudePath = '/opt/bin/claude';
const copilotPath = '/opt/bin/copilot';
const runTestsToolName = 'run_tests';
const useToolPrompt = 'Use a tool';

function createSetup(agentDriver: SetupState['agentDriver']): SetupState {
  return {
    agentDriver,
    autoSaveProgress: true,
    claudePath,
    copilotPath,
    exerciseLanguage: 'typescript',
    guideTone: 'encouraging',
    repoUrl: null,
    safeRunChecks: true,
    workspacePath,
  };
}

describe('CLI agent drivers', () => {
  it('runs Copilot CLI with prompt mode and default tool denials', async () => {
    const invocations: Array<Parameters<CliProcessRunner>> = [];
    const runner: CliProcessRunner = async (...input) => {
      invocations.push(input);
      return { exitCode: 0, stderr: '', stdout: ' Copilot answer \n' };
    };
    const driver = createCopilotCliDriver({
      executablePath: copilotPath,
      runner,
      workspacePath,
    });

    const result = await driver.run({
      prompt: 'Explain binary search',
      systemPrompt: 'You are a concise tutor.',
      tools: [],
    });

    expect(result).toEqual({ contentMd: 'Copilot answer' });
    expect(invocations).toEqual([
      [
        copilotPath,
        [
          '-p',
          'You are a concise tutor.\n\nExplain binary search',
          '--available-tools=',
          '--disable-builtin-mcps',
          '--deny-tool=shell',
          '--deny-tool=write',
        ],
        { cwd: workspacePath, signal: undefined },
      ],
    ]);
  });

  it('checks Claude authentication with auth status before running prompts', async () => {
    const invocations: Array<Parameters<CliProcessRunner>> = [];
    const runner: CliProcessRunner = async (...input) => {
      invocations.push(input);
      return { exitCode: 0, stderr: '', stdout: 'Claude answer\n' };
    };
    const driver = createClaudeCliDriver({
      executablePath: claudePath,
      runner,
      workspacePath,
    });

    await expect(driver.healthCheck()).resolves.toEqual({
      message: 'Claude CLI is authenticated.',
      ok: true,
    });
    await expect(
      driver.run({ prompt: 'Explain queues', systemPrompt: 'Use markdown.', tools: [] }),
    ).resolves.toEqual({ contentMd: 'Claude answer' });
    expect(invocations).toEqual([
      [claudePath, ['auth', 'status'], { cwd: workspacePath, signal: undefined }],
      [
        claudePath,
        [
          '-p',
          'Use markdown.\n\nExplain queues',
          '--output-format',
          'text',
          '--no-session-persistence',
          '--tools',
          '',
        ],
        { cwd: workspacePath, signal: undefined },
      ],
    ]);
  });

  it('selects configured Copilot and Claude driver paths from setup state', () => {
    expect(
      createAgentDriverForSetup({
        runner: async () => ({ exitCode: 0, stderr: '', stdout: '' }),
        setup: createSetup('copilot'),
        workspacePath,
      }).kind,
    ).toBe('copilot');
    expect(
      createAgentDriverForSetup({
        runner: async () => ({ exitCode: 0, stderr: '', stdout: '' }),
        setup: createSetup('claude'),
        workspacePath,
      }).kind,
    ).toBe('claude');
  });

  it('falls back to default executable names for blank configured paths', async () => {
    const invocations: Array<Parameters<CliProcessRunner>> = [];
    const runner: CliProcessRunner = async (...input) => {
      invocations.push(input);
      return { exitCode: 0, stderr: '', stdout: 'OK' };
    };
    const driver = createCopilotCliDriver({
      executablePath: '',
      runner,
      workspacePath,
    });

    await driver.run({ prompt: 'Hello', tools: [] });

    expect(invocations[0][0]).toBe('copilot');
  });

  it('parses backend-mediated tool requests from CLI output', async () => {
    const invocations: Array<Parameters<CliProcessRunner>> = [];
    const driver = createCopilotCliDriver({
      executablePath: copilotPath,
      runner: async (...input) => {
        invocations.push(input);
        return {
          exitCode: 0,
          stderr: '',
          stdout:
            'I need context.\nCS_TOOL_CALL: {"name":"run_tests","arguments":{"taskId":"task-1"}}\n',
        };
      },
      workspacePath,
    });

    const result = await driver.run({
      prompt: useToolPrompt,
      tools: [{ description: 'Runs tests', name: runTestsToolName, parametersJsonSchema: '{}' }],
    });

    expect(result).toEqual({
      contentMd: 'I need context.',
      toolCalls: [{ argumentsJson: '{"taskId":"task-1"}', name: runTestsToolName }],
    });
    expect(invocations[0][1][1]).toContain('Available backend-mediated tools');
    expect(invocations[0][1][1]).toContain(runTestsToolName);
  });

  it('streams backend-mediated tool requests from CLI output', async () => {
    const driver = createCopilotCliDriver({
      executablePath: copilotPath,
      runner: async () => ({
        exitCode: 0,
        stderr: '',
        stdout:
          'I need context.\nCS_TOOL_CALL: {"name":"run_tests","arguments":{"taskId":"task-1"}}\n',
      }),
      workspacePath,
    });

    const events = [];
    for await (const event of driver.stream({
      prompt: useToolPrompt,
      tools: [{ description: 'Runs tests', name: runTestsToolName, parametersJsonSchema: '{}' }],
    })) {
      events.push(event);
    }

    expect(events).toEqual([
      { delta: 'I need context.', type: 'content' },
      {
        toolCall: { argumentsJson: '{"taskId":"task-1"}', name: runTestsToolName },
        type: 'tool_call',
      },
    ]);
  });

  it('rejects malformed backend-mediated tool request JSON', async () => {
    const driver = createCopilotCliDriver({
      executablePath: copilotPath,
      runner: async () => ({
        exitCode: 0,
        stderr: '',
        stdout: 'CS_TOOL_CALL: {"name":',
      }),
      workspacePath,
    });

    await expect(driver.run({ prompt: useToolPrompt, tools: [] })).rejects.toThrow(
      'CLI returned an invalid mediated tool call',
    );
  });

  it('reports failed CLI health checks without throwing', async () => {
    const driver = createClaudeCliDriver({
      executablePath: claudePath,
      runner: async () => ({
        exitCode: 1,
        stderr: 'not logged in',
        stdout: '',
      }),
      workspacePath,
    });

    await expect(driver.healthCheck()).resolves.toEqual({
      message: 'not logged in',
      ok: false,
    });
  });

  it('reports missing CLI executables as unhealthy', async () => {
    const driver = createCopilotCliDriver({
      executablePath: '/missing/copilot',
      runner: async () => {
        throw new Error('spawn /missing/copilot ENOENT');
      },
      workspacePath,
    });

    await expect(driver.healthCheck()).resolves.toEqual({
      message: 'spawn /missing/copilot ENOENT',
      ok: false,
    });
  });
});
