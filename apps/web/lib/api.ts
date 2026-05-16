import type {
  ChatMessage,
  ChatThread,
  ChatThreadScopeType,
  CodeGeneration,
  GuideAction,
  GuideActionContext,
  LearningPathDetail,
  LearningPathSummary,
  PlanDetail,
  PlanSummary,
  ProgressEvent,
  ResumeState,
  RunResult,
  SetupState,
  Task,
  TaskFiles,
  TestRun,
  ThreadMessage,
  Visualization,
  WorkspaceStatus,
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
  createLearningPath: (goal: string) =>
    request<LearningPathDetail>('/api/paths', {
      body: JSON.stringify({ goal }),
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
  getTaskGeneration: (taskId: string) =>
    request<Readonly<{ generation: CodeGeneration | null }>>(`/api/tasks/${taskId}/generation`),
  getWorkspaceStatus: () =>
    request<Readonly<{ repoUrl: string | null; status: WorkspaceStatus }>>('/api/repo/status'),
  getResume: () => request<ResumeState>('/api/resume'),
  listLearningPaths: () =>
    request<Readonly<{ data: ReadonlyArray<LearningPathSummary> }>>('/api/paths'),
  listPlans: () => request<Readonly<{ data: ReadonlyArray<PlanSummary> }>>('/api/plans'),
  listProgressEvents: () =>
    request<Readonly<{ data: ReadonlyArray<ProgressEvent> }>>('/api/progress'),
  readFiles: (taskId: string) =>
    request<Readonly<{ files: TaskFiles; task: Task }>>(`/api/tasks/${taskId}/files`),
  runTask: (taskId: string) =>
    request<Readonly<{ result: RunResult; run: TestRun; task: Task }>>(`/api/tasks/${taskId}/run`, {
      method: 'POST',
    }),
  getTaskRuns: (taskId: string) =>
    request<Readonly<{ runs: ReadonlyArray<TestRun> }>>(`/api/tasks/${taskId}/runs`),
  saveSetup: (input: SetupState) =>
    request<SetupState>('/api/setup', {
      body: JSON.stringify(input),
      method: 'POST',
    }),
  linkWorkspace: (input: Readonly<{ repoUrl?: string | null; workspacePath?: string }>) =>
    request<Readonly<{ setup: SetupState; status: WorkspaceStatus }>>('/api/repo/link', {
      body: JSON.stringify(input),
      method: 'POST',
    }),
  pushWorkspace: () =>
    request<Readonly<{ result: Readonly<{ output: string }> }>>('/api/git/push', {
      method: 'POST',
    }),
  saveSolution: (taskId: string, content: string) =>
    request<Readonly<{ files: TaskFiles; task: Task }>>(`/api/tasks/${taskId}/solution`, {
      body: JSON.stringify({ content }),
      method: 'PUT',
    }),
  scaffoldTask: (taskId: string) =>
    request<Readonly<{ files: TaskFiles; generation: CodeGeneration; task: Task }>>(
      `/api/tasks/${taskId}/scaffold`,
      {
        method: 'POST',
      },
    ),
  showLearningPath: (pathId: string) => request<LearningPathDetail>(`/api/paths/${pathId}`),
  showPlan: (planId: string) => request<PlanDetail>(`/api/plans/${planId}`),
  getChatThread: (scopeType: ChatThreadScopeType, scopeId: string) =>
    request<Readonly<{ thread: ChatThread }>>(
      `/api/chat-threads?scopeType=${encodeURIComponent(scopeType)}&scopeId=${encodeURIComponent(scopeId)}`,
    ),
  getThreadMessages: (threadId: string) =>
    request<Readonly<{ messages: ReadonlyArray<ThreadMessage> }>>(
      `/api/chat-threads/${threadId}/messages`,
    ),
  postThreadMessage: (threadId: string, message: string) =>
    request<Readonly<{ message: ThreadMessage }>>(`/api/chat-threads/${threadId}/messages`, {
      body: JSON.stringify({ message }),
      method: 'POST',
    }),
  postGuideAction: (threadId: string, action: GuideAction, context?: GuideActionContext) =>
    request<Readonly<{ assistantMessage: ThreadMessage; userMessage: ThreadMessage }>>(
      `/api/chat-threads/${threadId}/guide-action`,
      {
        body: JSON.stringify({ action, context }),
        method: 'POST',
      },
    ),
  getTaskVisualizations: (taskId: string) =>
    request<Readonly<{ visualizations: ReadonlyArray<Visualization> }>>(
      `/api/tasks/${taskId}/visualizations`,
    ),
};
