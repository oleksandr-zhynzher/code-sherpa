export type TaskStatus = 'todo' | 'in_progress' | 'passing' | 'done';

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

export type Topic = Readonly<{
  explanationMd: string | null;
  id: string;
  planId: string;
  position: number;
  slug: string;
  status: TaskStatus;
  tasks: ReadonlyArray<Task>;
  title: string;
}>;

export type PlanSummary = Readonly<{
  createdAt: string;
  doneTasks: number;
  goal: string;
  id: string;
  title: string;
  totalTasks: number;
}>;

export type PlanDetail = PlanSummary &
  Readonly<{
    topics: ReadonlyArray<Topic>;
  }>;

export type SetupState = Readonly<{
  claudePath: string | null;
  repoUrl: string | null;
  workspacePath: string;
}>;

export type TaskFiles = Readonly<{
  solution: string;
  test: string;
}>;

export type RunResult = Readonly<{
  exitCode: number;
  output: string;
  passed: boolean;
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
