import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { generatePlanTemplate } from '../domain/planner.js';
import type {
  ChatMessage,
  PlanDetail,
  PlanSummary,
  ProgressEvent,
  ResumeState,
  SetupState,
  Task,
  TaskContext,
  Topic,
  Visualization,
} from '../domain/types.js';
import { NotFoundError } from '../http/errors.js';
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

const selectTopicByIdSql = 'SELECT * FROM topic WHERE id = ?';
const selectTaskByIdSql = 'SELECT * FROM task WHERE id = ?';

export type CodeSherpaDatabase = Readonly<{
  close: () => void;
  addChatMessage: (
    input: Readonly<{ contentMd: string; role: ChatMessage['role']; taskId: string }>,
  ) => ChatMessage;
  createVisualization: (
    input: Readonly<{
      kind: Visualization['kind'];
      payload: string;
      prompt: string;
      taskId: string;
    }>,
  ) => Visualization;
  createPlan: (goal: string) => PlanDetail;
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
  markTaskDone: (id: string) => Task;
  recordTaskRun: (id: string, passed: boolean) => Task;
  saveSetup: (
    input: Readonly<{
      claudePath?: string | undefined;
      agentDriver: SetupState['agentDriver'];
      autoSaveProgress: boolean;
      copilotPath?: string | undefined;
      exerciseLanguage: SetupState['exerciseLanguage'];
      guideTone: SetupState['guideTone'];
      repoUrl?: string | undefined;
      safeRunChecks: boolean;
      workspacePath: string;
    }>,
  ) => SetupState;
  updateTaskFiles: (id: string, solutionPath: string, testPath: string) => Task;
  updateTopicExplanation: (id: string, explanationMd: string) => Topic;
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

export function createDatabase(dbPath: string): CodeSherpaDatabase {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  runMigrations(db);
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

  return {
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
    createVisualization: (input) => {
      return runInTransaction(db, () => {
        const id = `viz-${randomUUID()}`;
        const createdAt = nowIso();
        db.prepare(
          'INSERT INTO visualization (id, task_id, prompt, kind, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(id, input.taskId, input.prompt, input.kind, input.payload, createdAt);
        insertProgressEvent('visualization_created', 'task', input.taskId, { kind: input.kind });

        return {
          createdAt,
          id,
          kind: input.kind,
          payload: input.payload,
          prompt: input.prompt,
          taskId: input.taskId,
        };
      });
    },
    createPlan: (goal: string) => {
      const createdAt = nowIso();
      const template = generatePlanTemplate(goal);
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

      runInTransaction(db, () => {
        insertPlan.run(template.id, template.title, goal, createdAt);
        for (const topic of template.topics) {
          const topicId = `${template.id}-${topic.slug}`;
          insertTopic.run(
            topicId,
            template.id,
            topic.position,
            topic.slug,
            topic.title,
            'todo',
            null,
          );
          for (const task of topic.tasks) {
            insertTask.run(
              `${topicId}-${task.slug}`,
              topicId,
              task.position,
              task.slug,
              task.title,
              task.difficulty,
              task.promptMd,
              task.language,
              'todo',
            );
          }
        }
        insertProgressEvent('path_created', 'path', template.id, { goal, title: template.title });
      });

      return getPlanDetail(db, template.id);
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
