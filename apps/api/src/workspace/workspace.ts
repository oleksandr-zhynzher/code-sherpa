import { execFile } from 'node:child_process';
import { lstat, mkdir, readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

import { isAllowedGitHubRepoUrl, normalizeGitHubRepoUrl } from '../domain/repo-url.js';
import type { Task, TaskContext } from '../domain/types.js';
import { ConflictError } from '../http/errors.js';
import { createScaffoldFiles } from './scaffold.js';

const execFileAsync = promisify(execFile);
const notScaffoldedMessage = 'Task has not been scaffolded yet';

export type TaskFiles = Readonly<{
  solution: string;
  test: string;
}>;

export type RunResult = Readonly<{
  exitCode: number;
  output: string;
  passed: boolean;
}>;

export type WorkspaceStatus = Readonly<{
  branch: string | null;
  exists: boolean;
  hasUncommittedChanges: boolean;
  isGitRepository: boolean;
  message: string;
  ok: boolean;
  remoteUrl: string | null;
  workspacePath: string;
}>;

export function resolveWorkspacePath(workspaceRoot: string, relativePath: string): string {
  if (isAbsolute(relativePath)) {
    throw new ConflictError('Workspace paths must be relative');
  }

  const root = resolve(workspaceRoot);
  const target = resolve(root, relativePath);
  const relativeTarget = relative(root, target);

  if (relativeTarget.startsWith('..') || isAbsolute(relativeTarget)) {
    throw new ConflictError('Workspace path escapes the configured workspace');
  }

  return target;
}

async function assertWorkspacePathInsideRoot(
  workspaceRoot: string,
  targetPath: string,
): Promise<void> {
  const canonicalRoot = await realpath(workspaceRoot);
  const targetAncestor = await existingAncestor(targetPath);
  const canonicalTarget = await realpath(targetPath).catch(async (error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return resolve(await realpath(targetAncestor), relative(targetAncestor, targetPath));
    }

    throw error;
  });

  if (!isInsideOrSamePath(canonicalRoot, canonicalTarget)) {
    throw new ConflictError('Workspace path escapes the configured workspace');
  }
}

async function assertNotSymlink(path: string): Promise<void> {
  await lstat(path)
    .then((entry) => {
      if (entry.isSymbolicLink()) {
        throw new ConflictError('Workspace files cannot be symlinks');
      }
    })
    .catch((error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return;
      }

      throw error;
    });
}

async function resolveExistingWorkspaceFile(
  workspaceRoot: string,
  relativePath: string,
): Promise<string> {
  const targetPath = resolveWorkspacePath(workspaceRoot, relativePath);
  await assertNotSymlink(targetPath);
  await assertWorkspacePathInsideRoot(workspaceRoot, targetPath);
  return realpath(targetPath);
}

async function resolveWritableWorkspaceFile(
  workspaceRoot: string,
  relativePath: string,
): Promise<string> {
  const targetPath = resolveWorkspacePath(workspaceRoot, relativePath);
  await assertNotSymlink(targetPath);
  await assertWorkspacePathInsideRoot(workspaceRoot, targetPath);
  return targetPath;
}

function normalizeWorkspaceRoot(workspaceRoot: string): string {
  return resolve(workspaceRoot);
}

function isSubpath(basePath: string, targetPath: string): boolean {
  const relativeTarget = relative(basePath, targetPath);
  return (
    relativeTarget.length > 0 && !relativeTarget.startsWith('..') && !isAbsolute(relativeTarget)
  );
}

function isInsideOrSamePath(basePath: string, targetPath: string): boolean {
  return targetPath === basePath || isSubpath(basePath, targetPath);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

async function existingAncestor(path: string): Promise<string> {
  let candidate = path;
  while (!(await pathExists(candidate))) {
    const parent = dirname(candidate);
    if (parent === candidate) {
      throw new ConflictError('Workspace path has no existing parent directory');
    }
    candidate = parent;
  }

  return candidate;
}

export async function validateWorkspaceRoot(
  workspaceRoot: string,
  workspaceBaseRoot: string,
): Promise<string> {
  const baseInput = resolve(workspaceBaseRoot);
  const baseRoot = await realpath(baseInput);
  const targetRoot = isAbsolute(workspaceRoot)
    ? resolve(workspaceRoot)
    : resolve(baseInput, workspaceRoot);
  const exists = await pathExists(targetRoot);
  const canonicalTarget = await realpath(targetRoot).catch(async (error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      const targetAncestor = await existingAncestor(targetRoot);
      return resolve(await realpath(targetAncestor), relative(targetAncestor, targetRoot));
    }

    throw error;
  });

  if (!isSubpath(baseRoot, canonicalTarget)) {
    throw new ConflictError('Workspace path must be inside the configured workspace base');
  }

  if (!exists) {
    const canonicalParent = await realpath(await existingAncestor(dirname(targetRoot)));
    if (!isSubpath(baseRoot, canonicalParent) && canonicalParent !== baseRoot) {
      throw new ConflictError('Workspace path must be inside the configured workspace base');
    }
  }

  return canonicalTarget;
}

async function runGit(
  workspaceRoot: string,
  args: ReadonlyArray<string>,
): Promise<Readonly<{ stderr: string; stdout: string }>> {
  // eslint-disable-next-line security/detect-child-process -- Git is invoked without a shell and scoped to the configured workspace.
  return execFileAsync('git', [...args], {
    cwd: workspaceRoot,
    timeout: 10_000,
  });
}

async function isGitRepository(workspaceRoot: string): Promise<boolean> {
  try {
    const result = await runGit(workspaceRoot, ['rev-parse', '--is-inside-work-tree']);
    return result.stdout.trim() === 'true';
  } catch {
    return false;
  }
}

async function getGitOutputOrNull(
  workspaceRoot: string,
  args: ReadonlyArray<string>,
): Promise<string | null> {
  try {
    const result = await runGit(workspaceRoot, args);
    const output = result.stdout.trim();
    return output.length === 0 ? null : output;
  } catch {
    return null;
  }
}

export async function getWorkspaceStatus(workspaceRoot: string): Promise<WorkspaceStatus> {
  const normalizedRoot = normalizeWorkspaceRoot(workspaceRoot);
  const exists = await pathExists(normalizedRoot);
  if (!exists) {
    return {
      branch: null,
      exists: false,
      hasUncommittedChanges: false,
      isGitRepository: false,
      message: 'Workspace folder does not exist yet.',
      ok: false,
      remoteUrl: null,
      workspacePath: normalizedRoot,
    };
  }

  const gitRepository = await isGitRepository(normalizedRoot);
  if (!gitRepository) {
    return {
      branch: null,
      exists: true,
      hasUncommittedChanges: false,
      isGitRepository: false,
      message: 'Workspace folder exists but is not a git repository.',
      ok: false,
      remoteUrl: null,
      workspacePath: normalizedRoot,
    };
  }

  const status = (await getGitOutputOrNull(normalizedRoot, ['status', '--porcelain'])) ?? '';
  const remoteUrl = normalizeGitHubRepoUrl(
    (await getGitOutputOrNull(normalizedRoot, ['remote', 'get-url', 'origin'])) ?? '',
  );

  return {
    branch: await getGitOutputOrNull(normalizedRoot, ['branch', '--show-current']),
    exists: true,
    hasUncommittedChanges: status.length > 0,
    isGitRepository: true,
    message: 'Workspace is linked and ready.',
    ok: true,
    remoteUrl,
    workspacePath: normalizedRoot,
  };
}

export async function linkWorkspaceRepository(
  workspaceRoot: string,
  repoUrl: string | null,
  workspaceBaseRoot: string,
): Promise<WorkspaceStatus> {
  if (repoUrl !== null && !isAllowedGitHubRepoUrl(repoUrl)) {
    throw new ConflictError('Repository URL must be a GitHub HTTPS or SSH URL');
  }

  const normalizedRoot = await validateWorkspaceRoot(workspaceRoot, workspaceBaseRoot);
  const exists = await pathExists(normalizedRoot);

  if (repoUrl !== null && !exists) {
    await mkdir(dirname(normalizedRoot), { recursive: true });
    // eslint-disable-next-line security/detect-child-process -- Git clone uses validated GitHub URLs and a workspace path constrained to the configured base.
    await execFileAsync('git', ['clone', repoUrl, normalizedRoot], {
      cwd: dirname(normalizedRoot),
      timeout: 60_000,
    });
    return getWorkspaceStatus(normalizedRoot);
  }

  await mkdir(normalizedRoot, { recursive: true });
  const entries = await readdir(normalizedRoot);
  const gitRepository = await isGitRepository(normalizedRoot);

  if (!gitRepository && entries.length > 0) {
    throw new ConflictError('Workspace folder must be empty or already be a git repository');
  }

  if (repoUrl !== null && !gitRepository) {
    // eslint-disable-next-line security/detect-child-process -- Git clone uses validated GitHub URLs and a workspace path constrained to the configured base.
    await execFileAsync('git', ['clone', repoUrl, normalizedRoot], {
      cwd: dirname(normalizedRoot),
      timeout: 60_000,
    });
    return getWorkspaceStatus(normalizedRoot);
  }

  if (!gitRepository) {
    await runGit(normalizedRoot, ['init']);
  }

  if (repoUrl !== null) {
    const existingRemote = await getGitOutputOrNull(normalizedRoot, [
      'remote',
      'get-url',
      'origin',
    ]);
    await runGit(
      normalizedRoot,
      existingRemote === null
        ? ['remote', 'add', 'origin', repoUrl]
        : ['remote', 'set-url', 'origin', repoUrl],
    );
  }

  return getWorkspaceStatus(normalizedRoot);
}

export async function scaffoldTask(
  workspaceRoot: string,
  task: TaskContext,
): Promise<
  Readonly<{
    files: TaskFiles;
    solutionPath: string;
    testPath: string;
  }>
> {
  const taskDirectory = join(task.topicSlug, task.slug);
  const solutionPath = join(taskDirectory, 'solution.py');
  const testPath = join(taskDirectory, 'test_solution.py');
  await mkdir(workspaceRoot, { recursive: true });
  const solutionFile = await resolveWritableWorkspaceFile(workspaceRoot, solutionPath);
  const testFile = await resolveWritableWorkspaceFile(workspaceRoot, testPath);
  const files = createScaffoldFiles(task);

  await mkdir(dirname(solutionFile), { recursive: true });
  await writeFile(solutionFile, files.solution, { flag: 'wx' }).catch(async (error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      await resolveExistingWorkspaceFile(workspaceRoot, solutionPath);
      return;
    }

    throw error;
  });
  await writeFile(testFile, files.test, { flag: 'wx' }).catch(async (error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      await resolveExistingWorkspaceFile(workspaceRoot, testPath);
      return;
    }

    throw error;
  });

  return {
    files: await readTaskFiles(workspaceRoot, { ...task, solutionPath, testPath }),
    solutionPath,
    testPath,
  };
}

export async function readTaskFiles(workspaceRoot: string, task: Task): Promise<TaskFiles> {
  if (task.solutionPath === null || task.testPath === null) {
    throw new ConflictError(notScaffoldedMessage);
  }

  const solution = await readFile(
    await resolveExistingWorkspaceFile(workspaceRoot, task.solutionPath),
    'utf8',
  );
  const test = await readFile(
    await resolveExistingWorkspaceFile(workspaceRoot, task.testPath),
    'utf8',
  );

  return {
    solution,
    test,
  };
}

export async function writeSolution(
  workspaceRoot: string,
  task: Task,
  content: string,
): Promise<TaskFiles> {
  if (task.solutionPath === null) {
    throw new ConflictError(notScaffoldedMessage);
  }

  await writeFile(await resolveWritableWorkspaceFile(workspaceRoot, task.solutionPath), content);
  return readTaskFiles(workspaceRoot, task);
}

export async function runTaskTests(workspaceRoot: string, task: Task): Promise<RunResult> {
  if (task.solutionPath === null || task.testPath === null) {
    throw new ConflictError(notScaffoldedMessage);
  }

  await resolveExistingWorkspaceFile(workspaceRoot, task.solutionPath);
  const testFile = await resolveExistingWorkspaceFile(workspaceRoot, task.testPath);

  try {
    // eslint-disable-next-line security/detect-child-process -- Local test execution is restricted to scaffolded files inside workspaceRoot.
    const result = await execFileAsync('python3', [testFile], {
      cwd: dirname(testFile),
      timeout: 10_000,
    });

    return {
      exitCode: 0,
      output: `${result.stdout}${result.stderr}`,
      passed: true,
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'stdout' in error && 'stderr' in error) {
      const failed = error as Readonly<{ code?: number; stderr: string; stdout: string }>;
      return {
        exitCode: failed.code ?? 1,
        output: `${failed.stdout}${failed.stderr}`,
        passed: false,
      };
    }

    throw error;
  }
}

export async function commitTask(
  workspaceRoot: string,
  task: Task,
  message: string,
): Promise<
  Readonly<{
    output: string;
  }>
> {
  if (task.solutionPath === null || task.testPath === null) {
    throw new ConflictError(notScaffoldedMessage);
  }

  if (task.status !== 'passing' && task.status !== 'done') {
    throw new ConflictError('Task tests must pass before committing');
  }

  const solutionPath = await resolveExistingWorkspaceFile(workspaceRoot, task.solutionPath);
  const testPath = await resolveExistingWorkspaceFile(workspaceRoot, task.testPath);

  try {
    // eslint-disable-next-line security/detect-child-process -- Git is scoped to the configured local workspace repository.
    await execFileAsync('git', ['add', solutionPath, testPath], {
      cwd: workspaceRoot,
      timeout: 10_000,
    });
    // eslint-disable-next-line security/detect-child-process -- Git is scoped to the configured local workspace repository.
    const result = await execFileAsync('git', ['commit', '-m', message], {
      cwd: workspaceRoot,
      timeout: 10_000,
    });

    return {
      output: `${result.stdout}${result.stderr}`,
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'stderr' in error) {
      const failed = error as Readonly<{ stderr: string; stdout?: string }>;
      throw new ConflictError(`${failed.stdout ?? ''}${failed.stderr}`.trim());
    }

    throw error;
  }
}
