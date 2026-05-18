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
        if (data.length === 0) {
          setPhase('create');
          return;
        }
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

  if (view === 'theory') return <TheoryView {...sharedProps} />;
  if (view === 'quiz') return <QuizView {...sharedProps} onQuizComplete={handleQuizComplete} />;
  if (view === 'results')
    return <QuizResultsView {...sharedProps} quizScore={quizScore} quizTotal={quizTotal} />;
  return <LearningWorkspace {...sharedProps} />;
}
