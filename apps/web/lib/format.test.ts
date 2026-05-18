import { describe, expect, it } from 'vitest';

import { formatProgress, statusLabel } from './format';

describe('POC UI formatting helpers', () => {
  it('formats plan progress as a percentage', () => {
    expect(
      formatProgress({
        createdAt: '2026-05-16T12:00:00.000Z',
        doneTasks: 2,
        goal: 'graphs',
        id: 'plan-1',
        title: 'Graphs',
        totalTasks: 5,
      }),
    ).toBe('40% complete');
  });

  it('formats task statuses for users', () => {
    expect(statusLabel('in_progress')).toBe('In progress');
    expect(statusLabel('passing')).toBe('Passing');
  });
});
