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
  quizPassed: boolean;
  slug: string;
  status: TaskStatus;
  tasks: ReadonlyArray<Task>;
  theoryRead: boolean;
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

export type LearningPathSummary = PlanSummary;
export type LearningPathDetail = PlanDetail;

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
  path: LearningPathSummary | null;
  task: Task | null;
  topic: Omit<Topic, 'tasks'> | null;
}>;

export type SetupState = Readonly<{
  agentDriver: 'claude' | 'copilot';
  agentModel: string | null;
  autoSaveProgress: boolean;
  claudePath: string | null;
  copilotPath: string | null;
  exerciseLanguage: 'python' | 'typescript';
  guideTone: 'direct' | 'encouraging' | 'socratic';
  repoUrl: string | null;
  safeRunChecks: boolean;
  workspacePath: string;
}>;

export type WorkspaceStatus = Readonly<{
  branch: string | null;
  exists: boolean;
  hasUncommittedChanges: boolean;
  isGitRepository: boolean;
  message: string;
  ok: boolean;
  remoteUrl: string | null;
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

export type CodeGenerationStatus = 'completed' | 'conflict' | 'failed' | 'pending';

export type CodeGeneration = Readonly<{
  createdAt: string;
  generatedPaths: ReadonlyArray<string>;
  id: string;
  prompt: string;
  status: CodeGenerationStatus;
  taskId: string;
  updatedAt: string;
}>;

export type TestRun = Readonly<{
  command: string;
  createdAt: string;
  durationMs: number | null;
  exitCode: number;
  id: string;
  output: string;
  passed: boolean;
  taskId: string;
}>;

export type ChatThreadScopeType = 'path' | 'quiz' | 'setup' | 'task' | 'topic';

export type ChatThread = Readonly<{
  createdAt: string;
  id: string;
  scopeId: string;
  scopeType: ChatThreadScopeType;
  title: string;
  updatedAt: string;
}>;

export type ThreadMessage = Readonly<{
  contentMd: string;
  createdAt: string;
  id: string;
  role: 'assistant' | 'tool' | 'user';
  threadId: string;
}>;

export type GuideAction = 'break_it_down' | 'explain_concept' | 'explain_error' | 'small_hint';

export type GuideActionContext = Readonly<{
  code?: string;
  exercisePrompt?: string;
  selectedText?: string;
  testOutput?: string;
  topicMd?: string;
}>;

export type QuizQuestion = Readonly<{
  id: string;
  quizId: string;
  position: number;
  type: 'multiple_choice' | 'short_answer';
  promptMd: string;
  choices: ReadonlyArray<string> | null;
  correctAnswer: string;
  explanation: string;
}>;

export type Quiz = Readonly<{
  id: string;
  topicId: string;
  title: string;
  createdAt: string;
  questions: ReadonlyArray<QuizQuestion>;
}>;

export type QuizAttemptStatus = 'in_progress' | 'completed';

export type QuizAnswer = Readonly<{
  id: string;
  attemptId: string;
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  feedback: string | null;
}>;

export type QuizAttempt = Readonly<{
  id: string;
  quizId: string;
  status: QuizAttemptStatus;
  score: number | null;
  totalQuestions: number | null;
  durationMs: number | null;
  startedAt: string;
  completedAt: string | null;
  answers: ReadonlyArray<QuizAnswer>;
}>;

export type LearnView = 'exercise' | 'quiz' | 'results' | 'theory';
