import { describe, expect, it } from 'vitest';

import { buildServer } from './server.js';

const plansUrl = '/api/plans';

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

  it('saves setup settings without exposing secrets', async () => {
    const server = await buildServer({
      dbPath: ':memory:',
      logger: false,
      workspacePath: '/tmp/code-sherpa-workspace',
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
      url: '/api/setup',
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
      workspacePath: '/tmp/code-sherpa-workspace',
    });

    await server.close();
  });
});
