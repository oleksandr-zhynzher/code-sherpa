import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { createDatabase } from './database.js';

describe('progress persistence', () => {
  it('records task progress events and restores the latest resume state', () => {
    const database = createDatabase(':memory:');
    const path = database.createPlan('hash map mastery');
    const task = path.topics[0].tasks[0];

    database.recordTaskRun(task.id, true);
    database.markTaskDone(task.id);

    const events = database.listProgressEvents();
    expect(events.map((event) => event.eventType)).toEqual([
      'task_completed',
      'task_run',
      'path_created',
    ]);
    expect(events[0]).toMatchObject({
      metadata: { status: 'done' },
      scopeId: task.id,
      scopeType: 'task',
    });

    const resume = database.getResumeState();
    expect(resume.path?.id).toBe(path.id);
    expect(resume.topic?.id).toBe(task.topicId);
    expect(resume.task?.id).toBe(task.id);
    expect(resume.lastEvent?.eventType).toBe('task_completed');

    database.close();
  });

  it('limits progress history for startup-safe resume queries', () => {
    const database = createDatabase(':memory:');
    const path = database.createPlan('array practice');
    const task = path.topics[0].tasks[0];

    database.recordTaskRun(task.id, false);
    database.recordTaskRun(task.id, true);

    expect(database.listProgressEvents(2).map((event) => event.eventType)).toEqual([
      'task_run',
      'task_run',
    ]);
    expect(database.listProgressEvents(Number.NaN)).toHaveLength(3);

    database.close();
  });

  it('keeps resume readable when a progress metadata row is corrupted', () => {
    const directory = mkdtempSync(join(tmpdir(), 'code-sherpa-progress-'));
    const dbPath = join(directory, 'progress.db');
    const database = createDatabase(dbPath);
    const path = database.createPlan('resume after metadata corruption');
    database.close();

    const rawDb = new DatabaseSync(dbPath);
    rawDb
      .prepare(
        "UPDATE progress_event SET metadata_json = 'not-json' WHERE event_type = 'path_created'",
      )
      .run();
    rawDb.close();

    try {
      const reopenedDatabase = createDatabase(dbPath);

      expect(reopenedDatabase.listProgressEvents()[0].metadata).toEqual({
        invalidMetadata: true,
      });
      expect(reopenedDatabase.getResumeState().path?.id).toBe(path.id);

      reopenedDatabase.close();
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});
