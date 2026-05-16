import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { QuizView } from './quiz-view';

describe('QuizView', () => {
  it('renders the designed in-progress quiz state and guide prompt', () => {
    const markup = renderToStaticMarkup(<QuizView />);

    expect(markup).toContain('Quiz in progress');
    expect(markup).toContain('Arrays &amp; Hash Maps Quiz');
    expect(markup).toContain('12:34');
    expect(markup).toContain('4 / 10');
    expect(markup).toContain('Question 4');
    expect(markup).toContain('What is the average time complexity of a hash map lookup operation?');
    expect(markup).toContain('O(1) — Constant time');
    expect(markup).toContain('Next Question');
    expect(markup).toContain('Hint available');
    expect(markup).toContain('Explain topic');
  });
});
