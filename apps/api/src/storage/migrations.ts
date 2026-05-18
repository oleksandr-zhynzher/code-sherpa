import type { DatabaseSync } from 'node:sqlite';

import { runInTransaction } from './transaction.js';

type Migration = Readonly<{
  name: string;
  run: (db: DatabaseSync) => void;
  version: number;
}>;

type TableColumnRow = Readonly<{
  name: string;
}>;

type MigrationRow = Readonly<{
  version: number;
}>;

function quoteIdentifier(identifier: string): string {
  if (!/^[a-z][a-z0-9_]*$/u.test(identifier)) {
    throw new Error(`Invalid SQLite identifier: ${identifier}`);
  }

  return `"${identifier}"`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function ensureColumn(
  db: DatabaseSync,
  tableName: string,
  columnName: string,
  definition: string,
): void {
  const table = quoteIdentifier(tableName);
  const column = quoteIdentifier(columnName);
  const rows = db
    .prepare(`PRAGMA table_info(${table})`)
    .all() as unknown as ReadonlyArray<TableColumnRow>;
  if (rows.some((row) => row.name === columnName)) {
    return;
  }

  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function createBasePocSchema(db: DatabaseSync): void {
  db.exec(`
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
      agent_driver TEXT NOT NULL DEFAULT 'copilot',
      copilot_path TEXT,
      claude_path TEXT,
      repo_url TEXT,
      workspace_path TEXT NOT NULL,
      exercise_language TEXT NOT NULL DEFAULT 'python',
      safe_run_checks INTEGER NOT NULL DEFAULT 1,
      auto_save_progress INTEGER NOT NULL DEFAULT 1,
      guide_tone TEXT NOT NULL DEFAULT 'encouraging',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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

function addSetupPreferenceColumns(db: DatabaseSync): void {
  ensureColumn(db, 'settings', 'agent_driver', "TEXT NOT NULL DEFAULT 'copilot'");
  ensureColumn(db, 'settings', 'copilot_path', 'TEXT');
  ensureColumn(db, 'settings', 'exercise_language', "TEXT NOT NULL DEFAULT 'python'");
  ensureColumn(db, 'settings', 'safe_run_checks', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn(db, 'settings', 'auto_save_progress', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn(db, 'settings', 'guide_tone', "TEXT NOT NULL DEFAULT 'encouraging'");
}

function createProductionDurabilitySchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      exercise_language TEXT NOT NULL DEFAULT 'python',
      default_difficulty TEXT NOT NULL DEFAULT 'medium',
      hint_behavior TEXT NOT NULL DEFAULT 'socratic',
      safe_run_checks INTEGER NOT NULL DEFAULT 1,
      auto_save_progress INTEGER NOT NULL DEFAULT 1,
      guide_style TEXT NOT NULL DEFAULT 'encouraging',
      diagrams_enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS learning_path (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      goal TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      current_topic_id TEXT,
      completed_topics INTEGER NOT NULL DEFAULT 0,
      total_topics INTEGER NOT NULL DEFAULT 0,
      completed_exercises INTEGER NOT NULL DEFAULT 0,
      total_exercises INTEGER NOT NULL DEFAULT 0,
      last_activity_at TEXT,
      generated_metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exercise (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      prompt_md TEXT NOT NULL,
      examples_json TEXT NOT NULL DEFAULT '[]',
      constraints_json TEXT NOT NULL DEFAULT '[]',
      language TEXT NOT NULL DEFAULT 'python',
      status TEXT NOT NULL DEFAULT 'todo',
      solution_path TEXT,
      test_path TEXT,
      last_run_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS code_generation (
      id TEXT PRIMARY KEY,
      exercise_id TEXT REFERENCES exercise(id) ON DELETE CASCADE,
      task_id TEXT REFERENCES task(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL,
      generated_paths_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL,
      agent_trace_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_run (
      id TEXT PRIMARY KEY,
      exercise_id TEXT REFERENCES exercise(id) ON DELETE CASCADE,
      task_id TEXT REFERENCES task(id) ON DELETE CASCADE,
      command TEXT NOT NULL,
      exit_code INTEGER,
      output TEXT NOT NULL,
      passed INTEGER NOT NULL,
      duration_ms INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_thread (
      id TEXT PRIMARY KEY,
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quiz (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      generated_metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quiz_question (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      choices_json TEXT NOT NULL DEFAULT '[]',
      correct_answer TEXT,
      rubric TEXT,
      explanation TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quiz_attempt (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      score INTEGER,
      total INTEGER,
      duration_ms INTEGER
    );

    CREATE TABLE IF NOT EXISTS quiz_answer (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL REFERENCES quiz_attempt(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES quiz_question(id) ON DELETE CASCADE,
      answer TEXT NOT NULL,
      is_correct INTEGER,
      feedback TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(attempt_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS progress_event (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `);

  ensureColumn(
    db,
    'chat_message',
    'thread_id',
    'TEXT REFERENCES chat_thread(id) ON DELETE CASCADE',
  );
  ensureColumn(
    db,
    'visualization',
    'thread_id',
    'TEXT REFERENCES chat_thread(id) ON DELETE SET NULL',
  );
  ensureColumn(
    db,
    'visualization',
    'exercise_id',
    'TEXT REFERENCES exercise(id) ON DELETE CASCADE',
  );
}

function addProgressEventIndexes(db: DatabaseSync): void {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_progress_event_created_at
    ON progress_event(created_at DESC);
  `);
}

function createAgentSessionSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_session (
      id TEXT PRIMARY KEY,
      driver TEXT NOT NULL,
      status TEXT NOT NULL,
      prompt TEXT NOT NULL,
      system_prompt TEXT,
      response_md TEXT,
      tool_calls_json TEXT NOT NULL DEFAULT '[]',
      tool_results_json TEXT NOT NULL DEFAULT '[]',
      error_message TEXT,
      duration_ms INTEGER,
      started_at TEXT NOT NULL,
      completed_at TEXT
    );
  `);
}

function addAgentToolResults(db: DatabaseSync): void {
  ensureColumn(db, 'agent_session', 'tool_results_json', "TEXT NOT NULL DEFAULT '[]'");
}

function makeTaskIdNullableOnChatMessage(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_message_v2 (
      id TEXT PRIMARY KEY,
      task_id TEXT REFERENCES task(id) ON DELETE CASCADE,
      thread_id TEXT REFERENCES chat_thread(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content_md TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    INSERT INTO chat_message_v2 (id, task_id, role, content_md, created_at)
      SELECT id, task_id, role, content_md, created_at FROM chat_message;
    DROP TABLE chat_message;
    ALTER TABLE chat_message_v2 RENAME TO chat_message;
  `);
}

function addAgentModelToSettings(db: DatabaseSync): void {
  ensureColumn(db, 'settings', 'agent_model', 'TEXT');
}

function addTopicSectionProgress(db: DatabaseSync): void {
  ensureColumn(db, 'topic', 'theory_read', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'topic', 'quiz_passed', 'INTEGER NOT NULL DEFAULT 0');
}

const migrations: ReadonlyArray<Migration> = [
  {
    name: 'create-base-poc-schema',
    run: createBasePocSchema,
    version: 1,
  },
  {
    name: 'add-setup-preference-columns',
    run: addSetupPreferenceColumns,
    version: 2,
  },
  {
    name: 'create-production-durability-schema',
    run: createProductionDurabilitySchema,
    version: 3,
  },
  {
    name: 'add-progress-event-indexes',
    run: addProgressEventIndexes,
    version: 4,
  },
  {
    name: 'create-agent-session-schema',
    run: createAgentSessionSchema,
    version: 5,
  },
  {
    name: 'add-agent-tool-results',
    run: addAgentToolResults,
    version: 6,
  },
  {
    name: 'make-task-id-nullable-on-chat-message',
    run: makeTaskIdNullableOnChatMessage,
    version: 7,
  },
  {
    name: 'add-agent-model-to-settings',
    run: addAgentModelToSettings,
    version: 8,
  },
  {
    name: 'add-topic-section-progress',
    run: addTopicSectionProgress,
    version: 9,
  },
];

export function getAppliedMigrationVersions(db: DatabaseSync): ReadonlyArray<number> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migration (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  return (
    db
      .prepare('SELECT version FROM schema_migration ORDER BY version ASC')
      .all() as unknown as ReadonlyArray<MigrationRow>
  ).map((row) => row.version);
}

export function runMigrations(db: DatabaseSync): void {
  db.exec('PRAGMA foreign_keys = ON;');
  const applied = new Set(getAppliedMigrationVersions(db));
  const insertMigration = db.prepare(
    'INSERT INTO schema_migration (version, name, applied_at) VALUES (?, ?, ?)',
  );

  for (const migration of migrations) {
    if (applied.has(migration.version)) {
      continue;
    }

    runInTransaction(db, () => {
      migration.run(db);
      insertMigration.run(migration.version, migration.name, nowIso());
    });
  }
}
