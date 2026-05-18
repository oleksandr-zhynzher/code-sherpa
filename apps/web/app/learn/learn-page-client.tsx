'use client';

import { useEffect, useState } from 'react';

import { LearningWorkspace } from '../../components/learn/learning-workspace';
import { QuizResultsView } from '../../components/learn/quiz-results-view';
import { QuizView } from '../../components/learn/quiz-view';
import { TheoryView } from '../../components/learn/theory-view';
import { api } from '../../lib/api';
import type { LearnView, PlanDetail, PlanSummary } from '../../lib/types';
import { PlanCreate } from './plan-create';

type Phase = 'loading' | 'create' | 'learning';
type GenerateAllState = 'idle' | 'running' | 'done';

interface GenerateAllBarProps {
  planId: string;
  onPlanRefreshed: (plan: PlanDetail) => void;
}

function GenerateAllBar({ planId, onPlanRefreshed }: GenerateAllBarProps) {
  const [state, setState] = useState<GenerateAllState>('idle');
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setState('running');
    setResult(null);
    try {
      const res = await api.generateAllPlanContent(planId);
      const { explanations, quizzes, exercises } = res.generated;
      setResult(
        `Generated: ${explanations} theory pages, ${quizzes} quizzes, ${exercises} exercises across ${res.total} topics.`,
      );
      const fresh = await api.showPlan(planId);
      onPlanRefreshed(fresh);
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Generation failed.');
    } finally {
      setState('done');
    }
  }

  const label =
    state === 'running'
      ? '⏳ Generating content for all topics…'
      : result !== null
        ? `✅ ${result}`
        : 'Pre-generate theory, quizzes, and exercises for every topic at once.';

  return (
    <div className="learn-generate-all-bar">
      <span className="learn-generate-all-bar__text">{label}</span>
      <button
        className="learn-generate-all-bar__btn"
        disabled={state === 'running'}
        type="button"
        onClick={() => void run()}
      >
        {state === 'running' ? 'Generating…' : 'Generate All Content'}
      </button>
    </div>
  );
}

export function LearnPageClient() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [activePlan, setActivePlan] = useState<PlanDetail | null>(null);
  const [activeTopicIdx, setActiveTopicIdx] = useState(0);
  const [activeTaskIdx, setActiveTaskIdx] = useState(0);
  const [view, setView] = useState<LearnView>('exercise');
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizTotal, setQuizTotal] = useState<number | null>(null);

  useEffect(() => {
    async function loadPlans() {
      try {
        const { data } = await api.listPlans();
        setPlans([...data]);
        const first = data[0];
        if (!first) {
          setPhase('create');
          return;
        }
        const plan = await api.showPlan(first.id);
        setActivePlan(plan);
        setPhase('learning');
      } catch {
        setPhase('create');
      }
    }
    void loadPlans();
  }, []);

  function handlePlanCreated(plan: PlanDetail) {
    setActivePlan(plan);
    setPlans((prev) => [plan, ...prev]);
    setActiveTopicIdx(0);
    setActiveTaskIdx(0);
    setView('exercise');
    setPhase('learning');
  }

  function handleSelectTopic(idx: number) {
    setActiveTopicIdx(idx);
    setActiveTaskIdx(0);
    setView('exercise');
  }

  function handleSelectTask(taskIdx: number) {
    setActiveTaskIdx(taskIdx);
    setView('exercise');
  }

  function handleQuizComplete(score: number, total: number) {
    setQuizScore(score);
    setQuizTotal(total);
    setView('results');
  }

  function handleNextTopic() {
    const nextIdx = activeTopicIdx + 1;
    if (activePlan && nextIdx < activePlan.topics.length) {
      setActiveTopicIdx(nextIdx);
      setActiveTaskIdx(0);
      setQuizScore(null);
      setQuizTotal(null);
    }
    setView('exercise');
  }

  const activeTopic = activePlan?.topics[activeTopicIdx] ?? null;
  const activeTask = activeTopic?.tasks[activeTaskIdx] ?? null;

  const sharedProps = {
    activePlan,
    activeTopic,
    activeTask,
    onNavigate: setView,
    onNewPlan: () => setPhase('create'),
    onSelectTask: handleSelectTask,
    onSelectTopic: handleSelectTopic,
    onNextTopic: handleNextTopic,
  };

  if (phase === 'loading') {
    return (
      <div className="learn-loading" role="status">
        <span className="plan-create-spinner" aria-hidden="true" />
        Loading your plans…
      </div>
    );
  }

  if (phase === 'create') {
    const cancelFn = plans.length > 0 ? () => setPhase('learning') : undefined;
    return (
      <PlanCreate
        {...(cancelFn !== undefined ? { onCancel: cancelFn } : {})}
        onPlanCreated={handlePlanCreated}
      />
    );
  }

  const banner = activePlan ? (
    <GenerateAllBar planId={activePlan.id} onPlanRefreshed={setActivePlan} />
  ) : null;

  if (view === 'theory')
    return (
      <>
        {banner}
        <TheoryView {...sharedProps} />
      </>
    );
  if (view === 'quiz')
    return (
      <>
        {banner}
        <QuizView {...sharedProps} onQuizComplete={handleQuizComplete} />
      </>
    );
  if (view === 'results')
    return (
      <>
        {banner}
        <QuizResultsView {...sharedProps} quizScore={quizScore} quizTotal={quizTotal} />
      </>
    );
  return (
    <>
      {banner}
      <LearningWorkspace {...sharedProps} />
    </>
  );
}
