import { LearningWorkspace } from '../../components/learn/learning-workspace';
import { QuizResultsView } from '../../components/learn/quiz-results-view';
import { QuizView } from '../../components/learn/quiz-view';
import { TheoryView } from '../../components/learn/theory-view';
import { PocApp } from '../../components/PocApp';

export default function LearnPage() {
  return (
    <>
      <LearningWorkspace />
      <TheoryView />
      <QuizView />
      <QuizResultsView />
      <details className="poc-fallback">
        <summary>POC controls</summary>
        <PocApp />
      </details>
    </>
  );
}
