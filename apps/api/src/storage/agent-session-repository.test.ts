import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { createAgentSessionRepository } from './agent-session-repository.js';
import { runMigrations } from './migrations.js';

const createQuizToolName = 'create_quiz';
const queuesToolArgsJson = '{"topic":"queues"}';
const stacksToolArgsJson = '{"topic":"stacks"}';

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
      toolCalls: [{ argumentsJson: queuesToolArgsJson, name: createQuizToolName }],
      toolResults: [
        {
          argumentsJson: queuesToolArgsJson,
          name: createQuizToolName,
          resultJson: '{"quizId":"quiz-1"}',
          status: 'ok',
        },
      ],
    });

    expect(repository.get(completedId)).toMatchObject({
      driver: 'fake',
      prompt: 'Explain queues',
      responseMd: 'Queues are FIFO.',
      status: 'completed',
      systemPrompt: 'You are a tutor',
      toolCalls: [{ argumentsJson: queuesToolArgsJson, name: createQuizToolName }],
      toolResults: [
        {
          argumentsJson: queuesToolArgsJson,
          name: createQuizToolName,
          resultJson: '{"quizId":"quiz-1"}',
          status: 'ok',
        },
      ],
    });

    const failedId = await repository.start({
      driver: 'fake',
      prompt: 'Explain stacks',
    });
    await repository.fail(failedId, {
      contentMd: 'Partial answer',
      durationMs: 5,
      errorMessage: 'CLI is not authenticated',
      toolCalls: [{ argumentsJson: stacksToolArgsJson, name: createQuizToolName }],
      toolResults: [
        {
          argumentsJson: stacksToolArgsJson,
          name: createQuizToolName,
          resultJson: '{"quizId":"quiz-2"}',
          status: 'ok',
        },
      ],
    });

    expect(repository.get(failedId)).toMatchObject({
      errorMessage: 'CLI is not authenticated',
      responseMd: 'Partial answer',
      status: 'failed',
      toolCalls: [{ argumentsJson: stacksToolArgsJson, name: createQuizToolName }],
      toolResults: [
        {
          argumentsJson: stacksToolArgsJson,
          name: createQuizToolName,
          resultJson: '{"quizId":"quiz-2"}',
          status: 'ok',
        },
      ],
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

    db.prepare(
      'UPDATE agent_session SET tool_calls_json = ?, tool_results_json = ? WHERE id = ?',
    ).run('[]', 'not-json', completedId);
    expect(() => repository.get(completedId)).toThrow(
      `Agent session ${completedId} has corrupted tool result data`,
    );

    db.close();
  });
});
