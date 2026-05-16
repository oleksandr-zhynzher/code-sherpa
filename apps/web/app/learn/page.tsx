import { LearningWorkspace } from '../../components/learn/learning-workspace';
import { TheoryView } from '../../components/learn/theory-view';
import { PocApp } from '../../components/PocApp';

export default function LearnPage() {
  return (
    <>
      <LearningWorkspace />
      <TheoryView />
      <details className="poc-fallback">
        <summary>POC controls</summary>
        <PocApp />
      </details>
    </>
  );
}
