import { describe, expect, it } from 'vitest';

import { createAgentToolRegistry } from './tool-registry.js';

const taskContextToolName = 'get_task_context';
const taskContextSchema = '{"type":"object"}';
const taskContextDescription = 'Looks up task context';

describe('AgentToolRegistry', () => {
  it('executes only registered tools with parsed JSON arguments', async () => {
    const registry = createAgentToolRegistry([
      {
        description: taskContextDescription,
        execute: async (args) => ({ received: args }),
        name: taskContextToolName,
        parametersJsonSchema: taskContextSchema,
      },
    ]);

    expect(registry.definitions).toEqual([
      {
        description: taskContextDescription,
        name: taskContextToolName,
        parametersJsonSchema: taskContextSchema,
      },
    ]);
    await expect(
      registry.execute({ argumentsJson: '{"taskId":"task-1"}', name: taskContextToolName }),
    ).resolves.toEqual({
      argumentsJson: '{"taskId":"task-1"}',
      name: taskContextToolName,
      resultJson: '{"received":{"taskId":"task-1"}}',
      status: 'ok',
    });
  });

  it('rejects unregistered tools and malformed arguments without executing handlers', async () => {
    let executed = false;
    const registry = createAgentToolRegistry([
      {
        description: taskContextDescription,
        execute: async () => {
          executed = true;
          return {};
        },
        name: taskContextToolName,
        parametersJsonSchema: taskContextSchema,
      },
    ]);

    await expect(
      registry.execute({ argumentsJson: '{}', name: 'delete_everything' }),
    ).rejects.toThrow('Agent tool delete_everything is not registered');
    await expect(
      registry.execute({ argumentsJson: 'not-json', name: taskContextToolName }),
    ).rejects.toThrow('Agent tool get_task_context received invalid JSON arguments');
    expect(executed).toBe(false);
  });
});
