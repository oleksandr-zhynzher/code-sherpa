'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { LearnPageView } from '../../../components/learn/learn-page-view';
import { api } from '../../../lib/api';
import type { LearnView, PlanDetail } from '../../../lib/types';

export function LearnDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [activePlan, setActivePlan] = useState<PlanDetail | null>(null);
  const [activeTopicIdx, setActiveTopicIdx] = useState(0);
  const [activeTaskIdx, setActiveTaskIdx] = useState(0);
  const [view, setView] = useState<LearnView>('exercise');
  const [quizScore, setQuizScore] = useState<null | number>(null);
  const [quizTotal, setQuizTotal] = useState<null | number>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlan() {
      try {
        const detail = await api.showPlan(id);
        setActivePlan(detail);
      } catch (error) {
        console.error('Failed to load plan', id, error);
        setErrorMsg((error as Error).message || 'Failed to load plan');
      } finally {
        setLoading(false);
      }
    }
    void loadPlan();
  }, [id, router]);

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

  async function handleMarkTaskDone(taskId: string) {
    try {
      const { task } = await api.markTaskDone(taskId);
      setActivePlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          topics: prev.topics.map((t) => ({
            ...t,
            tasks: t.tasks.map((tk) => (tk.id === task.id ? { ...tk, status: task.status } : tk)),
          })),
        };
      });
    } catch {
      // Ignore
    }
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

  if (errorMsg) {
    return (
      <div style={{ color: 'red', padding: '2rem' }}>
        Error loading plan: {errorMsg}. ID: {id}
      </div>
    );
  }

  if (loading || !activePlan) {
    return (
      <div className="learn-loading" role="status">
        <span className="plan-create-spinner" aria-hidden="true" />
        Loading your learning path…
      </div>
    );
  }

  const activeTopic = activePlan.topics[activeTopicIdx] ?? null;
  const activeTask = activeTopic?.tasks[activeTaskIdx] ?? null;

  return (
    <LearnPageView
      activePlan={activePlan}
      activeTopic={activeTopic}
      activeTask={activeTask}
      quizScore={quizScore}
      quizTotal={quizTotal}
      view={view}
      onMarkTaskDone={(taskId) => void handleMarkTaskDone(taskId)}
      onNavigate={setView}
      onNewPlan={() => router.push('/learn')}
      onNextTopic={handleNextTopic}
      onQuizComplete={handleQuizComplete}
      onSelectTask={handleSelectTask}
      onSelectTopic={handleSelectTopic}
    />
  );
}
