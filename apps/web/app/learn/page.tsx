import { LearningWorkspace } from '../../components/learn/learning-workspace';
import { PocApp } from '../../components/PocApp';

export default function LearnPage() {
  return (
    <>
      <LearningWorkspace />
      <details className="poc-fallback">
        <summary>POC controls</summary>
        <PocApp />
      </details>
    </>
  );
}
