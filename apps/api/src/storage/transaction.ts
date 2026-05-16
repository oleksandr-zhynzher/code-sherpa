import type { DatabaseSync } from 'node:sqlite';

export function runInTransaction<T>(db: DatabaseSync, operation: () => T): T {
  db.exec('BEGIN');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
