'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CoursesPage } from '../../components/learn/courses-page';
import { api } from '../../lib/api';
import type { PlanDetail, PlanSummary } from '../../lib/types';
import { PlanCreate } from './plan-create';

type Phase = 'courses' | 'create' | 'loading';

export function LearnListClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [plans, setPlans] = useState<PlanSummary[]>([]);

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
    router.push(`/learn/${plan.id}`);
  }

  function handleSelectPlan(plan: PlanSummary) {
    router.push(`/learn/${plan.id}`);
  }

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

  return (
    <CoursesPage plans={plans} onCreateNew={() => setPhase('create')} onSelect={handleSelectPlan} />
  );
}
