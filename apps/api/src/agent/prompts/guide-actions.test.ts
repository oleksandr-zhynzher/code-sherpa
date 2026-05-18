import { describe, expect, it } from 'vitest';

import { buildGuideActionPrompt } from './guide-actions.js';

describe('buildGuideActionPrompt', () => {
  it('small_hint includes exercise and code context', () => {
    const prompt = buildGuideActionPrompt('small_hint', {
      code: 'def solve(): pass',
      exercisePrompt: 'Find longest substring without repeating characters.',
    });

    expect(prompt).toContain('hint');
    expect(prompt).toContain('Find longest substring');
    expect(prompt).toContain('def solve(): pass');
    expect(prompt).not.toContain('sub-problem');
  });

  it('explain_error includes test output', () => {
    const prompt = buildGuideActionPrompt('explain_error', {
      code: 'def solve(): return []',
      testOutput: 'AssertionError: expected 3 got 0',
    });

    expect(prompt).toContain('failing test output');
    expect(prompt).toContain('AssertionError');
    expect(prompt).toContain('def solve(): return []');
  });

  it('break_it_down focuses on sub-problems', () => {
    const prompt = buildGuideActionPrompt('break_it_down', {
      exercisePrompt: 'Implement a LRU cache.',
    });

    expect(prompt).toContain('sub-problem');
    expect(prompt).toContain('Implement a LRU cache');
  });

  it('explain_concept uses selected text and topic context', () => {
    const prompt = buildGuideActionPrompt('explain_concept', {
      selectedText: 'memoization',
      topicMd: 'Dynamic programming builds solutions bottom-up.',
    });

    expect(prompt).toContain('memoization');
    expect(prompt).toContain('Dynamic programming');
  });

  it('omits missing context sections gracefully', () => {
    const prompt = buildGuideActionPrompt('small_hint', {});

    expect(prompt).toContain('hint');
    expect(prompt).not.toContain('Exercise:');
    expect(prompt).not.toContain('Current code:');
  });
});
