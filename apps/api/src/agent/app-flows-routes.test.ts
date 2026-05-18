import { describe, expect, it } from 'vitest';

import { buildServer } from '../server.js';
import type { CliProcessRunner } from './cli-driver.js';

const agentPlanJson = JSON.stringify({
  title: 'Graph Practice Path',
  topics: [
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

describe('agent-backed app flows', () => {
  it('generates topic explanations and task visualizations through the configured agent', async () => {
    const responses = [
      agentPlanJson,
      '## Graph Foundations\nBFS expands a graph layer by layer.',
      JSON.stringify({
        responseMd: 'Here is the BFS expansion by layer.',
        visualization: {
          kind: 'mermaid',
          payload: 'flowchart LR\nA-->B',
        },
      }),
    ];
    const runner: CliProcessRunner = async () => ({
      exitCode: 0,
      stderr: '',
      stdout: responses.shift() ?? '',
    });
    const server = await buildServer({
      agentProcessRunner: runner,
      dbPath: ':memory:',
      logger: false,
    });
    const planResponse = await server.inject({
      method: 'POST',
      payload: { goal: 'graphs practice' },
      url: '/api/plans',
    });
    const topicId = planResponse.json().topics[0].id;
    const taskId = planResponse.json().topics[0].tasks[0].id;

    const explainResponse = await server.inject({
      method: 'POST',
      url: `/api/topics/${topicId}/explain`,
    });

    expect(explainResponse.statusCode).toBe(200);
    expect(explainResponse.json().explanationMd).toContain('BFS expands');

    const chatResponse = await server.inject({
      method: 'POST',
      payload: { message: 'visualize BFS expansion' },
      url: `/api/tasks/${taskId}/chat`,
    });

    expect(chatResponse.statusCode).toBe(201);
    expect(chatResponse.json().assistantMessage.contentMd).toContain('BFS expansion');
    expect(chatResponse.json().visualization.kind).toBe('mermaid');

    await server.close();
  });
});
