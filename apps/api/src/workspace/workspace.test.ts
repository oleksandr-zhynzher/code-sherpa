import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import type { Task } from '../domain/types.js';
import { buildServer } from '../server.js';
import { getWorkspaceStatus, readTaskFiles, runTaskTests, writeSolution } from './workspace.js';

const execFileAsync = promisify(execFile);
const topicSlug = 'arrays-two-pointers';
const taskSlug = 'valid-palindrome';
const solutionFileName = 'solution.py';
const testFileName = 'test_solution.py';
const workspaceTempPrefix = 'code-sherpa-workspace-';
const externalTempPrefix = 'code-sherpa-external-';
const secretSolution = 'secret solution';
const externalTestContent = 'print("outside")';
const linkedTaskDirectory = 'linked-task';
const symlinkFileError = 'Workspace files cannot be symlinks';
const symlinkParentError = 'Workspace path escapes the configured workspace';

const passingPalindromeSolution = `def is_palindrome(text: str) -> bool:
    left = 0
    right = len(text) - 1

    while left < right:
        while left < right and not text[left].isalnum():
            left += 1
        while left < right and not text[right].isalnum():
            right -= 1
        if text[left].lower() != text[right].lower():
            return False
        left += 1
        right -= 1

    return True
`;
const arraysPlanJson = JSON.stringify({
  title: 'Arrays Practice Path',
  topics: [
    {
      slug: topicSlug,
      tasks: [
        {
          difficulty: 'easy',
          language: 'python',
          promptMd:
            'Implement `is_palindrome(text: str) -> bool` using two pointers. Ignore non-alphanumeric characters and case.',
          slug: taskSlug,
          title: 'Valid Palindrome',
        },
      ],
      title: 'Arrays & Two Pointers',
    },
  ],
});
const scaffoldedTask: Task = {
  difficulty: 'easy',
  id: 'valid-palindrome-task',
  language: 'python',
  lastRunAt: null,
  lastRunPass: null,
  position: 1,
  promptMd: 'Implement palindrome validation.',
  slug: taskSlug,
  solutionPath: join(topicSlug, taskSlug, solutionFileName),
  status: 'in_progress',
  testPath: join(topicSlug, taskSlug, testFileName),
  title: 'Valid Palindrome',
  topicId: topicSlug,
};

describe('workspace task flow', () => {
  it('scaffolds, edits, and runs a task inside the configured workspace', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), workspaceTempPrefix));
    const server = await buildServer({
      agentProcessRunner: async () => ({ exitCode: 0, stderr: '', stdout: arraysPlanJson }),
      dbPath: ':memory:',
      logger: false,
      workspacePath,
    });

    const planResponse = await server.inject({
      method: 'POST',
      payload: { goal: 'arrays practice' },
      url: '/api/plans',
    });
    const taskId = planResponse.json().topics[0].tasks[0].id;

    const scaffoldResponse = await server.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/scaffold`,
    });

    expect(scaffoldResponse.statusCode).toBe(201);
    expect(scaffoldResponse.json().task.solutionPath).toBe(
      join(topicSlug, taskSlug, solutionFileName),
    );

    const updateResponse = await server.inject({
      method: 'PUT',
      payload: { content: passingPalindromeSolution },
      url: `/api/tasks/${taskId}/solution`,
    });

    expect(updateResponse.statusCode).toBe(200);

    const runResponse = await server.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/run`,
    });

    expect(runResponse.statusCode).toBe(200);
    expect(runResponse.json().result.passed).toBe(true);
    expect(runResponse.json().task.status).toBe('passing');

    await server.close();
    await rm(workspacePath, { force: true, recursive: true });
  });

  it('rejects symlinked task files before touching external files', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), workspaceTempPrefix));
    const externalDirectory = await mkdtemp(join(tmpdir(), externalTempPrefix));
    const taskDirectory = join(workspacePath, topicSlug, taskSlug);
    const externalSolution = join(externalDirectory, solutionFileName);
    const externalTest = join(externalDirectory, testFileName);

    await mkdir(taskDirectory, { recursive: true });
    await writeFile(externalSolution, secretSolution);
    await writeFile(externalTest, externalTestContent);
    await symlink(externalSolution, join(taskDirectory, solutionFileName));
    await symlink(externalTest, join(taskDirectory, testFileName));

    await expect(writeSolution(workspacePath, scaffoldedTask, 'overwrite')).rejects.toThrow(
      symlinkFileError,
    );
    await expect(readTaskFiles(workspacePath, scaffoldedTask)).rejects.toThrow(symlinkFileError);
    await expect(runTaskTests(workspacePath, scaffoldedTask)).rejects.toThrow(symlinkFileError);
    await expect(readFile(externalSolution, 'utf8')).resolves.toBe(secretSolution);

    await rm(workspacePath, { force: true, recursive: true });
    await rm(externalDirectory, { force: true, recursive: true });
  });

  it('rejects task paths that escape through a symlinked parent directory', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), workspaceTempPrefix));
    const externalDirectory = await mkdtemp(join(tmpdir(), externalTempPrefix));
    const task = {
      ...scaffoldedTask,
      solutionPath: join(linkedTaskDirectory, solutionFileName),
      testPath: join(linkedTaskDirectory, testFileName),
    };

    await writeFile(join(externalDirectory, solutionFileName), secretSolution);
    await writeFile(join(externalDirectory, testFileName), externalTestContent);
    await symlink(externalDirectory, join(workspacePath, linkedTaskDirectory));

    await expect(writeSolution(workspacePath, task, 'overwrite')).rejects.toThrow(
      symlinkParentError,
    );
    await expect(readTaskFiles(workspacePath, task)).rejects.toThrow(symlinkParentError);
    await expect(runTaskTests(workspacePath, task)).rejects.toThrow(symlinkParentError);
    await expect(readFile(join(externalDirectory, solutionFileName), 'utf8')).resolves.toBe(
      secretSolution,
    );

    await rm(workspacePath, { force: true, recursive: true });
    await rm(externalDirectory, { force: true, recursive: true });
  });

  it('rejects runTaskTests when only the solution file is a symlink', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), workspaceTempPrefix));
    const externalDirectory = await mkdtemp(join(tmpdir(), externalTempPrefix));
    const taskDirectory = join(workspacePath, topicSlug, taskSlug);
    const externalSolution = join(externalDirectory, solutionFileName);

    await mkdir(taskDirectory, { recursive: true });
    await writeFile(externalSolution, secretSolution);
    await writeFile(join(taskDirectory, testFileName), externalTestContent);
    await symlink(externalSolution, join(taskDirectory, solutionFileName));

    await expect(runTaskTests(workspacePath, scaffoldedTask)).rejects.toThrow(symlinkFileError);
    await expect(readFile(externalSolution, 'utf8')).resolves.toBe(secretSolution);

    await rm(workspacePath, { force: true, recursive: true });
    await rm(externalDirectory, { force: true, recursive: true });
  });

  it('redacts credentials from existing git remotes in workspace status', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), workspaceTempPrefix));

    await execFileAsync('git', ['init'], { cwd: workspacePath });
    await execFileAsync(
      'git',
      ['remote', 'add', 'origin', 'https://secret@github.com/example/algorithms.git'],
      { cwd: workspacePath },
    );

    await expect(getWorkspaceStatus(workspacePath)).resolves.toMatchObject({
      remoteUrl: 'https://github.com/example/algorithms.git',
    });

    await rm(workspacePath, { force: true, recursive: true });
  });
});
