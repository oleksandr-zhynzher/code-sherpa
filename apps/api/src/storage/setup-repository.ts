import type { DatabaseSync } from 'node:sqlite';

import { normalizeGitHubRepoUrl } from '../domain/repo-url.js';
import type { SetupState } from '../domain/types.js';

type SettingsRow = Readonly<{
  agent_driver: SetupState['agentDriver'];
  agent_model: string | null;
  auto_save_progress: number;
  claude_path: string | null;
  copilot_path: string | null;
  exercise_language: SetupState['exerciseLanguage'];
  guide_tone: SetupState['guideTone'];
  repo_url: string | null;
  safe_run_checks: number;
  workspace_path: string;
}>;

export type SetupRepository = Readonly<{
  getSetup: (workspacePath: string) => SetupState;
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
}>;

function nowIso(): string {
  return new Date().toISOString();
}

function mapSetup(row: SettingsRow | undefined, workspacePath: string): SetupState {
  return {
    agentDriver: row?.agent_driver ?? 'copilot',
    agentModel: row?.agent_model ?? null,
    autoSaveProgress: row?.auto_save_progress === undefined ? true : row.auto_save_progress === 1,
    claudePath: row?.claude_path ?? null,
    copilotPath: row?.copilot_path ?? null,
    exerciseLanguage: row?.exercise_language ?? 'python',
    guideTone: row?.guide_tone ?? 'encouraging',
    repoUrl:
      row?.repo_url === undefined || row.repo_url === null
        ? null
        : normalizeGitHubRepoUrl(row.repo_url),
    safeRunChecks: row?.safe_run_checks === undefined ? true : row.safe_run_checks === 1,
    workspacePath: row?.workspace_path ?? workspacePath,
  };
}

export function createSetupRepository(db: DatabaseSync): SetupRepository {
  return {
    getSetup: (workspacePath) => {
      const row = db.prepare('SELECT * FROM settings WHERE id = 1').get() as
        | SettingsRow
        | undefined;

      return mapSetup(row, workspacePath);
    },
    saveSetup: (input) => {
      const updatedAt = nowIso();
      db.prepare(
        `
        INSERT INTO settings (
          id,
          agent_driver,
          agent_model,
          copilot_path,
          claude_path,
          repo_url,
          workspace_path,
          exercise_language,
          safe_run_checks,
          auto_save_progress,
          guide_tone,
          updated_at
        )
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          agent_driver = excluded.agent_driver,
          agent_model = excluded.agent_model,
          copilot_path = excluded.copilot_path,
          claude_path = excluded.claude_path,
          repo_url = excluded.repo_url,
          workspace_path = excluded.workspace_path,
          exercise_language = excluded.exercise_language,
          safe_run_checks = excluded.safe_run_checks,
          auto_save_progress = excluded.auto_save_progress,
          guide_tone = excluded.guide_tone,
          updated_at = excluded.updated_at
      `,
      ).run(
        input.agentDriver,
        input.agentModel ?? null,
        input.copilotPath ?? null,
        input.claudePath ?? null,
        input.repoUrl ?? null,
        input.workspacePath,
        input.exerciseLanguage,
        input.safeRunChecks ? 1 : 0,
        input.autoSaveProgress ? 1 : 0,
        input.guideTone,
        updatedAt,
      );

      return {
        agentDriver: input.agentDriver,
        agentModel: input.agentModel ?? null,
        autoSaveProgress: input.autoSaveProgress,
        claudePath: input.claudePath ?? null,
        copilotPath: input.copilotPath ?? null,
        exerciseLanguage: input.exerciseLanguage,
        guideTone: input.guideTone,
        repoUrl: input.repoUrl ?? null,
        safeRunChecks: input.safeRunChecks,
        workspacePath: input.workspacePath,
      };
    },
  };
}
