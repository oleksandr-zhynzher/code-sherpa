import { z } from 'zod';

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
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

export const setupSchema = z.object({
  agentDriver: z.enum(['claude', 'copilot']).default('copilot'),
  autoSaveProgress: z.boolean().default(true),
  claudePath: optionalCliPathSchema,
  copilotPath: optionalCliPathSchema,
  exerciseLanguage: z.enum(['python', 'typescript']).default('python'),
  guideTone: z.enum(['direct', 'encouraging', 'socratic']).default('encouraging'),
  repoUrl: z.string().trim().max(500).optional(),
  safeRunChecks: z.boolean().default(true),
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

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type CreateLearningPathInput = z.infer<typeof createLearningPathSchema>;
export type SetupInput = z.infer<typeof setupSchema>;
