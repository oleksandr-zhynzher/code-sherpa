import { describe, expect, it } from 'vitest';

import { isAllowedGitHubRepoUrl, normalizeGitHubRepoUrl } from './repo-url.js';

describe('GitHub repository URL validation', () => {
  it('accepts GitHub HTTPS and SSH repository URLs', () => {
    expect(isAllowedGitHubRepoUrl('https://github.com/example/algorithms.git')).toBe(true);
    expect(isAllowedGitHubRepoUrl('git@github.com:example/algorithms.git')).toBe(true);
  });

  it('rejects unsafe or invalid repository URLs', () => {
    expect(isAllowedGitHubRepoUrl('file:///tmp/repo.git')).toBe(false);
    expect(isAllowedGitHubRepoUrl('https://secret@github.com/example/algorithms.git')).toBe(false);
    expect(isAllowedGitHubRepoUrl('https://github.com/bad_owner/algorithms.git')).toBe(false);
    expect(isAllowedGitHubRepoUrl('git@github.com:-bad/algorithms.git')).toBe(false);
    expect(isAllowedGitHubRepoUrl('https://gitlab.com/example/algorithms.git')).toBe(false);
  });

  it('redacts credentials when displaying existing git remotes', () => {
    expect(normalizeGitHubRepoUrl('https://secret@github.com/example/algorithms.git')).toBe(
      'https://github.com/example/algorithms.git',
    );
  });
});
