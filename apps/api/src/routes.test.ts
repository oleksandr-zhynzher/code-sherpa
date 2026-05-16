import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { CliProcessRunner } from './agent/cli-driver.js';
import { buildServer } from './server.js';

const plansUrl = '/api/plans';
const setupUrl = '/api/setup';
const agentRunUrl = '/api/agent/run';
const repoLinkUrl = '/api/repo/link';
const workspacePath = '/tmp/code-sherpa-workspace';
const claudePath = '/opt/bin/claude';
const copilotPath = '/opt/bin/copilot';
const repoUrl = 'git@github.com:example/algorithms.git';
const agentPlanTitle = 'Graphs and Dynamic Programming Path';
const defaultGoal = 'graphs and dynamic programming in three weeks';
const tempBaseDirPrefix = 'code-sherpa-base-';
const agentPlanJson = JSON.stringify({
  title: agentPlanTitle,
  topics: [
    {
      tasks: [
        {
          difficulty: 'easy',
          language: 'python',
          promptMd: 'Implement two pointer palindrome validation.',
          title: 'Valid Palindrome',
        },
      ],
      title: 'Arrays & Two Pointers',
    },
    {
      tasks: [
        {
          difficulty: 'medium',
          language: 'python',
          promptMd: 'Implement BFS shortest path.',
          title: 'BFS Shortest Path',
        },
      ],
      title: 'Graph Foundations',
    },
  ],
});
const longSlug = 'a'.repeat(80);
const longAgentPlanJson = JSON.stringify({
  title: 'A'.repeat(120),
  topics: [
    {
      slug: longSlug,
      tasks: [
        {
          difficulty: 'medium',
          language: 'python',
          promptMd: 'Implement a bounded id regression exercise.',
          slug: longSlug,
          title: 'T'.repeat(120),
        },
      ],
      title: 'B'.repeat(120),
    },
  ],
});

async function canonicalWorkspacePath(path: string): Promise<string> {
  return join(await realpath(dirname(path)), basename(path));
}

describe('POC data API', () => {
  it('creates and returns a learning plan with topics and tasks', async () => {
    const server = await buildServer({
      agentProcessRunner: async () => ({ exitCode: 0, stderr: '', stdout: agentPlanJson }),
      dbPath: ':memory:',
      logger: false,
    });

    const createResponse = await server.inject({
      method: 'POST',
      payload: { goal: defaultGoal },
      url: plansUrl,
    });

    expect(createResponse.statusCode).toBe(201);
    const plan = createResponse.json();
    expect(plan.title).toBe(agentPlanTitle);
    expect(plan.topics).toHaveLength(2);
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
    const server = await buildServer({
      agentProcessRunner: async () => ({ exitCode: 0, stderr: '', stdout: agentPlanJson }),
      dbPath: ':memory:',
      logger: false,
    });

    const createResponse = await server.inject({
      method: 'POST',
      payload: { goal: 'hash maps for interviews' },
      url: '/api/paths',
    });

    expect(createResponse.statusCode).toBe(201);
    const path = createResponse.json();
    expect(path.title).toBe(agentPlanTitle);

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

  it('keeps agent-generated IDs within route and tool validation limits', async () => {
    let taskId = '';
    let promptCount = 0;
    const server = await buildServer({
      agentProcessRunner: async () => {
        promptCount += 1;
        return {
          exitCode: 0,
          stderr: '',
          stdout:
            promptCount === 1
              ? longAgentPlanJson
              : promptCount === 2
                ? `CS_TOOL_CALL: {"name":"get_task_context","arguments":{"taskId":"${taskId}"}}\n`
                : 'Context loaded.',
        };
      },
      dbPath: ':memory:',
      logger: false,
    });

    const createResponse = await server.inject({
      method: 'POST',
      payload: { goal: 'very long generated slugs' },
      url: plansUrl,
    });
    taskId = createResponse.json().topics[0].tasks[0].id;

    expect(taskId.length).toBeLessThanOrEqual(200);
    const taskResponse = await server.inject({
      method: 'GET',
      url: `/api/tasks/${taskId}`,
    });
    expect(taskResponse.statusCode).toBe(200);

    const agentResponse = await server.inject({
      method: 'POST',
      payload: { prompt: 'Use the long task id.' },
      url: agentRunUrl,
    });
    expect(agentResponse.statusCode).toBe(201);
    expect(agentResponse.json().result.toolResults[0].resultJson).toContain(taskId);

    await server.close();
  });

  it('returns a canonical absolute workspace path from GET /api/setup with no saved row', async () => {
    const server = await buildServer({ dbPath: ':memory:', logger: false });

    const response = await server.inject({ method: 'GET', url: setupUrl });

    expect(response.statusCode).toBe(200);
    const returnedPath = response.json().workspacePath as string;
    expect(returnedPath).toBeTruthy();
    expect(returnedPath.startsWith('/')).toBe(true);
    expect(returnedPath).not.toBe('./workspace');

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
        repoUrl,
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
      repoUrl,
      safeRunChecks: true,
      workspacePath: await canonicalWorkspacePath(workspacePath),
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

  it('links a local workspace folder and reports git repository status', async () => {
    const workspaceBasePath = await mkdtemp(join(tmpdir(), tempBaseDirPrefix));
    const linkedWorkspace = join(workspaceBasePath, 'linked-workspace');
    const server = await buildServer({
      dbPath: ':memory:',
      logger: false,
      workspaceBasePath,
      workspacePath: join(workspaceBasePath, 'workspace'),
    });

    const missingStatusResponse = await server.inject({
      method: 'GET',
      url: '/api/repo/status',
    });
    expect(missingStatusResponse.statusCode).toBe(200);
    expect(missingStatusResponse.json().status.exists).toBe(false);

    const linkResponse = await server.inject({
      method: 'POST',
      payload: {
        repoUrl: null,
        workspacePath: linkedWorkspace,
      },
      url: repoLinkUrl,
    });

    expect(linkResponse.statusCode).toBe(200);
    const normalizedLinkedWorkspace = await realpath(linkedWorkspace);
    expect(linkResponse.json().setup.workspacePath).toBe(normalizedLinkedWorkspace);
    expect(linkResponse.json().status).toMatchObject({
      exists: true,
      isGitRepository: true,
      ok: true,
      remoteUrl: null,
    });

    const savedSetupResponse = await server.inject({
      method: 'GET',
      url: setupUrl,
    });
    expect(savedSetupResponse.json().workspacePath).toBe(normalizedLinkedWorkspace);

    await server.close();
    await rm(workspaceBasePath, { force: true, recursive: true });
  });

  it('rejects unsafe repository URLs when linking a workspace', async () => {
    const linkedWorkspace = await mkdtemp(join(tmpdir(), 'code-sherpa-linked-workspace-'));
    const server = await buildServer({
      dbPath: ':memory:',
      logger: false,
      workspacePath,
    });

    const response = await server.inject({
      method: 'POST',
      payload: {
        repoUrl: 'file:///tmp/repo.git',
        workspacePath: linkedWorkspace,
      },
      url: repoLinkUrl,
    });

    expect(response.statusCode).toBe(422);

    await server.close();
    await rm(linkedWorkspace, { force: true, recursive: true });
  });

  it('rejects workspace folders outside the configured workspace base', async () => {
    const workspaceBasePath = await mkdtemp(join(tmpdir(), tempBaseDirPrefix));
    const outsideWorkspace = await mkdtemp(join(tmpdir(), 'code-sherpa-outside-workspace-'));
    const server = await buildServer({
      dbPath: ':memory:',
      logger: false,
      workspaceBasePath,
      workspacePath: join(workspaceBasePath, 'workspace'),
    });

    const response = await server.inject({
      method: 'POST',
      payload: {
        repoUrl: null,
        workspacePath: outsideWorkspace,
      },
      url: repoLinkUrl,
    });

    expect(response.statusCode).toBe(409);

    await server.close();
    await rm(workspaceBasePath, { force: true, recursive: true });
    await rm(outsideWorkspace, { force: true, recursive: true });
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
      [
        claudePath,
        ['auth', 'status'],
        { cwd: await canonicalWorkspacePath(workspacePath), signal: expect.any(AbortSignal) },
      ],
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
      url: agentRunUrl,
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
          expect.stringContaining('How should I solve two sum?'),
          '--available-tools=',
          '--disable-builtin-mcps',
          '--deny-tool=shell',
          '--deny-tool=write',
        ],
        { cwd: await canonicalWorkspacePath(workspacePath), signal: expect.any(AbortSignal) },
      ],
    ]);
    expect(calls[0][1][1]).toContain('Available backend-mediated tools');
    expect(calls[0][1][1]).toContain('get_task_context');

    await server.close();
  });

  it('executes mediated backend tool requests from local CLI output', async () => {
    let taskId = '';
    let promptCount = 0;
    const runner: CliProcessRunner = async () => {
      promptCount += 1;
      return {
        exitCode: 0,
        stderr: '',
        stdout:
          promptCount === 1
            ? agentPlanJson
            : promptCount === 2
              ? `Need context.\nCS_TOOL_CALL: {"name":"get_task_context","arguments":{"taskId":"${taskId}"}}\n`
              : 'Use a hash map.',
      };
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
    const planResponse = await server.inject({
      method: 'POST',
      payload: { goal: 'arrays and hash maps' },
      url: plansUrl,
    });
    taskId = planResponse.json().topics[0].tasks[0].id;

    const response = await server.inject({
      method: 'POST',
      payload: {
        prompt: 'Use app context.',
      },
      url: agentRunUrl,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().result).toMatchObject({
      contentMd: 'Need context.\n\nUse a hash map.',
      toolCalls: [{ argumentsJson: `{"taskId":"${taskId}"}`, name: 'get_task_context' }],
      toolResults: [
        {
          argumentsJson: `{"taskId":"${taskId}"}`,
          name: 'get_task_context',
          resultJson: expect.stringContaining(taskId),
          status: 'ok',
        },
      ],
    });

    await server.close();
  });
});

describe('code generation lifecycle', () => {
  it('creates a generation record when scaffolding a task for the first time', async () => {
    const workspaceBasePath = await mkdtemp(join(tmpdir(), tempBaseDirPrefix));
    const server = await buildServer({
      agentProcessRunner: async () => ({ exitCode: 0, stderr: '', stdout: agentPlanJson }),
      dbPath: ':memory:',
      logger: false,
      workspaceBasePath,
      workspacePath: join(workspaceBasePath, 'workspace'),
    });

    const planResponse = await server.inject({
      method: 'POST',
      payload: { goal: defaultGoal },
      url: plansUrl,
    });
    const taskId = planResponse.json().topics[0].tasks[0].id;

    const scaffoldResponse = await server.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/scaffold`,
    });

    expect(scaffoldResponse.statusCode).toBe(201);
    const body = scaffoldResponse.json();
    expect(body.generation).toMatchObject({
      id: expect.stringContaining('gen-'),
      taskId,
      status: 'completed',
      generatedPaths: [
        expect.stringContaining('solution.py'),
        expect.stringContaining('test_solution.py'),
      ],
    });

    const generationResponse = await server.inject({
      method: 'GET',
      url: `/api/tasks/${taskId}/generation`,
    });

    expect(generationResponse.statusCode).toBe(200);
    expect(generationResponse.json().generation).toMatchObject({
      id: body.generation.id,
      status: 'completed',
    });

    await server.close();
    await rm(workspaceBasePath, { force: true, recursive: true });
  });

  it('creates a new generation record on repeat scaffold without overwriting files', async () => {
    const workspaceBasePath = await mkdtemp(join(tmpdir(), tempBaseDirPrefix));
    const server = await buildServer({
      agentProcessRunner: async () => ({ exitCode: 0, stderr: '', stdout: agentPlanJson }),
      dbPath: ':memory:',
      logger: false,
      workspaceBasePath,
      workspacePath: join(workspaceBasePath, 'workspace'),
    });

    const planResponse = await server.inject({
      method: 'POST',
      payload: { goal: defaultGoal },
      url: plansUrl,
    });
    const taskId = planResponse.json().topics[0].tasks[0].id;

    await server.inject({ method: 'POST', url: `/api/tasks/${taskId}/scaffold` });
    await server.inject({
      method: 'PUT',
      payload: { content: 'def solve(): return 42' },
      url: `/api/tasks/${taskId}/solution`,
    });

    const reScaffoldResponse = await server.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/scaffold`,
    });

    expect(reScaffoldResponse.statusCode).toBe(201);
    expect(reScaffoldResponse.json().files.solution).toBe('def solve(): return 42');

    await server.close();
    await rm(workspaceBasePath, { force: true, recursive: true });
  });

  it('returns null generation for a task that has not been scaffolded', async () => {
    const server = await buildServer({
      agentProcessRunner: async () => ({ exitCode: 0, stderr: '', stdout: agentPlanJson }),
      dbPath: ':memory:',
      logger: false,
    });

    const planResponse = await server.inject({
      method: 'POST',
      payload: { goal: defaultGoal },
      url: plansUrl,
    });
    const taskId = planResponse.json().topics[0].tasks[0].id;

    const generationResponse = await server.inject({
      method: 'GET',
      url: `/api/tasks/${taskId}/generation`,
    });

    expect(generationResponse.statusCode).toBe(200);
    expect(generationResponse.json().generation).toBeNull();

    await server.close();
  });
});
