'use client';

import { useEffect, useState } from 'react';

import { CoursesPage } from '../../components/learn/courses-page';
import { LearnPageView } from '../../components/learn/learn-page-view';
import { api } from '../../lib/api';
import type { LearnView, PlanDetail, PlanSummary } from '../../lib/types';
import { PlanCreate } from './plan-create';

type Phase = 'courses' | 'create' | 'learning' | 'loading';

interface GenerateAllBarProps {
  planId: string;
  onPlanRefreshed: (plan: PlanDetail) => void;
}

function GenerateAllBar({ planId, onPlanRefreshed }: GenerateAllBarProps) {
  const [state, setState] = useState<'done' | 'idle' | 'running'>('idle');
  const [result, setResult] = useState<null | string>(null);

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
  const [quizScore, setQuizScore] = useState<null | number>(null);
  const [quizTotal, setQuizTotal] = useState<null | number>(null);

  useEffect(() => {
    async function loadPlans() {
      try {
        const { data } = await api.listPlans();
        setPlans([...data]);
        setPhase(data.length === 0 ? 'create' : 'courses');
      } catch {
        setPhase('create');
      }
    }
    void loadPlans();
  }, []);

  function handlePlanCreated(plan: PlanDetail) {
    setActivePlan(plan);
    setPlans((prev) => [plan, ...prev]);
    resetLearningState();
    setPhase('learning');
  }

  function handleSelectPlan(plan: PlanDetail) {
    setActivePlan(plan);
    resetLearningState();
    setPhase('learning');
  }

  function resetLearningState() {
    setActiveTopicIdx(0);
    setActiveTaskIdx(0);
    setView('exercise');
    setQuizScore(null);
    setQuizTotal(null);
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

  if (phase === 'loading') {
    return (
      <div className="learn-loading" role="status">
        <span className="plan-create-spinner" aria-hidden="true" />
        Loading your plans…
      </div>
    );
  }

  if (phase === 'create') {
    const cancelFn = plans.length > 0 ? () => setPhase('courses') : undefined;
    return (
      <PlanCreate
        {...(cancelFn !== undefined ? { onCancel: cancelFn } : {})}
        onPlanCreated={handlePlanCreated}
      />
    );
  }

  if (phase === 'courses') {
    return (
      <CoursesPage
        plans={plans}
        onCreateNew={() => setPhase('create')}
        onSelect={handleSelectPlan}
      />
    );
  }

  const banner = activePlan ? (
    <GenerateAllBar planId={activePlan.id} onPlanRefreshed={setActivePlan} />
  ) : null;

  return (
    <>
      {banner}
      <LearnPageView
        activePlan={activePlan}
        activeTopic={activeTopic}
        activeTask={activeTask}
        quizScore={quizScore}
        quizTotal={quizTotal}
        view={view}
        onNavigate={setView}
        onNewPlan={() => setPhase('courses')}
        onNextTopic={handleNextTopic}
        onQuizComplete={handleQuizComplete}
        onSelectTask={handleSelectTask}
        onSelectTopic={handleSelectTopic}
      />
    </>
  );
}
