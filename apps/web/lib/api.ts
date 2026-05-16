import type {
  ChatMessage,
  PlanDetail,
  PlanSummary,
  RunResult,
  SetupState,
  Task,
  TaskFiles,
  Visualization,
} from './types';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://127.0.0.1:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'object' &&
      payload.error !== null &&
      'message' in payload.error &&
      typeof payload.error.message === 'string'
        ? payload.error.message
        : 'Request failed';

    throw new Error(message);
  }

  return payload as T;
}

export const api = {
  chat: (taskId: string, message: string) =>
    request<
      Readonly<{
        assistantMessage: ChatMessage;
        userMessage: ChatMessage;
        visualization: Visualization | null;
      }>
    >(`/api/tasks/${taskId}/chat`, {
      body: JSON.stringify({ message }),
      method: 'POST',
    }),
  commitTask: (taskId: string) =>
    request<Readonly<{ task: Task }>>(`/api/tasks/${taskId}/commit`, {
      body: JSON.stringify({}),
      method: 'POST',
    }),
  createPlan: (goal: string) =>
    request<PlanDetail>('/api/plans', {
      body: JSON.stringify({ goal }),
      method: 'POST',
    }),
  explainTopic: (topicId: string) =>
    request<Readonly<{ explanationMd: string }>>(`/api/topics/${topicId}/explain`, {
      method: 'POST',
    }),
  getSetup: () => request<SetupState>('/api/setup'),
  listPlans: () => request<Readonly<{ data: ReadonlyArray<PlanSummary> }>>('/api/plans'),
  readFiles: (taskId: string) =>
    request<Readonly<{ files: TaskFiles; task: Task }>>(`/api/tasks/${taskId}/files`),
  runTask: (taskId: string) =>
    request<Readonly<{ result: RunResult; task: Task }>>(`/api/tasks/${taskId}/run`, {
      method: 'POST',
    }),
  saveSetup: (input: Readonly<{ claudePath: string; repoUrl: string }>) =>
    request<SetupState>('/api/setup', {
      body: JSON.stringify(input),
      method: 'POST',
    }),
  saveSolution: (taskId: string, content: string) =>
    request<Readonly<{ files: TaskFiles; task: Task }>>(`/api/tasks/${taskId}/solution`, {
      body: JSON.stringify({ content }),
      method: 'PUT',
    }),
  scaffoldTask: (taskId: string) =>
    request<Readonly<{ files: TaskFiles; task: Task }>>(`/api/tasks/${taskId}/scaffold`, {
      method: 'POST',
    }),
  showPlan: (planId: string) => request<PlanDetail>(`/api/plans/${planId}`),
};
