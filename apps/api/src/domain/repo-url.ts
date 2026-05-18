const sshGitHubPrefix = 'git@github.com:';

function isAsciiLetterOrDigit(character: string): boolean {
  const code = character.charCodeAt(0);

  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function withoutGitSuffix(segment: string): string {
  return segment.endsWith('.git') ? segment.slice(0, -4) : segment;
}

function isGitHubOwnerSegment(segment: string): boolean {
  return (
    segment.length > 0 &&
    segment.length <= 39 &&
    isAsciiLetterOrDigit(segment[0] ?? '') &&
    isAsciiLetterOrDigit(segment.at(-1) ?? '') &&
    [...segment].every((character) => isAsciiLetterOrDigit(character) || character === '-')
  );
}

function isGitHubRepoSegment(segment: string): boolean {
  return (
    segment.length > 0 &&
    [...segment].every(
      (character) =>
        isAsciiLetterOrDigit(character) ||
        character === '_' ||
        character === '.' ||
        character === '-',
    )
  );
}

function hasValidOwnerAndRepo(owner: string, repo: string): boolean {
  return isGitHubOwnerSegment(owner) && isGitHubRepoSegment(withoutGitSuffix(repo));
}

function hasValidGitHubPathParts(pathParts: ReadonlyArray<string>): boolean {
  const [owner, repo] = pathParts;
  return (
    owner !== undefined &&
    repo !== undefined &&
    pathParts.length === 2 &&
    hasValidOwnerAndRepo(owner, repo)
  );
}

export function isAllowedGitHubRepoUrl(value: string): boolean {
  if (normalizeGitHubRepoUrl(value) === null) {
    return false;
  }

  if (value.startsWith(sshGitHubPrefix)) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.username.length === 0 && parsed.password.length === 0;
  } catch {
    return false;
  }
}

export function normalizeGitHubRepoUrl(value: string): string | null {
  if (value.startsWith(sshGitHubPrefix)) {
    const pathParts = value.slice(sshGitHubPrefix.length).split('/');
    return hasValidGitHubPathParts(pathParts)
      ? `${sshGitHubPrefix}${pathParts[0]}/${pathParts[1]}`
      : null;
  }

  try {
    const parsed = new URL(value);
    const pathParts = parsed.pathname.split('/').filter((part) => part.length > 0);

    if (
      parsed.protocol !== 'https:' ||
      parsed.hostname !== 'github.com' ||
      parsed.search.length > 0 ||
      parsed.hash.length > 0 ||
      !hasValidGitHubPathParts(pathParts)
    ) {
      return null;
    }

    return `https://github.com/${pathParts[0]}/${pathParts[1]}`;
  } catch {
    return null;
  }
}
