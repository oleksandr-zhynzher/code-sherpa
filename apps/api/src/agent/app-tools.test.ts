import { describe, expect, it } from 'vitest';

import type { CodeSherpaDatabase } from '../storage/database.js';
import { createAppAgentToolRegistry } from './app-tools.js';

describe('app agent tools', () => {
  it('exposes read-only learning context tools backed by the database facade', async () => {
    const registry = createAppAgentToolRegistry({
      getResumeState: () => ({ lastEvent: null, path: null, task: null, topic: null }),
      getTaskContext: (id: string) => ({
        difficulty: 'easy',
        id,
        language: 'typescript',
        lastRunAt: null,
        lastRunPass: null,
        position: 1,
        promptMd: 'Solve two sum.',
        slug: 'two-sum',
        solutionPath: null,
        status: 'todo',
        testPath: null,
        title: 'Two Sum',
        topicId: 'topic-1',
        topicSlug: 'arrays',
      }),
    } as CodeSherpaDatabase);

    expect(registry.definitions.map((tool) => tool.name)).toEqual([
      'get_resume_state',
      'get_task_context',
    ]);
    await expect(
      registry.execute({
        argumentsJson: '{"taskId":"task-1"}',
        name: 'get_task_context',
      }),
    ).resolves.toMatchObject({
      name: 'get_task_context',
      resultJson: expect.stringContaining('Two Sum'),
      status: 'ok',
    });
  });

  it('validates mediated tool arguments before touching the database', async () => {
    let called = false;
    const registry = createAppAgentToolRegistry({
      getResumeState: () => ({ lastEvent: null, path: null, task: null, topic: null }),
      getTaskContext: () => {
        called = true;
        throw new Error('should not be called');
      },
    } as unknown as CodeSherpaDatabase);

    await expect(
      registry.execute({
        argumentsJson: '{"taskId":""}',
        name: 'get_task_context',
      }),
    ).rejects.toThrow('Invalid get_task_context arguments');
    expect(called).toBe(false);
  });
});
