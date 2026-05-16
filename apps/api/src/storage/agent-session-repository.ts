import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

import type {
  AgentRunResult,
  AgentSessionStartInput,
  AgentSessionStore,
  AgentToolCall,
} from '../agent/driver.js';

export type AgentSessionStatus = 'completed' | 'failed' | 'running';

export type AgentSessionRecord = Readonly<{
  completedAt: string | null;
  driver: string;
  durationMs: number | null;
  errorMessage: string | null;
  id: string;
  prompt: string;
  responseMd: string | null;
  startedAt: string;
  status: AgentSessionStatus;
  systemPrompt: string | null;
  toolCalls: ReadonlyArray<AgentToolCall>;
}>;

type AgentSessionRow = Readonly<{
  completed_at: string | null;
  driver: string;
  duration_ms: number | null;
  error_message: string | null;
  id: string;
  prompt: string;
  response_md: string | null;
  started_at: string;
  status: AgentSessionStatus;
  system_prompt: string | null;
  tool_calls_json: string;
}>;

export type AgentSessionRepository = AgentSessionStore &
  Readonly<{
    get: (id: string) => AgentSessionRecord;
  }>;

function nowIso(): string {
  return new Date().toISOString();
}

function parseToolCalls(json: string, sessionId: string): ReadonlyArray<AgentToolCall> {
  try {
    return JSON.parse(json) as ReadonlyArray<AgentToolCall>;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Agent session ${sessionId} has corrupted tool call data`);
    }

    throw error;
  }
}

function mapAgentSession(row: AgentSessionRow): AgentSessionRecord {
  return {
    completedAt: row.completed_at,
    driver: row.driver,
    durationMs: row.duration_ms,
    errorMessage: row.error_message,
    id: row.id,
    prompt: row.prompt,
    responseMd: row.response_md,
    startedAt: row.started_at,
    status: row.status,
    systemPrompt: row.system_prompt,
    toolCalls: parseToolCalls(row.tool_calls_json, row.id),
  };
}

function assertUpdatedSession(changes: bigint | number, id: string): void {
  if (changes !== 1 && changes !== 1n) {
    throw new Error(`Agent session ${id} was not found`);
  }
}

export function createAgentSessionRepository(db: DatabaseSync): AgentSessionRepository {
  return {
    complete: async (id, result: AgentRunResult & Readonly<{ durationMs: number }>) => {
      const update = db
        .prepare(
          `
        UPDATE agent_session
        SET status = 'completed',
          response_md = ?,
          tool_calls_json = ?,
          duration_ms = ?,
          completed_at = ?
        WHERE id = ?
      `,
        )
        .run(
          result.contentMd,
          JSON.stringify(result.toolCalls ?? []),
          result.durationMs,
          nowIso(),
          id,
        );
      assertUpdatedSession(update.changes, id);
    },
    fail: async (id, result) => {
      const update = db
        .prepare(
          `
        UPDATE agent_session
        SET status = 'failed',
          response_md = ?,
          tool_calls_json = ?,
          error_message = ?,
          duration_ms = ?,
          completed_at = ?
        WHERE id = ?
      `,
        )
        .run(
          result.contentMd,
          JSON.stringify(result.toolCalls ?? []),
          result.errorMessage,
          result.durationMs,
          nowIso(),
          id,
        );
      assertUpdatedSession(update.changes, id);
    },
    get: (id) => {
      const row = db.prepare('SELECT * FROM agent_session WHERE id = ?').get(id) as unknown as
        | AgentSessionRow
        | undefined;
      if (row === undefined) {
        throw new Error(`Agent session ${id} was not found`);
      }

      return mapAgentSession(row);
    },
    start: async (input: AgentSessionStartInput) => {
      const id = `agent-session-${randomUUID()}`;
      db.prepare(
        `
        INSERT INTO agent_session (
          id,
          driver,
          status,
          prompt,
          system_prompt,
          started_at
        ) VALUES (?, ?, 'running', ?, ?, ?)
      `,
      ).run(id, input.driver, input.prompt, input.systemPrompt ?? null, nowIso());

      return id;
    },
  };
}
