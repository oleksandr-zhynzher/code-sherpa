import { describe, expect, it } from 'vitest';

import { buildServer } from '../server.js';

describe('POC agent flows', () => {
  it('generates topic explanations and task visualizations', async () => {
    const server = await buildServer({ dbPath: ':memory:', logger: false });
    const planResponse = await server.inject({
      method: 'POST',
      payload: { goal: 'graphs practice' },
      url: '/api/plans',
    });
    const topicId = planResponse.json().topics[1].id;
    const taskId = planResponse.json().topics[1].tasks[0].id;

    const explainResponse = await server.inject({
      method: 'POST',
      url: `/api/topics/${topicId}/explain`,
    });

    expect(explainResponse.statusCode).toBe(200);
    expect(explainResponse.json().explanationMd).toContain('Graph Foundations');

    const chatResponse = await server.inject({
      method: 'POST',
      payload: { message: 'visualize BFS expansion' },
      url: `/api/tasks/${taskId}/chat`,
    });

    expect(chatResponse.statusCode).toBe(201);
    expect(chatResponse.json().assistantMessage.contentMd).toContain('layer-by-layer');
    expect(chatResponse.json().visualization.kind).toBe('mermaid');

    await server.close();
  });
});
