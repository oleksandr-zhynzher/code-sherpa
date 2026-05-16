import { z } from 'zod';

import type { CodeSherpaDatabase } from '../storage/database.js';
import { createAgentToolRegistry } from './tool-registry.js';

const emptyArgsSchema = z.object({}).strict();
const taskContextArgsSchema = z
  .object({
    taskId: z.string().trim().min(1).max(200),
  })
  .strict();

export function createAppAgentToolRegistry(db: CodeSherpaDatabase) {
  return createAgentToolRegistry([
    {
      description: 'Returns the current learning resume state with path, topic, and task ids',
      execute: async (args) => {
        const result = emptyArgsSchema.safeParse(args);
        if (!result.success) {
          throw new Error('Invalid get_resume_state arguments');
        }

        return db.getResumeState();
      },
      name: 'get_resume_state',
      parametersJsonSchema: '{"type":"object","additionalProperties":false}',
    },
    {
      description: 'Returns read-only task context for a learning task id',
      execute: async (args) => {
        const result = taskContextArgsSchema.safeParse(args);
        if (!result.success) {
          throw new Error('Invalid get_task_context arguments');
        }

        return db.getTaskContext(result.data.taskId);
      },
      name: 'get_task_context',
      parametersJsonSchema:
        '{"type":"object","properties":{"taskId":{"type":"string","minLength":1,"maxLength":200}},"required":["taskId"],"additionalProperties":false}',
    },
  ]);
}
