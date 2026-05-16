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

export type SetupState = Readonly<{
  claudePath: string | null;
  repoUrl: string | null;
  workspacePath: string;
}>;
