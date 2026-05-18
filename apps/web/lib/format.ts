import type { PlanSummary, TaskStatus } from './types';

export function formatProgress(plan: PlanSummary): string {
  if (plan.totalTasks === 0) {
    return '0% complete';
  }

  return `${Math.round((plan.doneTasks / plan.totalTasks) * 100)}% complete`;
}

export function statusLabel(status: TaskStatus): string {
  if (status === 'in_progress') {
    return 'In progress';
  }

  if (status === 'passing') {
    return 'Passing';
  }

  if (status === 'done') {
    return 'Done';
  }

  return 'Todo';
}
