import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { createAgentSessionRepository } from './agent-session-repository.js';
import { runMigrations } from './migrations.js';

describe('AgentSessionRepository', () => {
  it('persists completed and failed agent sessions', async () => {
    const db = new DatabaseSync(':memory:');
    runMigrations(db);
    const repository = createAgentSessionRepository(db);

    const completedId = await repository.start({
      driver: 'fake',
      prompt: 'Explain queues',
      systemPrompt: 'You are a tutor',
    });
    await repository.complete(completedId, {
      contentMd: 'Queues are FIFO.',
      durationMs: 42,
      toolCalls: [{ argumentsJson: '{"topic":"queues"}', name: 'create_quiz' }],
    });

    expect(repository.get(completedId)).toMatchObject({
      driver: 'fake',
      prompt: 'Explain queues',
      responseMd: 'Queues are FIFO.',
      status: 'completed',
      systemPrompt: 'You are a tutor',
      toolCalls: [{ argumentsJson: '{"topic":"queues"}', name: 'create_quiz' }],
    });

    const failedId = await repository.start({
      driver: 'fake',
      prompt: 'Explain stacks',
    });
    await repository.fail(failedId, {
      contentMd: 'Partial answer',
      durationMs: 5,
      errorMessage: 'CLI is not authenticated',
      toolCalls: [{ argumentsJson: '{"topic":"stacks"}', name: 'create_quiz' }],
    });

    expect(repository.get(failedId)).toMatchObject({
      errorMessage: 'CLI is not authenticated',
      responseMd: 'Partial answer',
      status: 'failed',
      toolCalls: [{ argumentsJson: '{"topic":"stacks"}', name: 'create_quiz' }],
    });

    await expect(
      repository.complete('missing-session', { contentMd: 'missing', durationMs: 1 }),
    ).rejects.toThrow('Agent session missing-session was not found');

    db.prepare('UPDATE agent_session SET tool_calls_json = ? WHERE id = ?').run(
      'not-json',
      completedId,
    );
    expect(() => repository.get(completedId)).toThrow(
      `Agent session ${completedId} has corrupted tool call data`,
    );

    db.close();
  });
});
