import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { generatePlanTemplate } from '../domain/planner.js';
import type {
  ChatMessage,
  ChatThread,
  ChatThreadScopeType,
  CodeGeneration,
  CodeGenerationStatus,
  PlanDetail,
  PlanSummary,
  ProgressEvent,
  Quiz,
  QuizAnswer,
  QuizAttempt,
  QuizAttemptStatus,
  QuizQuestion,
  ResumeState,
  SetupState,
  Task,
  TaskContext,
  TestRun,
  ThreadMessage,
  Topic,
  Visualization,
} from '../domain/types.js';
import { NotFoundError } from '../http/errors.js';
import { sanitizeVisualizationPayload } from '../visualization/sanitize.js';
import {
  type AgentSessionRepository,
  createAgentSessionRepository,
} from './agent-session-repository.js';
import { runMigrations } from './migrations.js';
import { createSetupRepository } from './setup-repository.js';
import { runInTransaction } from './transaction.js';

type PlanRow = Readonly<{
  created_at: string;
  done_tasks: number;
  goal: string;
  id: string;
  title: string;
  total_tasks: number;
}>;

type TopicRow = Readonly<{
  explanation_md: string | null;
  id: string;
  plan_id: string;
  position: number;
  slug: string;
  status: Task['status'];
  title: string;
}>;

type TaskRow = Readonly<{
  difficulty: Task['difficulty'];
  id: string;
  language: Task['language'];
  last_run_at: string | null;
  last_run_pass: number | null;
  position: number;
  prompt_md: string;
  slug: string;
  solution_path: string | null;
  status: Task['status'];
  test_path: string | null;
  title: string;
  topic_id: string;
}>;

type TaskContextRow = TaskRow & Readonly<{ topic_slug: string }>;

type ChatMessageRow = Readonly<{
  content_md: string;
  created_at: string;
  id: string;
  role: ChatMessage['role'];
  task_id: string;
}>;

type ChatThreadRow = Readonly<{
  created_at: string;
  id: string;
  scope_id: string;
  scope_type: ChatThreadScopeType;
  title: string;
  updated_at: string;
}>;

type ThreadMessageRow = Readonly<{
  content_md: string;
  created_at: string;
  id: string;
  role: ThreadMessage['role'];
  thread_id: string;
}>;

type VisualizationRow = Readonly<{
  created_at: string;
  id: string;
  kind: Visualization['kind'];
  payload: string;
  prompt: string;
  task_id: string;
}>;

type ProgressEventRow = Readonly<{
  created_at: string;
  event_type: string;
  id: string;
  metadata_json: string;
  scope_id: string;
  scope_type: ProgressEvent['scopeType'];
}>;

type CodeGenerationRow = Readonly<{
  created_at: string;
  generated_paths_json: string;
  id: string;
  prompt: string;
  status: CodeGenerationStatus;
  task_id: string;
  updated_at: string;
}>;

type TestRunRow = Readonly<{
  command: string;
  created_at: string;
  duration_ms: number | null;
  exit_code: number;
  id: string;
  output: string;
  passed: number;
  task_id: string;
}>;

type QuizRow = Readonly<{
  id: string;
  topic_id: string;
  title: string;
  created_at: string;
}>;

type QuizQuestionRow = Readonly<{
  id: string;
  quiz_id: string;
  position: number;
  type: QuizQuestion['type'];
  prompt: string;
  choices_json: string;
  correct_answer: string | null;
  explanation: string;
}>;

type QuizAttemptRow = Readonly<{
  id: string;
  quiz_id: string;
  status: QuizAttemptStatus;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  total: number | null;
  duration_ms: number | null;
}>;

type QuizAnswerRow = Readonly<{
  id: string;
  attempt_id: string;
  question_id: string;
  answer: string;
  is_correct: number | null;
  feedback: string | null;
}>;

const selectTopicByIdSql = 'SELECT * FROM topic WHERE id = ?';
const selectTaskByIdSql = 'SELECT * FROM task WHERE id = ?';

export type PlanDraft = Readonly<{
  title: string;
  topics: ReadonlyArray<
    Readonly<{
      slug?: string | undefined;
      tasks: ReadonlyArray<
        Readonly<{
          difficulty: Task['difficulty'];
          language?: Task['language'] | undefined;
          promptMd: string;
          slug?: string | undefined;
          title: string;
        }>
      >;
      title: string;
    }>
  >;
}>;

export type CodeSherpaDatabase = Readonly<{
  agentSessions: AgentSessionRepository;
  close: () => void;
  addChatMessage: (
    input: Readonly<{ contentMd: string; role: ChatMessage['role']; taskId: string }>,
  ) => ChatMessage;
  addThreadMessage: (
    input: Readonly<{ contentMd: string; role: ThreadMessage['role']; threadId: string }>,
  ) => ThreadMessage;
  findOrCreateChatThread: (scopeType: ChatThreadScopeType, scopeId: string) => ChatThread;
  listThreadMessages: (threadId: string) => ReadonlyArray<ThreadMessage>;
  createCodeGeneration: (
    input: Readonly<{
      generatedPaths: ReadonlyArray<string>;
      prompt: string;
      status: CodeGenerationStatus;
      taskId: string;
    }>,
  ) => CodeGeneration;
  createTestRun: (
    input: Readonly<{
      command: string;
      durationMs?: number | undefined;
      exitCode: number;
      output: string;
      passed: boolean;
      taskId: string;
    }>,
  ) => TestRun;
  createVisualization: (
    input: Readonly<{
      kind: Visualization['kind'];
      payload: string;
      prompt: string;
      taskId: string;
    }>,
  ) => Visualization;
  createPlan: (goal: string) => PlanDetail;
  createPlanFromDraft: (goal: string, draft: PlanDraft) => PlanDetail;
  getLatestCodeGeneration: (taskId: string) => CodeGeneration | null;
  getPlan: (id: string) => PlanDetail;
  getResumeState: () => ResumeState;
  getSetup: (workspacePath: string) => SetupState;
  getTask: (id: string) => Task;
  getTaskContext: (id: string) => TaskContext;
  getTopic: (id: string) => Topic & Readonly<{ tasks: ReadonlyArray<Task> }>;
  getVisualization: (id: string) => Visualization;
  listChatMessages: (taskId: string) => ReadonlyArray<ChatMessage>;
  listPlans: () => ReadonlyArray<PlanSummary>;
  listProgressEvents: (limit?: number) => ReadonlyArray<ProgressEvent>;
  listTestRuns: (taskId: string) => ReadonlyArray<TestRun>;
  listVisualizations: (taskId: string) => ReadonlyArray<Visualization>;
  markTaskDone: (id: string) => Task;
  recordTaskRun: (id: string, passed: boolean) => Task;
  saveSetup: (
    input: Readonly<{
      agentDriver: SetupState['agentDriver'];
      agentModel?: string | null | undefined;
      autoSaveProgress: boolean;
      claudePath?: string | undefined;
      copilotPath?: string | undefined;
      exerciseLanguage: SetupState['exerciseLanguage'];
      guideTone: SetupState['guideTone'];
      repoUrl?: string | null | undefined;
      safeRunChecks: boolean;
      workspacePath: string;
    }>,
  ) => SetupState;
  updateTaskFiles: (id: string, solutionPath: string, testPath: string) => Task;
  updateTopicExplanation: (id: string, explanationMd: string) => Topic;
  createQuiz: (
    input: Readonly<{
      topicId: string;
      title: string;
      questions: ReadonlyArray<Omit<QuizQuestion, 'id' | 'quizId'>>;
    }>,
  ) => Quiz;
  getQuiz: (id: string) => Quiz;
  findQuizByTopicId: (topicId: string) => Quiz | null;
  startQuizAttempt: (quizId: string) => QuizAttempt;
  getQuizAttempt: (id: string) => QuizAttempt;
  saveQuizAnswer: (
    input: Readonly<{ attemptId: string; questionId: string; selectedAnswer: string }>,
  ) => QuizAnswer;
  completeQuizAttempt: (id: string) => QuizAttempt;
}>;

function nowIso(): string {
  return new Date().toISOString();
}

function mapPlan(row: PlanRow): PlanSummary {
  return {
    createdAt: row.created_at,
    doneTasks: row.done_tasks,
    goal: row.goal,
    id: row.id,
    title: row.title,
    totalTasks: row.total_tasks,
  };
}

function mapTopic(row: TopicRow): Topic {
  return {
    explanationMd: row.explanation_md,
    id: row.id,
    planId: row.plan_id,
    position: row.position,
    slug: row.slug,
    status: row.status,
    title: row.title,
  };
}

function mapTask(row: TaskRow): Task {
  return {
    difficulty: row.difficulty,
    id: row.id,
    language: row.language,
    lastRunAt: row.last_run_at,
    lastRunPass: row.last_run_pass === null ? null : row.last_run_pass === 1,
    position: row.position,
    promptMd: row.prompt_md,
    slug: row.slug,
    solutionPath: row.solution_path,
    status: row.status,
    testPath: row.test_path,
    title: row.title,
    topicId: row.topic_id,
  };
}

function mapTaskContext(row: TaskContextRow): TaskContext {
  return {
    ...mapTask(row),
    topicSlug: row.topic_slug,
  };
}

function slugify(input: string, fallback: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, '-')
    .replaceAll(/^-|-$/gu, '')
    .slice(0, 80);

  return slug.length === 0 ? fallback : slug;
}

function uniqueSlug(base: string, used: Set<string>): string {
  let slug = base;
  let suffix = 2;
  while (used.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(slug);

  return slug;
}

function mapChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    contentMd: row.content_md,
    createdAt: row.created_at,
    id: row.id,
    role: row.role,
    taskId: row.task_id,
  };
}

function mapVisualization(row: VisualizationRow): Visualization {
  return {
    createdAt: row.created_at,
    id: row.id,
    kind: row.kind,
    payload: row.payload,
    prompt: row.prompt,
    taskId: row.task_id,
  };
}

function parseJsonArray(json: string): ReadonlyArray<string> {
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? (parsed as ReadonlyArray<string>) : [];
  } catch {
    return [];
  }
}

function mapCodeGeneration(row: CodeGenerationRow): CodeGeneration {
  return {
    createdAt: row.created_at,
    generatedPaths: parseJsonArray(row.generated_paths_json),
    id: row.id,
    prompt: row.prompt,
    status: row.status,
    taskId: row.task_id,
    updatedAt: row.updated_at,
  };
}

function mapTestRun(row: TestRunRow): TestRun {
  return {
    command: row.command,
    createdAt: row.created_at,
    durationMs: row.duration_ms,
    exitCode: row.exit_code,
    id: row.id,
    output: row.output,
    passed: row.passed === 1,
    taskId: row.task_id,
  };
}

function mapQuizQuestion(row: QuizQuestionRow): QuizQuestion {
  const choices = parseJsonArray(row.choices_json);
  return {
    id: row.id,
    quizId: row.quiz_id,
    position: row.position,
    type: row.type,
    promptMd: row.prompt,
    choices: choices.length > 0 ? choices : null,
    correctAnswer: row.correct_answer ?? '',
    explanation: row.explanation,
  };
}

function mapQuizAnswer(row: QuizAnswerRow): QuizAnswer {
  return {
    id: row.id,
    attemptId: row.attempt_id,
    questionId: row.question_id,
    selectedAnswer: row.answer,
    isCorrect: row.is_correct === 1,
    feedback: row.feedback,
  };
}

function mapQuizAttempt(row: QuizAttemptRow, answers: ReadonlyArray<QuizAnswer>): QuizAttempt {
  return {
    id: row.id,
    quizId: row.quiz_id,
    status: row.status,
    score: row.score,
    totalQuestions: row.total,
    durationMs: row.duration_ms,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    answers,
  };
}

function mapChatThread(row: ChatThreadRow): ChatThread {
  return {
    createdAt: row.created_at,
    id: row.id,
    scopeId: row.scope_id,
    scopeType: row.scope_type,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function mapThreadMessage(row: ThreadMessageRow): ThreadMessage {
  return {
    contentMd: row.content_md,
    createdAt: row.created_at,
    id: row.id,
    role: row.role,
    threadId: row.thread_id,
  };
}

function mapProgressEvent(row: ProgressEventRow): ProgressEvent {
  const metadata = parseProgressMetadata(row.metadata_json);

  return {
    createdAt: row.created_at,
    eventType: row.event_type,
    id: row.id,
    metadata:
      typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)
        ? (metadata as Readonly<Record<string, unknown>>)
        : {},
    scopeId: row.scope_id,
    scopeType: row.scope_type,
  };
}

function parseProgressMetadata(metadataJson: string): unknown {
  try {
    return JSON.parse(metadataJson) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { invalidMetadata: true };
    }

    throw error;
  }
}

function findPlanSummary(db: DatabaseSync, id: string): PlanSummary | null {
  const row = db
    .prepare(
      `
      SELECT
        p.id,
        p.title,
        p.goal,
        p.created_at,
        COUNT(t.id) AS total_tasks,
        COALESCE(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END), 0) AS done_tasks
      FROM plan p
      LEFT JOIN topic top ON top.plan_id = p.id
      LEFT JOIN task t ON t.topic_id = top.id
      WHERE p.id = ?
      GROUP BY p.id
    `,
    )
    .get(id) as PlanRow | undefined;

  return row === undefined ? null : mapPlan(row);
}

function getPlanSummary(db: DatabaseSync, id: string): PlanSummary {
  const plan = findPlanSummary(db, id);

  if (plan === null) {
    throw new NotFoundError(`Plan ${id} was not found`);
  }

  return plan;
}

const selectQuizAttemptById = 'SELECT * FROM quiz_attempt WHERE id = ?';

export function createDatabase(dbPath: string): CodeSherpaDatabase {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  runMigrations(db);
  const agentSessions = createAgentSessionRepository(db);
  const setupRepository = createSetupRepository(db);
  const insertProgressEvent = (
    eventType: string,
    scopeType: ProgressEvent['scopeType'],
    scopeId: string,
    metadata: Readonly<Record<string, unknown>> = {},
  ): ProgressEvent => {
    const id = `progress-${randomUUID()}`;
    const createdAt = nowIso();
    const metadataJson = JSON.stringify(metadata);
    db.prepare(
      `
      INSERT INTO progress_event (id, event_type, scope_type, scope_id, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(id, eventType, scopeType, scopeId, metadataJson, createdAt);

    return {
      createdAt,
      eventType,
      id,
      metadata,
      scopeId,
      scopeType,
    };
  };
  const insertPlanDraft = (goal: string, draft: PlanDraft): PlanDetail => {
    const createdAt = nowIso();
    const planId = `plan-${randomUUID().slice(0, 12)}`;
    const insertPlan = db.prepare(
      'INSERT INTO plan (id, title, goal, created_at) VALUES (?, ?, ?, ?)',
    );
    const insertTopic = db.prepare(
      'INSERT INTO topic (id, plan_id, position, slug, title, status, explanation_md) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    const insertTask = db.prepare(
      `INSERT INTO task
        (id, topic_id, position, slug, title, difficulty, prompt_md, language, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const topicSlugs = new Set<string>();

    runInTransaction(db, () => {
      insertPlan.run(planId, draft.title, goal, createdAt);
      for (const [topicIndex, topic] of draft.topics.entries()) {
        const topicSlug = uniqueSlug(slugify(topic.slug ?? topic.title, 'topic'), topicSlugs);
        const topicId = `${planId}-topic-${topicIndex + 1}-${randomUUID().slice(0, 8)}`;
        const taskSlugs = new Set<string>();
        insertTopic.run(topicId, planId, topicIndex + 1, topicSlug, topic.title, 'todo', null);
        for (const [taskIndex, task] of topic.tasks.entries()) {
          const taskSlug = uniqueSlug(slugify(task.slug ?? task.title, 'task'), taskSlugs);
          insertTask.run(
            `${topicId}-task-${taskIndex + 1}-${randomUUID().slice(0, 8)}`,
            topicId,
            taskIndex + 1,
            taskSlug,
            task.title,
            task.difficulty,
            task.promptMd,
            task.language ?? 'python',
            'todo',
          );
        }
      }
      insertProgressEvent('path_created', 'path', planId, { goal, title: draft.title });
    });

    return getPlanDetail(db, planId);
  };

  return {
    agentSessions,
    addChatMessage: (input) => {
      return runInTransaction(db, () => {
        const id = `msg-${randomUUID()}`;
        const createdAt = nowIso();
        db.prepare(
          'INSERT INTO chat_message (id, task_id, role, content_md, created_at) VALUES (?, ?, ?, ?, ?)',
        ).run(id, input.taskId, input.role, input.contentMd, createdAt);
        insertProgressEvent('chat_message', 'task', input.taskId, { role: input.role });

        return {
          contentMd: input.contentMd,
          createdAt,
          id,
          role: input.role,
          taskId: input.taskId,
        };
      });
    },
    close: () => {
      db.close();
    },
    addThreadMessage: (input) => {
      return runInTransaction(db, () => {
        const id = `tmsg-${randomUUID()}`;
        const createdAt = nowIso();
        db.prepare(
          'INSERT INTO chat_message (id, task_id, thread_id, role, content_md, created_at) VALUES (?, NULL, ?, ?, ?, ?)',
        ).run(id, input.threadId, input.role, input.contentMd, createdAt);
        db.prepare('UPDATE chat_thread SET updated_at = ? WHERE id = ?').run(
          createdAt,
          input.threadId,
        );

        return {
          contentMd: input.contentMd,
          createdAt,
          id,
          role: input.role,
          threadId: input.threadId,
        };
      });
    },
    findOrCreateChatThread: (scopeType, scopeId) => {
      const existing = db
        .prepare('SELECT * FROM chat_thread WHERE scope_type = ? AND scope_id = ? LIMIT 1')
        .get(scopeType, scopeId) as unknown as ChatThreadRow | undefined;

      if (existing !== undefined) {
        return mapChatThread(existing);
      }

      return runInTransaction(db, () => {
        const id = `thread-${randomUUID()}`;
        const now = nowIso();
        const title = `${scopeType} thread`;
        db.prepare(
          'INSERT INTO chat_thread (id, scope_type, scope_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(id, scopeType, scopeId, title, now, now);

        return { createdAt: now, id, scopeId, scopeType, title, updatedAt: now };
      });
    },
    listThreadMessages: (threadId: string) => {
      const rows = db
        .prepare(
          'SELECT id, thread_id, role, content_md, created_at FROM chat_message WHERE thread_id = ? ORDER BY created_at ASC',
        )
        .all(threadId) as unknown as ReadonlyArray<ThreadMessageRow>;

      return rows.map(mapThreadMessage);
    },
    createCodeGeneration: (input) => {
      return runInTransaction(db, () => {
        const id = `gen-${randomUUID()}`;
        const now = nowIso();
        const generatedPathsJson = JSON.stringify(input.generatedPaths);
        db.prepare(
          `INSERT INTO code_generation (id, task_id, prompt, generated_paths_json, status, agent_trace_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, '[]', ?, ?)`,
        ).run(id, input.taskId, input.prompt, generatedPathsJson, input.status, now, now);
        insertProgressEvent('code_generated', 'task', input.taskId, {
          generatedPaths: input.generatedPaths,
          status: input.status,
        });

        return {
          createdAt: now,
          generatedPaths: input.generatedPaths,
          id,
          prompt: input.prompt,
          status: input.status,
          taskId: input.taskId,
          updatedAt: now,
        };
      });
    },
    createVisualization: (input) => {
      const sanitizedPayload = sanitizeVisualizationPayload(input.kind, input.payload);

      return runInTransaction(db, () => {
        const id = `viz-${randomUUID()}`;
        const createdAt = nowIso();
        db.prepare(
          'INSERT INTO visualization (id, task_id, prompt, kind, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(id, input.taskId, input.prompt, input.kind, sanitizedPayload, createdAt);
        insertProgressEvent('visualization_created', 'task', input.taskId, { kind: input.kind });

        return {
          createdAt,
          id,
          kind: input.kind,
          payload: sanitizedPayload,
          prompt: input.prompt,
          taskId: input.taskId,
        };
      });
    },
    createPlan: (goal: string) => {
      const template = generatePlanTemplate(goal);
      return insertPlanDraft(goal, template);
    },
    createPlanFromDraft: (goal, draft) => insertPlanDraft(goal, draft),
    createTestRun: (input) => {
      return runInTransaction(db, () => {
        const id = `run-${randomUUID()}`;
        const createdAt = nowIso();
        db.prepare(
          `INSERT INTO test_run (id, task_id, command, exit_code, output, passed, duration_ms, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          input.taskId,
          input.command,
          input.exitCode,
          input.output,
          input.passed ? 1 : 0,
          input.durationMs ?? null,
          createdAt,
        );
        insertProgressEvent(input.passed ? 'task_passed' : 'task_failed', 'task', input.taskId, {
          exitCode: input.exitCode,
        });

        return {
          command: input.command,
          createdAt,
          durationMs: input.durationMs ?? null,
          exitCode: input.exitCode,
          id,
          output: input.output,
          passed: input.passed,
          taskId: input.taskId,
        };
      });
    },
    getLatestCodeGeneration: (taskId: string) => {
      const row = db
        .prepare(
          'SELECT * FROM code_generation WHERE task_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1',
        )
        .get(taskId) as unknown as CodeGenerationRow | undefined;

      return row === undefined ? null : mapCodeGeneration(row);
    },
    getPlan: (id: string) => getPlanDetail(db, id),
    getResumeState: () => getResumeState(db),
    getSetup: setupRepository.getSetup,
    getTask: (id: string) => {
      const row = db.prepare(selectTaskByIdSql).get(id) as TaskRow | undefined;
      if (row === undefined) {
        throw new NotFoundError(`Task ${id} was not found`);
      }

      return mapTask(row);
    },
    getTaskContext: (id: string) => {
      const row = db
        .prepare(
          `
          SELECT task.*, topic.slug AS topic_slug
          FROM task
          INNER JOIN topic ON topic.id = task.topic_id
          WHERE task.id = ?
        `,
        )
        .get(id) as unknown as TaskContextRow | undefined;
      if (row === undefined) {
        throw new NotFoundError(`Task ${id} was not found`);
      }

      return mapTaskContext(row);
    },
    getTopic: (id: string) => {
      const topicRow = db.prepare(selectTopicByIdSql).get(id) as unknown as TopicRow | undefined;
      if (topicRow === undefined) {
        throw new NotFoundError(`Topic ${id} was not found`);
      }

      const tasks = db
        .prepare('SELECT * FROM task WHERE topic_id = ? ORDER BY position ASC')
        .all(id) as unknown as ReadonlyArray<TaskRow>;

      return {
        ...mapTopic(topicRow),
        tasks: tasks.map(mapTask),
      };
    },
    getVisualization: (id: string) => {
      const row = db.prepare('SELECT * FROM visualization WHERE id = ?').get(id) as unknown as
        | VisualizationRow
        | undefined;
      if (row === undefined) {
        throw new NotFoundError(`Visualization ${id} was not found`);
      }

      return mapVisualization(row);
    },
    listVisualizations: (taskId: string) => {
      const rows = db
        .prepare('SELECT * FROM visualization WHERE task_id = ? ORDER BY created_at ASC')
        .all(taskId) as unknown as ReadonlyArray<VisualizationRow>;

      return rows.map(mapVisualization);
    },
    listChatMessages: (taskId: string) => {
      const rows = db
        .prepare('SELECT * FROM chat_message WHERE task_id = ? ORDER BY created_at ASC')
        .all(taskId) as unknown as ReadonlyArray<ChatMessageRow>;

      return rows.map(mapChatMessage);
    },
    listPlans: () => {
      const rows = db
        .prepare(
          `
          SELECT
            p.id,
            p.title,
            p.goal,
            p.created_at,
            COUNT(t.id) AS total_tasks,
            COALESCE(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END), 0) AS done_tasks
          FROM plan p
          LEFT JOIN topic top ON top.plan_id = p.id
          LEFT JOIN task t ON t.topic_id = top.id
          GROUP BY p.id
          ORDER BY p.created_at DESC
        `,
        )
        .all() as unknown as ReadonlyArray<PlanRow>;

      return rows.map(mapPlan);
    },
    listProgressEvents: (limit) => listProgressEvents(db, limit),
    listTestRuns: (taskId: string) => {
      const rows = db
        .prepare('SELECT * FROM test_run WHERE task_id = ? ORDER BY created_at DESC')
        .all(taskId) as unknown as ReadonlyArray<TestRunRow>;

      return rows.map(mapTestRun);
    },
    markTaskDone: (id: string) => {
      getTaskById(db, id);
      runInTransaction(db, () => {
        db.prepare("UPDATE task SET status = 'done' WHERE id = ?").run(id);
        insertProgressEvent('task_completed', 'task', id, { status: 'done' });
      });
      return getTaskById(db, id);
    },
    recordTaskRun: (id: string, passed: boolean) => {
      getTaskById(db, id);
      runInTransaction(db, () => {
        db.prepare(
          `
          UPDATE task
          SET status = ?, last_run_at = ?, last_run_pass = ?
          WHERE id = ?
        `,
        ).run(passed ? 'passing' : 'in_progress', nowIso(), passed ? 1 : 0, id);
        insertProgressEvent('task_run', 'task', id, {
          passed,
          status: passed ? 'passing' : 'in_progress',
        });
      });

      return getTaskById(db, id);
    },
    saveSetup: setupRepository.saveSetup,
    updateTaskFiles: (id: string, solutionPath: string, testPath: string) => {
      getTaskById(db, id);
      runInTransaction(db, () => {
        db.prepare(
          `
          UPDATE task
          SET solution_path = ?, test_path = ?, status = 'in_progress'
          WHERE id = ?
        `,
        ).run(solutionPath, testPath, id);
        insertProgressEvent('task_scaffolded', 'task', id, { solutionPath, testPath });
      });

      return getTaskById(db, id);
    },
    updateTopicExplanation: (id: string, explanationMd: string) => {
      runInTransaction(db, () => {
        db.prepare('UPDATE topic SET explanation_md = ? WHERE id = ?').run(explanationMd, id);
        insertProgressEvent('topic_explained', 'topic', id, {
          explanationLength: explanationMd.length,
        });
      });
      const row = db.prepare(selectTopicByIdSql).get(id) as unknown as TopicRow | undefined;
      if (row === undefined) {
        throw new NotFoundError(`Topic ${id} was not found`);
      }

      return mapTopic(row);
    },
    createQuiz: (input) => {
      return runInTransaction(db, () => {
        const quizId = `quiz-${randomUUID()}`;
        const createdAt = nowIso();
        db.prepare(
          'INSERT INTO quiz (id, topic_id, title, generated_metadata_json, created_at) VALUES (?, ?, ?, ?, ?)',
        ).run(quizId, input.topicId, input.title, '{}', createdAt);

        const insertQuestion = db.prepare(
          'INSERT INTO quiz_question (id, quiz_id, position, type, prompt, choices_json, correct_answer, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        );
        const questions: QuizQuestion[] = [];
        for (const q of input.questions) {
          const questionId = `qq-${randomUUID()}`;
          const choicesJson = JSON.stringify(q.choices ?? []);
          insertQuestion.run(
            questionId,
            quizId,
            q.position,
            q.type,
            q.promptMd,
            choicesJson,
            q.correctAnswer,
            q.explanation,
          );
          questions.push({
            id: questionId,
            quizId,
            position: q.position,
            type: q.type,
            promptMd: q.promptMd,
            choices: q.choices,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          });
        }

        insertProgressEvent('quiz_created', 'quiz', quizId, { topicId: input.topicId });

        return {
          id: quizId,
          topicId: input.topicId,
          title: input.title,
          createdAt,
          questions,
        };
      });
    },
    getQuiz: (id: string) => {
      const quizRow = db.prepare('SELECT * FROM quiz WHERE id = ?').get(id) as unknown as
        | QuizRow
        | undefined;
      if (quizRow === undefined) {
        throw new NotFoundError(`Quiz ${id} was not found`);
      }

      const questionRows = db
        .prepare('SELECT * FROM quiz_question WHERE quiz_id = ? ORDER BY position ASC')
        .all(id) as unknown as ReadonlyArray<QuizQuestionRow>;

      return {
        id: quizRow.id,
        topicId: quizRow.topic_id,
        title: quizRow.title,
        createdAt: quizRow.created_at,
        questions: questionRows.map(mapQuizQuestion),
      };
    },
    findQuizByTopicId: (topicId: string) => {
      const quizRow = db
        .prepare('SELECT * FROM quiz WHERE topic_id = ? LIMIT 1')
        .get(topicId) as unknown as QuizRow | undefined;
      if (quizRow === undefined) return null;

      const questionRows = db
        .prepare('SELECT * FROM quiz_question WHERE quiz_id = ? ORDER BY position ASC')
        .all(quizRow.id) as unknown as ReadonlyArray<QuizQuestionRow>;

      return {
        id: quizRow.id,
        topicId: quizRow.topic_id,
        title: quizRow.title,
        createdAt: quizRow.created_at,
        questions: questionRows.map(mapQuizQuestion),
      };
    },
    startQuizAttempt: (quizId: string) => {
      const quizRow = db.prepare('SELECT * FROM quiz WHERE id = ?').get(quizId) as unknown as
        | QuizRow
        | undefined;
      if (quizRow === undefined) {
        throw new NotFoundError(`Quiz ${quizId} was not found`);
      }

      return runInTransaction(db, () => {
        const attemptId = `attempt-${randomUUID()}`;
        const startedAt = nowIso();
        db.prepare(
          'INSERT INTO quiz_attempt (id, quiz_id, status, started_at) VALUES (?, ?, ?, ?)',
        ).run(attemptId, quizId, 'in_progress', startedAt);
        insertProgressEvent('quiz_started', 'quiz', quizId, { attemptId });

        return {
          id: attemptId,
          quizId,
          status: 'in_progress' as const,
          score: null,
          totalQuestions: null,
          durationMs: null,
          startedAt,
          completedAt: null,
          answers: [],
        };
      });
    },
    getQuizAttempt: (id: string) => {
      const row = db.prepare(selectQuizAttemptById).get(id) as unknown as
        | QuizAttemptRow
        | undefined;
      if (row === undefined) {
        throw new NotFoundError(`Quiz attempt ${id} was not found`);
      }

      const answerRows = db
        .prepare('SELECT * FROM quiz_answer WHERE attempt_id = ? ORDER BY rowid ASC')
        .all(id) as unknown as ReadonlyArray<QuizAnswerRow>;

      return mapQuizAttempt(row, answerRows.map(mapQuizAnswer));
    },
    saveQuizAnswer: (input) => {
      const attemptRow = db.prepare(selectQuizAttemptById).get(input.attemptId) as unknown as
        | QuizAttemptRow
        | undefined;
      if (attemptRow === undefined) {
        throw new NotFoundError(`Quiz attempt ${input.attemptId} was not found`);
      }

      const questionRow = db
        .prepare('SELECT * FROM quiz_question WHERE id = ?')
        .get(input.questionId) as unknown as QuizQuestionRow | undefined;
      if (questionRow === undefined) {
        throw new NotFoundError(`Quiz question ${input.questionId} was not found`);
      }

      return runInTransaction(db, () => {
        const answerId = `qa-${randomUUID()}`;
        const updatedAt = nowIso();
        db.prepare(
          `INSERT INTO quiz_answer (id, attempt_id, question_id, answer, is_correct, feedback, updated_at)
           VALUES (?, ?, ?, ?, NULL, NULL, ?)
           ON CONFLICT(attempt_id, question_id) DO UPDATE SET answer = excluded.answer, updated_at = excluded.updated_at`,
        ).run(answerId, input.attemptId, input.questionId, input.selectedAnswer, updatedAt);

        const saved = db
          .prepare('SELECT * FROM quiz_answer WHERE attempt_id = ? AND question_id = ?')
          .get(input.attemptId, input.questionId) as unknown as QuizAnswerRow;

        return mapQuizAnswer(saved);
      });
    },
    completeQuizAttempt: (id: string) => {
      const attemptRow = db.prepare(selectQuizAttemptById).get(id) as unknown as
        | QuizAttemptRow
        | undefined;
      if (attemptRow === undefined) {
        throw new NotFoundError(`Quiz attempt ${id} was not found`);
      }

      return runInTransaction(db, () => {
        const now = nowIso();
        const answerRows = db
          .prepare('SELECT * FROM quiz_answer WHERE attempt_id = ?')
          .all(id) as unknown as ReadonlyArray<QuizAnswerRow>;

        let correctCount = 0;
        const updatedAnswers: QuizAnswer[] = [];

        for (const answer of answerRows) {
          const qRow = db
            .prepare('SELECT * FROM quiz_question WHERE id = ?')
            .get(answer.question_id) as unknown as QuizQuestionRow | undefined;

          if (qRow === undefined) {
            continue;
          }

          const isCorrect =
            qRow.correct_answer !== null &&
            qRow.correct_answer.trim().toLowerCase() === answer.answer.trim().toLowerCase();

          db.prepare('UPDATE quiz_answer SET is_correct = ? WHERE id = ?').run(
            isCorrect ? 1 : 0,
            answer.id,
          );

          if (isCorrect) {
            correctCount += 1;
          }

          updatedAnswers.push({
            id: answer.id,
            attemptId: answer.attempt_id,
            questionId: answer.question_id,
            selectedAnswer: answer.answer,
            isCorrect,
            feedback: answer.feedback,
          });
        }

        const total = answerRows.length;
        const durationMs = Date.now() - new Date(attemptRow.started_at).getTime();

        db.prepare(
          'UPDATE quiz_attempt SET status = ?, completed_at = ?, score = ?, total = ?, duration_ms = ? WHERE id = ?',
        ).run('completed', now, correctCount, total, durationMs, id);

        insertProgressEvent('quiz_completed', 'quiz', attemptRow.quiz_id, {
          score: correctCount,
          total,
        });

        const updatedRow = db.prepare(selectQuizAttemptById).get(id) as unknown as QuizAttemptRow;

        return mapQuizAttempt(updatedRow, updatedAnswers);
      });
    },
  };
}

function normalizeProgressLimit(limit = 50): number {
  if (!Number.isFinite(limit)) {
    return 50;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 200);
}

function listProgressEvents(db: DatabaseSync, limit?: number): ReadonlyArray<ProgressEvent> {
  const rows = db
    .prepare(
      `
      SELECT * FROM progress_event
      ORDER BY created_at DESC, rowid DESC
      LIMIT ?
    `,
    )
    .all(normalizeProgressLimit(limit)) as unknown as ReadonlyArray<ProgressEventRow>;

  return rows.map(mapProgressEvent);
}

function getTaskById(db: DatabaseSync, id: string): Task {
  const row = db.prepare(selectTaskByIdSql).get(id) as unknown as TaskRow | undefined;
  if (row === undefined) {
    throw new NotFoundError(`Task ${id} was not found`);
  }

  return mapTask(row);
}

function getPlanDetail(db: DatabaseSync, id: string): PlanDetail {
  const plan = getPlanSummary(db, id);
  const topicRows = db
    .prepare('SELECT * FROM topic WHERE plan_id = ? ORDER BY position ASC')
    .all(id) as unknown as ReadonlyArray<TopicRow>;
  const taskStatement = db.prepare('SELECT * FROM task WHERE topic_id = ? ORDER BY position ASC');

  return {
    ...plan,
    topics: topicRows.map((topicRow) => ({
      ...mapTopic(topicRow),
      tasks: (taskStatement.all(topicRow.id) as unknown as ReadonlyArray<TaskRow>).map(mapTask),
    })),
  };
}

function getFirstTopicForPlan(db: DatabaseSync, planId: string): Topic | null {
  const row = db
    .prepare('SELECT * FROM topic WHERE plan_id = ? ORDER BY position ASC LIMIT 1')
    .get(planId) as unknown as TopicRow | undefined;

  return row === undefined ? null : mapTopic(row);
}

function getFirstTaskForTopic(db: DatabaseSync, topicId: string): Task | null {
  const row = db
    .prepare('SELECT * FROM task WHERE topic_id = ? ORDER BY position ASC LIMIT 1')
    .get(topicId) as unknown as TaskRow | undefined;

  return row === undefined ? null : mapTask(row);
}

function getResumeState(db: DatabaseSync): ResumeState {
  const events = listProgressEvents(db, 50);

  for (const event of events) {
    const resume = getResumeStateForEvent(db, event);
    if (resume !== null) {
      return resume;
    }
  }

  return getDefaultResumeState(db);
}

function getResumeStateForEvent(db: DatabaseSync, lastEvent: ProgressEvent): ResumeState | null {
  if (lastEvent.scopeType === 'task') {
    const taskRow = db.prepare(selectTaskByIdSql).get(lastEvent.scopeId) as unknown as
      | TaskRow
      | undefined;
    if (taskRow === undefined) {
      return null;
    }
    const task = mapTask(taskRow);
    const topicRow = db.prepare(selectTopicByIdSql).get(task.topicId) as unknown as
      | TopicRow
      | undefined;
    if (topicRow === undefined) {
      return null;
    }
    const path = findPlanSummary(db, topicRow.plan_id);
    if (path === null) {
      return null;
    }

    return {
      lastEvent,
      path,
      task,
      topic: mapTopic(topicRow),
    };
  }

  if (lastEvent.scopeType === 'topic') {
    const topicRow = db.prepare(selectTopicByIdSql).get(lastEvent.scopeId) as unknown as
      | TopicRow
      | undefined;
    if (topicRow === undefined) {
      return null;
    }
    const topic = mapTopic(topicRow);
    const path = findPlanSummary(db, topic.planId);
    if (path === null) {
      return null;
    }

    return {
      lastEvent,
      path,
      task: getFirstTaskForTopic(db, topic.id),
      topic,
    };
  }

  if (lastEvent.scopeType !== 'path') {
    return null;
  }

  const path = findPlanSummary(db, lastEvent.scopeId);
  if (path === null) {
    return null;
  }

  return createResumeForPlan(db, path, lastEvent);
}

function getDefaultResumeState(db: DatabaseSync): ResumeState {
  const planId = (
    db.prepare('SELECT id FROM plan ORDER BY created_at DESC LIMIT 1').get() as
      | Readonly<{ id: string }>
      | undefined
  )?.id;
  if (planId === undefined) {
    return { lastEvent: null, path: null, task: null, topic: null };
  }

  return createResumeForPlan(db, getPlanSummary(db, planId), null);
}

function createResumeForPlan(
  db: DatabaseSync,
  path: PlanSummary,
  lastEvent: ProgressEvent | null,
): ResumeState {
  const topic = getFirstTopicForPlan(db, path.id);

  return {
    lastEvent,
    path,
    task: topic === null ? null : getFirstTaskForTopic(db, topic.id),
    topic,
  };
}
