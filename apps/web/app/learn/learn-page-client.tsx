'use client';

import { useState } from 'react';

import { LearningWorkspace } from '../../components/learn/learning-workspace';
import { QuizResultsView } from '../../components/learn/quiz-results-view';
import { QuizView } from '../../components/learn/quiz-view';
import { TheoryView } from '../../components/learn/theory-view';
import type { LearnView } from '../../lib/types';

export function LearnPageClient() {
  const [view, setView] = useState<LearnView>('exercise');

  if (view === 'theory') return <TheoryView onNavigate={setView} />;
  if (view === 'quiz') return <QuizView onNavigate={setView} />;
  if (view === 'results') return <QuizResultsView onNavigate={setView} />;
  return <LearningWorkspace onNavigate={setView} />;
}
