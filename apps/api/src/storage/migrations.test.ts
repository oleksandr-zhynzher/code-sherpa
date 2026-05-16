import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { createDatabase } from './database.js';
import { getAppliedMigrationVersions, runMigrations } from './migrations.js';

function listTables(db: DatabaseSync): ReadonlyArray<string> {
  return (
    db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as ReadonlyArray<{ name: string }>
  ).map((row) => row.name);
}

function listIndexes(db: DatabaseSync): ReadonlyArray<string> {
  return (
    db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name")
      .all() as ReadonlyArray<{ name: string }>
  ).map((row) => row.name);
}

describe('database migrations', () => {
  it('creates the versioned production schema for an empty database', () => {
    const db = new DatabaseSync(':memory:');

    runMigrations(db);

    expect(getAppliedMigrationVersions(db)).toEqual([1, 2, 3, 4]);
    expect(listTables(db)).toEqual(
      expect.arrayContaining([
        'chat_message',
        'chat_thread',
        'code_generation',
        'exercise',
        'learning_path',
        'progress_event',
        'quiz',
        'quiz_answer',
        'quiz_attempt',
        'quiz_question',
        'schema_migration',
        'settings',
        'test_run',
        'topic',
        'user_preferences',
        'visualization',
      ]),
    );
    db.prepare('INSERT INTO user_preferences (id) VALUES (1)').run();
    expect(db.prepare('SELECT updated_at FROM user_preferences WHERE id = 1').get()).toMatchObject({
      updated_at: expect.any(String),
    });
    expect(listIndexes(db)).toContain('idx_progress_event_created_at');

    db.close();
  });

  it('migrates a legacy POC settings table without losing saved setup', () => {
    const directory = mkdtempSync(join(tmpdir(), 'code-sherpa-migration-'));
    const dbPath = join(directory, 'legacy.db');
    const legacyDb = new DatabaseSync(dbPath);
    legacyDb.exec(`
      CREATE TABLE settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        claude_path TEXT,
        repo_url TEXT,
        workspace_path TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      INSERT INTO settings (id, claude_path, repo_url, workspace_path, updated_at)
      VALUES (1, '/usr/local/bin/claude', 'git@github.com:example/legacy.git', '/tmp/legacy-workspace', '2026-01-01T00:00:00.000Z');
    `);
    legacyDb.close();

    try {
      const database = createDatabase(dbPath);

      expect(database.getSetup('/tmp/fallback')).toEqual({
        agentDriver: 'copilot',
        autoSaveProgress: true,
        claudePath: '/usr/local/bin/claude',
        copilotPath: null,
        exerciseLanguage: 'python',
        guideTone: 'encouraging',
        repoUrl: 'git@github.com:example/legacy.git',
        safeRunChecks: true,
        workspacePath: '/tmp/legacy-workspace',
      });

      database.close();
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});
