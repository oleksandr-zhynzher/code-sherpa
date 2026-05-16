import { describe, expect, it } from 'vitest';

import type { CliProcessRunner } from './agent/cli-driver.js';
import { buildServer } from './server.js';

const plansUrl = '/api/plans';
const setupUrl = '/api/setup';
const workspacePath = '/tmp/code-sherpa-workspace';
const claudePath = '/opt/bin/claude';
const copilotPath = '/opt/bin/copilot';

describe('POC data API', () => {
  it('creates and returns a learning plan with topics and tasks', async () => {
    const server = await buildServer({ dbPath: ':memory:', logger: false });

    const createResponse = await server.inject({
      method: 'POST',
      payload: { goal: 'graphs and dynamic programming in three weeks' },
      url: plansUrl,
    });

    expect(createResponse.statusCode).toBe(201);
    const plan = createResponse.json();
    expect(plan.title).toContain('graphs and dynamic programming');
    expect(plan.topics).toHaveLength(3);
    expect(plan.topics[0].tasks.length).toBeGreaterThan(0);

    const listResponse = await server.inject({
      method: 'GET',
      url: plansUrl,
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().data).toHaveLength(1);

    await server.close();
  });

  it('returns a structured validation error for invalid plan requests', async () => {
    const server = await buildServer({ dbPath: ':memory:', logger: false });

    const response = await server.inject({
      method: 'POST',
      payload: { goal: '' },
      url: plansUrl,
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await server.close();
  });

  it('exposes learning path aliases for the production contract', async () => {
    const server = await buildServer({ dbPath: ':memory:', logger: false });

    const createResponse = await server.inject({
      method: 'POST',
      payload: { goal: 'hash maps for interviews' },
      url: '/api/paths',
    });

    expect(createResponse.statusCode).toBe(201);
    const path = createResponse.json();
    expect(path.title).toContain('hash maps for interviews');

    const listResponse = await server.inject({
      method: 'GET',
      url: '/api/paths',
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().data).toHaveLength(1);

    const detailResponse = await server.inject({
      method: 'GET',
      url: `/api/paths/${path.id}`,
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().id).toBe(path.id);

    const resumeResponse = await server.inject({
      method: 'GET',
      url: '/api/resume',
    });
    expect(resumeResponse.statusCode).toBe(200);
    expect(resumeResponse.json().path.id).toBe(path.id);
    expect(resumeResponse.json().lastEvent.eventType).toBe('path_created');

    const progressResponse = await server.inject({
      method: 'GET',
      url: '/api/progress?limit=1',
    });
    expect(progressResponse.statusCode).toBe(200);
    expect(progressResponse.json().data).toHaveLength(1);

    await server.close();
  });

  it('saves setup settings without exposing secrets', async () => {
    const server = await buildServer({
      dbPath: ':memory:',
      logger: false,
      workspacePath,
    });

    const response = await server.inject({
      method: 'POST',
      payload: {
        agentDriver: 'copilot',
        claudePath: '/usr/local/bin/claude',
        copilotPath: '/usr/local/bin/copilot',
        exerciseLanguage: 'typescript',
        guideTone: 'encouraging',
        safeRunChecks: true,
        autoSaveProgress: false,
        repoUrl: 'git@github.com:example/algorithms.git',
      },
      url: setupUrl,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      agentDriver: 'copilot',
      autoSaveProgress: false,
      claudePath: '/usr/local/bin/claude',
      copilotPath: '/usr/local/bin/copilot',
      exerciseLanguage: 'typescript',
      guideTone: 'encouraging',
      repoUrl: 'git@github.com:example/algorithms.git',
      safeRunChecks: true,
      workspacePath,
    });

    await server.close();
  });

  it('normalizes blank CLI paths when saving setup settings', async () => {
    const server = await buildServer({
      dbPath: ':memory:',
      logger: false,
      workspacePath,
    });

    const response = await server.inject({
      method: 'POST',
      payload: {
        agentDriver: 'copilot',
        claudePath: '   ',
        copilotPath: '',
        exerciseLanguage: 'python',
        guideTone: 'encouraging',
        safeRunChecks: true,
      },
      url: setupUrl,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().claudePath).toBeNull();
    expect(response.json().copilotPath).toBeNull();

    await server.close();
  });

  it('checks the selected local CLI agent from setup settings', async () => {
    const calls: Array<Parameters<CliProcessRunner>> = [];
    const runner: CliProcessRunner = async (...input) => {
      calls.push(input);
      return { exitCode: 0, stderr: '', stdout: '{"status":"ok"}' };
    };
    const server = await buildServer({
      agentProcessRunner: runner,
      dbPath: ':memory:',
      logger: false,
      workspacePath,
    });

    await server.inject({
      method: 'POST',
      payload: {
        agentDriver: 'claude',
        claudePath,
        exerciseLanguage: 'typescript',
        guideTone: 'socratic',
        safeRunChecks: true,
      },
      url: setupUrl,
    });
    const response = await server.inject({
      method: 'GET',
      url: '/api/agent/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      driver: 'claude',
      health: { message: 'Claude CLI is authenticated.', ok: true },
    });
    expect(calls).toEqual([
      [claudePath, ['auth', 'status'], { cwd: workspacePath, signal: expect.any(AbortSignal) }],
    ]);

    await server.close();
  });

  it('runs prompts through the selected local CLI agent and persists the session', async () => {
    const calls: Array<Parameters<CliProcessRunner>> = [];
    const runner: CliProcessRunner = async (...input) => {
      calls.push(input);
      return { exitCode: 0, stderr: '', stdout: 'Use two pointers.\n' };
    };
    const server = await buildServer({
      agentProcessRunner: runner,
      dbPath: ':memory:',
      logger: false,
      workspacePath,
    });

    await server.inject({
      method: 'POST',
      payload: {
        agentDriver: 'copilot',
        copilotPath,
        exerciseLanguage: 'python',
        guideTone: 'direct',
        safeRunChecks: true,
      },
      url: setupUrl,
    });
    const response = await server.inject({
      method: 'POST',
      payload: {
        prompt: 'How should I solve two sum?',
      },
      url: '/api/agent/run',
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      driver: 'copilot',
      result: { contentMd: 'Use two pointers.' },
    });
    expect(calls).toEqual([
      [
        copilotPath,
        [
          '-p',
          'You are Code Sherpa, a direct DSA tutor. Explain concepts without executing commands or editing files.\n\nHow should I solve two sum?',
          '--deny-tool=shell',
          '--deny-tool=write',
        ],
        { cwd: workspacePath, signal: expect.any(AbortSignal) },
      ],
    ]);

    await server.close();
  });
});
