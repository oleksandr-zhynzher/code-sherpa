export type TaskStatus = 'todo' | 'in_progress' | 'passing' | 'done';

export type PlanSummary = Readonly<{
  createdAt: string;
  doneTasks: number;
  goal: string;
  id: string;
  title: string;
  totalTasks: number;
}>;

export type Topic = Readonly<{
  explanationMd: string | null;
  id: string;
  planId: string;
  position: number;
  slug: string;
  status: TaskStatus;
  title: string;
}>;

export type Task = Readonly<{
  difficulty: 'easy' | 'medium' | 'hard';
  id: string;
  language: 'python' | 'typescript';
  lastRunAt: string | null;
  lastRunPass: boolean | null;
  position: number;
  promptMd: string;
  slug: string;
  solutionPath: string | null;
  status: TaskStatus;
  testPath: string | null;
  title: string;
  topicId: string;
}>;

export type PlanDetail = PlanSummary &
  Readonly<{
    topics: ReadonlyArray<Topic & Readonly<{ tasks: ReadonlyArray<Task> }>>;
  }>;

export type ProgressEvent = Readonly<{
  createdAt: string;
  eventType: string;
  id: string;
  metadata: Readonly<Record<string, unknown>>;
  scopeId: string;
  scopeType: 'chat' | 'path' | 'quiz' | 'setup' | 'task' | 'topic' | 'visualization';
}>;

export type ResumeState = Readonly<{
  lastEvent: ProgressEvent | null;
  path: PlanSummary | null;
  task: Task | null;
  topic: Topic | null;
}>;

export type SetupState = Readonly<{
  agentDriver: 'claude' | 'copilot';
  autoSaveProgress: boolean;
  claudePath: string | null;
  copilotPath: string | null;
  exerciseLanguage: 'python' | 'typescript';
  guideTone: 'direct' | 'encouraging' | 'socratic';
  repoUrl: string | null;
  safeRunChecks: boolean;
  workspacePath: string;
}>;

export type TaskContext = Task &
  Readonly<{
    topicSlug: string;
  }>;

export type ChatMessage = Readonly<{
  contentMd: string;
  createdAt: string;
  id: string;
  role: 'assistant' | 'tool' | 'user';
  taskId: string;
}>;

export type Visualization = Readonly<{
  createdAt: string;
  id: string;
  kind: 'chartjs' | 'html' | 'mermaid' | 'svg';
  payload: string;
  prompt: string;
  taskId: string;
}>;
