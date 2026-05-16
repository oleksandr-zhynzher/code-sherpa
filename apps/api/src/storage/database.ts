import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { generatePlanTemplate } from '../domain/planner.js';
import type {
  ChatMessage,
  PlanDetail,
  PlanSummary,
  SetupState,
  Task,
  TaskContext,
  Topic,
  Visualization,
} from '../domain/types.js';
import { NotFoundError } from '../http/errors.js';

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

type SettingsRow = Readonly<{
  claude_path: string | null;
  repo_url: string | null;
  workspace_path: string;
}>;

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
  getSetup: (workspacePath: string) => SetupState;
  getTask: (id: string) => Task;
  getTaskContext: (id: string) => TaskContext;
  getTopic: (id: string) => Topic & Readonly<{ tasks: ReadonlyArray<Task> }>;
  getVisualization: (id: string) => Visualization;
  listChatMessages: (taskId: string) => ReadonlyArray<ChatMessage>;
  listPlans: () => ReadonlyArray<PlanSummary>;
  markTaskDone: (id: string) => Task;
  recordTaskRun: (id: string, passed: boolean) => Task;
  saveSetup: (
    input: Readonly<{
      claudePath?: string | undefined;
      repoUrl?: string | undefined;
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

function migrate(db: DatabaseSync): void {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS plan (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      goal TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topic (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES plan(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      explanation_md TEXT
    );

    CREATE TABLE IF NOT EXISTS task (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      prompt_md TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'python',
      solution_path TEXT,
      test_path TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      last_run_at TEXT,
      last_run_pass INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      claude_path TEXT,
      repo_url TEXT,
      workspace_path TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_message (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content_md TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visualization (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL,
      kind TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function getPlanSummary(db: DatabaseSync, id: string): PlanSummary {
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

  if (row === undefined) {
    throw new NotFoundError(`Plan ${id} was not found`);
  }

  return mapPlan(row);
}

export function createDatabase(dbPath: string): CodeSherpaDatabase {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  migrate(db);

  return {
    addChatMessage: (input) => {
      const id = `msg-${randomUUID()}`;
      const createdAt = nowIso();
      db.prepare(
        'INSERT INTO chat_message (id, task_id, role, content_md, created_at) VALUES (?, ?, ?, ?, ?)',
      ).run(id, input.taskId, input.role, input.contentMd, createdAt);

      return {
        contentMd: input.contentMd,
        createdAt,
        id,
        role: input.role,
        taskId: input.taskId,
      };
    },
    close: () => {
      db.close();
    },
    createVisualization: (input) => {
      const id = `viz-${randomUUID()}`;
      const createdAt = nowIso();
      db.prepare(
        'INSERT INTO visualization (id, task_id, prompt, kind, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(id, input.taskId, input.prompt, input.kind, input.payload, createdAt);

      return {
        createdAt,
        id,
        kind: input.kind,
        payload: input.payload,
        prompt: input.prompt,
        taskId: input.taskId,
      };
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

      db.exec('BEGIN');
      try {
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
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }

      return getPlanDetail(db, template.id);
    },
    getPlan: (id: string) => getPlanDetail(db, id),
    getSetup: (workspacePath: string) => {
      const row = db
        .prepare('SELECT claude_path, repo_url, workspace_path FROM settings WHERE id = 1')
        .get() as SettingsRow | undefined;

      return {
        claudePath: row?.claude_path ?? null,
        repoUrl: row?.repo_url ?? null,
        workspacePath: row?.workspace_path ?? workspacePath,
      };
    },
    getTask: (id: string) => {
      const row = db.prepare('SELECT * FROM task WHERE id = ?').get(id) as TaskRow | undefined;
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
      const topicRow = db.prepare('SELECT * FROM topic WHERE id = ?').get(id) as unknown as
        | TopicRow
        | undefined;
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
    markTaskDone: (id: string) => {
      db.prepare("UPDATE task SET status = 'done' WHERE id = ?").run(id);
      return getTaskById(db, id);
    },
    recordTaskRun: (id: string, passed: boolean) => {
      db.prepare(
        `
        UPDATE task
        SET status = ?, last_run_at = ?, last_run_pass = ?
        WHERE id = ?
      `,
      ).run(passed ? 'passing' : 'in_progress', nowIso(), passed ? 1 : 0, id);

      return getTaskById(db, id);
    },
    saveSetup: (input) => {
      const updatedAt = nowIso();
      db.prepare(
        `
        INSERT INTO settings (id, claude_path, repo_url, workspace_path, updated_at)
        VALUES (1, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          claude_path = excluded.claude_path,
          repo_url = excluded.repo_url,
          workspace_path = excluded.workspace_path,
          updated_at = excluded.updated_at
      `,
      ).run(input.claudePath ?? null, input.repoUrl ?? null, input.workspacePath, updatedAt);

      return {
        claudePath: input.claudePath ?? null,
        repoUrl: input.repoUrl ?? null,
        workspacePath: input.workspacePath,
      };
    },
    updateTaskFiles: (id: string, solutionPath: string, testPath: string) => {
      db.prepare(
        `
        UPDATE task
        SET solution_path = ?, test_path = ?, status = 'in_progress'
        WHERE id = ?
      `,
      ).run(solutionPath, testPath, id);

      return getTaskById(db, id);
    },
    updateTopicExplanation: (id: string, explanationMd: string) => {
      db.prepare('UPDATE topic SET explanation_md = ? WHERE id = ?').run(explanationMd, id);
      const row = db.prepare('SELECT * FROM topic WHERE id = ?').get(id) as unknown as
        | TopicRow
        | undefined;
      if (row === undefined) {
        throw new NotFoundError(`Topic ${id} was not found`);
      }

      return mapTopic(row);
    },
  };
}

function getTaskById(db: DatabaseSync, id: string): Task {
  const row = db.prepare('SELECT * FROM task WHERE id = ?').get(id) as unknown as
    | TaskRow
    | undefined;
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
