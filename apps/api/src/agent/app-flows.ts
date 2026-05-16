import { z } from 'zod';

import type { QuizQuestion, SetupState, Task, Topic, Visualization } from '../domain/types.js';
import type { PlanDraft } from '../storage/database.js';
import type { AgentSessionService } from './session-service.js';

type AgentFlowOptions = Readonly<{
  service: AgentSessionService;
  setup: SetupState;
}>;

const agentTaskDraftSchema = z
  .object({
    difficulty: z.enum(['easy', 'medium', 'hard']),
    language: z.enum(['python', 'typescript']).optional(),
    promptMd: z.string().trim().min(10).max(4_000),
    slug: z.string().trim().min(1).max(80).optional(),
    title: z.string().trim().min(3).max(120),
  })
  .strict();

const agentTopicDraftSchema = z
  .object({
    slug: z.string().trim().min(1).max(80).optional(),
    tasks: z.array(agentTaskDraftSchema).min(1).max(8),
    title: z.string().trim().min(3).max(120),
  })
  .strict();

const agentPlanDraftSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    topics: z.array(agentTopicDraftSchema).min(1).max(8),
  })
  .strict();

const agentChatResponseSchema = z
  .object({
    responseMd: z.string().trim().min(1).max(8_000),
    visualization: z
      .object({
        kind: z.enum(['chartjs', 'mermaid']),
        payload: z.string().trim().min(1).max(20_000),
      })
      .strict()
      .optional(),
  })
  .strict();

const agentQuizQuestionSchema = z
  .object({
    position: z.number().int().min(1),
    type: z.enum(['multiple_choice', 'short_answer']),
    promptMd: z.string().trim().min(1).max(4_000),
    choices: z
      .array(z.string())
      .nullish()
      .transform((v) => v ?? null),
    correctAnswer: z.string().trim().min(1).max(2_000),
    explanation: z.string().trim().min(1).max(4_000),
  })
  .strict();

const agentQuizQuestionsSchema = z.array(agentQuizQuestionSchema).min(1).max(20);

export function createTrustedAgentSystemPrompt(setup: SetupState): string {
  return `You are Code Sherpa, a ${setup.guideTone} DSA tutor. Explain concepts without executing commands or editing files.`;
}

function parseAgentJson<T>(contentMd: string, schema: z.ZodType<T>, label: string): T {
  const trimmed = contentMd.trim();
  const jsonText = unwrapJsonFence(trimmed);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${label} agent response was not valid JSON`);
    }

    throw error;
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`${label} agent response did not match the required schema`);
  }

  return result.data;
}

function unwrapJsonFence(trimmed: string): string {
  if (!trimmed.startsWith('```') || !trimmed.endsWith('```')) {
    return trimmed;
  }

  const firstLineBreak = trimmed.indexOf('\n');
  if (firstLineBreak === -1) {
    return trimmed;
  }

  return trimmed.slice(firstLineBreak + 1, -3).trim();
}

export async function generateLearningPathDraftWithAgent({
  goal,
  service,
  setup,
}: AgentFlowOptions & Readonly<{ goal: string }>): Promise<PlanDraft> {
  const result = await service.run(
    {
      prompt: `Create a DSA learning path for this goal: ${goal}

Return only JSON in this exact shape:
{"title":"string","topics":[{"title":"string","slug":"optional-kebab-case","tasks":[{"title":"string","slug":"optional-kebab-case","difficulty":"easy|medium|hard","language":"python|typescript","promptMd":"markdown prompt"}]}]}`,
      systemPrompt: createTrustedAgentSystemPrompt(setup),
    },
    { timeoutMs: 120_000 },
  );

  return parseAgentJson(result.contentMd, agentPlanDraftSchema, 'learning path');
}

export async function generateTopicExplanationWithAgent({
  service,
  setup,
  topic,
}: AgentFlowOptions &
  Readonly<{ topic: Topic & Readonly<{ tasks: ReadonlyArray<Task> }> }>): Promise<string> {
  const result = await service.run(
    {
      prompt: `Write the theory article for topic "${topic.title}".

Tasks in this topic:
${topic.tasks.map((task) => `- ${task.title}: ${task.promptMd}`).join('\n')}

Return markdown only. Include the core idea, common pitfalls, one small code-oriented example, and practice guidance.`,
      systemPrompt: createTrustedAgentSystemPrompt(setup),
    },
    { timeoutMs: 120_000 },
  );

  return result.contentMd;
}

export async function answerTaskChatWithAgent({
  message,
  service,
  setup,
  task,
}: AgentFlowOptions & Readonly<{ message: string; task: Task }>): Promise<
  Readonly<{
    responseMd: string;
    visualization?: Readonly<Omit<Visualization, 'createdAt' | 'id'>>;
  }>
> {
  const result = await service.run(
    {
      prompt: `Answer the learner's question about this exercise.

Exercise: ${task.title}
Difficulty: ${task.difficulty}
Prompt:
${task.promptMd}

Learner question:
${message}

Return only JSON in this shape:
{"responseMd":"markdown answer","visualization":{"kind":"mermaid|chartjs","payload":"diagram or chart payload"}}
Omit visualization unless it directly helps the answer. Do not provide a full solution unless explicitly requested.`,
      systemPrompt: createTrustedAgentSystemPrompt(setup),
    },
    { timeoutMs: 120_000 },
  );
  const parsed = parseAgentJson(result.contentMd, agentChatResponseSchema, 'task chat');

  return parsed.visualization === undefined
    ? { responseMd: parsed.responseMd }
    : {
        responseMd: parsed.responseMd,
        visualization: {
          kind: parsed.visualization.kind,
          payload: parsed.visualization.payload,
          prompt: message,
          taskId: task.id,
        },
      };
}

export async function generateQuizWithAgent({
  service,
  setup,
  topic,
}: AgentFlowOptions & Readonly<{ topic: Topic }>): Promise<
  ReadonlyArray<Omit<QuizQuestion, 'id' | 'quizId'>>
> {
  const result = await service.run(
    {
      prompt: `Create a quiz for the topic "${topic.title}".

Return only a JSON array of questions in this shape:
[{"position":1,"type":"multiple_choice|short_answer","promptMd":"question text","choices":["option1","option2"] or null,"correctAnswer":"the correct answer","explanation":"why this is correct"}]`,
      systemPrompt: createTrustedAgentSystemPrompt(setup),
    },
    { timeoutMs: 120_000 },
  );

  return parseAgentJson(result.contentMd, agentQuizQuestionsSchema, 'quiz generation');
}
