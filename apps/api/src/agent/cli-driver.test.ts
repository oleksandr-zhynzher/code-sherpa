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

  it('rejects direct CLI tool requests until backend mediation is implemented', async () => {
    const driver = createCopilotCliDriver({
      executablePath: copilotPath,
      runner: async () => ({ exitCode: 0, stderr: '', stdout: 'OK' }),
      workspacePath,
    });

    await expect(
      driver.run({
        prompt: 'Use a tool',
        tools: [{ description: 'Runs tests', name: 'run_tests', parametersJsonSchema: '{}' }],
      }),
    ).rejects.toThrow('CLI tool mediation is not enabled yet');
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
