import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function runClaudeCli(
  claudePath: string,
  prompt: string,
  systemPrompt: string,
): Promise<string> {
  // eslint-disable-next-line security/detect-child-process -- Claude path is configured locally and invoked without a shell.
  const result = await execFileAsync(claudePath, ['--print', `${systemPrompt}\n\n${prompt}`], {
    timeout: 30_000,
  });

  return result.stdout.trim();
}
