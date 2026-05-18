import { z } from 'zod';

import { isAllowedGitHubRepoUrl } from '../domain/repo-url.js';

export const createLearningPathSchema = z.object({
  goal: z.string().trim().min(3).max(500),
});

export const createPlanSchema = createLearningPathSchema;

export const idParamsSchema = z.object({
  id: z.string().trim().min(1).max(200),
});

export const progressListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const optionalCliPathSchema = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .optional()
  .transform((value) => (value == null || value.length === 0 ? undefined : value));

const optionalWorkspacePathSchema = z.string().trim().min(1).max(500).optional();

const repoUrlValueSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value.length === 0 || isAllowedGitHubRepoUrl(value), {
    message: 'Repository URL must be a GitHub HTTPS or SSH URL',
  })
  .transform((value) => (value.length === 0 ? null : value));

const optionalRepoUrlSchema = z.union([repoUrlValueSchema, z.null()]).optional();

export const setupSchema = z.object({
  agentDriver: z.enum(['claude', 'copilot']).default('copilot'),
  agentModel: z.string().max(100).nullable().optional(),
  autoSaveProgress: z.boolean().default(true),
  claudePath: optionalCliPathSchema,
  copilotPath: optionalCliPathSchema,
  exerciseLanguage: z.enum(['python', 'typescript']).default('python'),
  guideTone: z.enum(['direct', 'encouraging', 'socratic']).default('encouraging'),
  repoUrl: optionalRepoUrlSchema,
  safeRunChecks: z.boolean().default(true),
  workspacePath: optionalWorkspacePathSchema,
});

export const repoLinkSchema = z.object({
  repoUrl: optionalRepoUrlSchema,
  workspacePath: optionalWorkspacePathSchema,
});

export const solutionUpdateSchema = z.object({
  content: z.string().max(50_000),
});

export const commitTaskSchema = z.object({
  message: z.string().trim().min(3).max(120).optional(),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2_000),
});

export const agentRunRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(8_000),
});

export const fsPathQuerySchema = z.object({
  path: z.string().trim().min(1).max(500),
});

export const threadScopeQuerySchema = z.object({
  scopeId: z.string().trim().min(1).max(200),
  scopeType: z.enum(['path', 'quiz', 'setup', 'task', 'topic']),
});

const guideActionContextSchema = z
  .object({
    code: z.string().max(10_000).optional(),
    exercisePrompt: z.string().max(5_000).optional(),
    selectedText: z.string().max(2_000).optional(),
    testOutput: z.string().max(5_000).optional(),
    topicMd: z.string().max(10_000).optional(),
  })
  .optional();

export const guideActionSchema = z.object({
  action: z.enum(['break_it_down', 'explain_concept', 'explain_error', 'small_hint']),
  context: guideActionContextSchema,
});

export const createVisualizationSchema = z.object({
  kind: z.enum(['chartjs', 'mermaid', 'svg']),
  payload: z.string().trim().min(1).max(50_000),
  prompt: z.string().trim().min(1).max(500),
  taskId: z.string().trim().min(1).max(200),
});

export const quizAnswerSchema = z.object({
  selectedAnswer: z.string().trim().min(1).max(2_000),
});

export const quizAnswerParamsSchema = z.object({
  id: z.string().trim().min(1).max(200),
  questionId: z.string().trim().min(1).max(200),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type CreateLearningPathInput = z.infer<typeof createLearningPathSchema>;
export type SetupInput = z.infer<typeof setupSchema>;
