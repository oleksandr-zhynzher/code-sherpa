import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { QuizResultsView } from './quiz-results-view';

describe('QuizResultsView', () => {
  it('renders the designed completed quiz state and review actions', () => {
    const markup = renderToStaticMarkup(<QuizResultsView />);

    expect(markup).toContain('Quiz completed!');
    expect(markup).toContain('You scored 7 out of 10');
    expect(markup).toContain('Quiz Complete');
    expect(markup).toContain('7 / 10');
    expect(markup).toContain('Good progress! You&#x27;re building solid foundations.');
    expect(markup).toContain('Topic Performance');
    expect(markup).toContain('Array Basics');
    expect(markup).toContain('Hash Map Operations');
    expect(markup).toContain('Review Answers');
    expect(markup).toContain('Review weak areas');
  });
});
