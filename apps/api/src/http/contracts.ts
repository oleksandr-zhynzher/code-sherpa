import { z } from 'zod';

export const createPlanSchema = z.object({
  goal: z.string().trim().min(3).max(500),
});

export const setupSchema = z.object({
  claudePath: z.string().trim().max(500).optional(),
  repoUrl: z.string().trim().max(500).optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type SetupInput = z.infer<typeof setupSchema>;
