'use client';

import { useEffect, useState } from 'react';

import { api } from '../../lib/api';
import type { GuideAction, LearnView, PlanDetail, Quiz, QuizAttempt, Task } from '../../lib/types';
import { Button, Logo, Pill, ProgressBar, Tabs } from '../ui/design-system';

type TopicWithTasks = PlanDetail['topics'][number];

interface SharedViewProps {
  activePlan: PlanDetail | null;
  activeTopic: TopicWithTasks | null;
  activeTask: Task | null;
  view: LearnView;
  onNavigate: (view: LearnView) => void;
  onNewPlan: () => void;
  onSelectTopic: (idx: number) => void;
  onSelectTask: (idx: number) => void;
  onNextTopic: () => void;
  onQuizComplete: (score: number, total: number) => void;
}

const DEFAULT_PLAN_TITLE = 'Learning Path';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function difficultyTone(d: string): 'danger' | 'success' | 'warning' {
  if (d === 'easy') return 'success';
  if (d === 'hard') return 'danger';
  return 'warning';
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  activePlan: PlanDetail | null;
  activeTopic: TopicWithTasks | null;
  activeTask: Task | null;
  view: LearnView;
  onNavigate: (view: LearnView) => void;
  onNewPlan: () => void;
  onSelectTopic: (idx: number) => void;
  onSelectTask: (idx: number) => void;
}

function LearnSidebar({
  activePlan,
  activeTopic,
  activeTask,
  view,
  onNavigate,
  onNewPlan,
  onSelectTopic,
  onSelectTask,
}: SidebarProps) {
  const planTitle = activePlan?.title ?? '';
  const topicTitle = activeTopic?.title ?? '';
  const doneTasks = activePlan?.doneTasks ?? 0;
  const totalTasks = activePlan?.totalTasks ?? 0;

  return (
    <aside className="learn-sidebar">
      <div className="learn-sidebar__header">
        <p className="learn-kicker">Your Paths</p>
        <Button variant="secondary" onClick={onNewPlan}>
          New
        </Button>
      </div>

      <button className="learn-continue-card" type="button" onClick={() => onNavigate('exercise')}>
        <div className="learn-continue-card__icon" aria-hidden="true">
          ▶
        </div>
        <div>
          <p className="learn-continue-card__action">Continue where you left off</p>
          <p className="learn-continue-card__topic">{topicTitle}</p>
        </div>
      </button>

      {activePlan && (
        <div className="learn-path-row active">
          <div className="learn-path-row__header">
            <strong className="learn-path-row__title">{planTitle}</strong>
            <span className="learn-path-row__meta">
              {doneTasks} of {totalTasks} tasks
            </span>
          </div>
          <ProgressBar label={`${planTitle} progress`} max={totalTasks} value={doneTasks} />
        </div>
      )}

      <div className="learn-topics-section">
        <p className="learn-topics-section__label">Topics</p>
        {activePlan?.topics.map((topic, topicIdx) => {
          const isActive = activeTopic?.id === topic.id;
          return (
            <div key={topic.id}>
              <button
                className={`learn-topic-item${isActive ? ' active' : ''}`}
                type="button"
                onClick={() => onSelectTopic(topicIdx)}
              >
                <span
                  className={`learn-topic-item__icon${
                    topic.status === 'done'
                      ? ' learn-topic-item__icon--done'
                      : ' learn-topic-item__icon--circle'
                  }`}
                  aria-hidden="true"
                >
                  {topic.status === 'done' ? '✓' : ''}
                </span>
                <span className="learn-topic-item__name">{topic.title}</span>
              </button>
              {isActive && (
                <div className="learn-topic-subtopics">
                  <button
                    className={`learn-topic-subtopic${view === 'theory' ? ' active' : ''}`}
                    type="button"
                    onClick={() => onNavigate('theory')}
                  >
                    Theory
                  </button>
                  <button
                    className={`learn-topic-subtopic${view === 'exercise' ? ' active' : ''}`}
                    type="button"
                    onClick={() => onNavigate('exercise')}
                  >
                    Exercises
                  </button>
                  <button
                    className={`learn-topic-subtopic${view === 'quiz' || view === 'results' ? ' active' : ''}`}
                    type="button"
                    onClick={() => onNavigate('quiz')}
                  >
                    Quiz
                  </button>
                </div>
              )}
              {isActive && view === 'exercise' && topic.tasks.length > 1 && (
                <div className="learn-topic-subtopics">
                  {topic.tasks.map((task, taskIdx) => (
                    <button
                      className={`learn-topic-subtopic${activeTask?.id === task.id ? ' active' : ''}`}
                      key={task.id}
                      type="button"
                      onClick={() => onSelectTask(taskIdx)}
                    >
                      {task.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ─── Exercise Main ────────────────────────────────────────────────────────────

function ExerciseMain({
  activePlan,
  activeTopic,
  activeTask,
  onNavigate,
}: {
  activePlan: PlanDetail | null;
  activeTopic: TopicWithTasks | null;
  activeTask: Task | null;
  onNavigate: (view: LearnView) => void;
}) {
  const planTitle = activePlan?.title ?? DEFAULT_PLAN_TITLE;
  const topicTitle = activeTopic?.title ?? '';
  const taskTitle = activeTask?.title ?? 'Select a task';
  const taskDifficulty = activeTask?.difficulty ?? 'medium';
  const taskPrompt = activeTask?.promptMd ?? '';
  const [code, setCode] = useState('');

  useEffect(() => {
    setCode('');
  }, [activeTask?.id]);

  return (
    <main className="learn-main">
      <div className="learn-exercise-header">
        <p className="learn-exercise-header__breadcrumb">
          {planTitle} / {topicTitle} / {taskTitle}
        </p>
        <div className="learn-exercise-header__title-row">
          <h1 className="learn-exercise-header__title">{taskTitle}</h1>
          <Pill tone={difficultyTone(taskDifficulty)}>
            {taskDifficulty.charAt(0).toUpperCase() + taskDifficulty.slice(1)}
          </Pill>
        </div>
      </div>

      <div className="learn-exercise-desc">
        {taskPrompt.split('\n\n').map((para, i) => (
          <p key={i}>{para.replaceAll('**', '')}</p>
        ))}
      </div>

      <div className="learn-editor-header">
        <h2>Your Solution</h2>
        <span className="learn-editor-lang">{activeTask?.language ?? 'typescript'}</span>
      </div>

      <div className="learn-code-editor">
        <div className="learn-code-editor__label">
          <span>solution.{activeTask?.language === 'typescript' ? 'ts' : 'py'}</span>
        </div>
        <textarea
          aria-label="Your Solution"
          className="learn-code-editor__textarea"
          spellCheck={false}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>

      <div className="learn-action-bar">
        <Button>Check My Answer</Button>
        <Button variant="secondary">Save Progress</Button>
        <Button variant="ghost">Get a Hint</Button>
      </div>

      <div className="learn-next">
        <div>
          <p className="learn-kicker">Up next</p>
          <h2>Take the Quiz</h2>
          <p>{activeTopic?.tasks.length ?? 0} questions · Test your understanding</p>
        </div>
        <Button onClick={() => onNavigate('quiz')}>Take Quiz</Button>
      </div>
    </main>
  );
}

// ─── Theory Main ──────────────────────────────────────────────────────────────

function TheoryMain({
  activePlan,
  activeTopic,
  onNavigate,
}: {
  activePlan: PlanDetail | null;
  activeTopic: TopicWithTasks | null;
  onNavigate: (view: LearnView) => void;
}) {
  const planTitle = activePlan?.title ?? DEFAULT_PLAN_TITLE;
  const topicTitle = activeTopic?.title ?? '';
  const [explanation, setExplanation] = useState<null | string>(activeTopic?.explanationMd ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<null | string>(null);

  useEffect(() => {
    setExplanation(activeTopic?.explanationMd ?? null);
    setGenError(null);
  }, [activeTopic?.id, activeTopic?.explanationMd]);

  // Auto-generate when navigating here with no content
  useEffect(() => {
    if (!activeTopic?.id || explanation !== null || isGenerating) return;
    setIsGenerating(true);
    void api
      .explainTopic(activeTopic.id)
      .then(({ explanationMd }) => setExplanation(explanationMd))
      .catch((e: unknown) =>
        setGenError(e instanceof Error ? e.message : 'Failed to generate explanation'),
      )
      .finally(() => setIsGenerating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTopic?.id]);

  return (
    <main className="learn-main">
      <p className="learn-exercise-header__breadcrumb">
        {planTitle} / {topicTitle} / Theory
      </p>
      <article className="theory-article">
        <h1>{topicTitle}</h1>
        {isGenerating && (
          <div className="theory-generate-card">
            <span className="plan-create-spinner" aria-hidden="true" />
            <p>Generating explanation…</p>
          </div>
        )}
        {!isGenerating && genError && (
          <div className="theory-generate-card">
            <p style={{ color: 'var(--error)' }}>{genError}</p>
            <Button
              onClick={() => {
                setGenError(null);
                setExplanation(null);
              }}
            >
              Retry
            </Button>
          </div>
        )}
        {!isGenerating && !genError && explanation && (
          <>
            <div className="theory-md-content">
              {explanation.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            <div className="theory-next">
              <div>
                <p className="learn-kicker">Up next</p>
                <h2>Practice with Exercises</h2>
                <p>
                  {activeTopic?.tasks.length ?? 0} exercises · {topicTitle}
                </p>
              </div>
              <Button onClick={() => onNavigate('exercise')}>Exercise</Button>
              <button
                className="theory-next__quiz-link"
                type="button"
                onClick={() => onNavigate('quiz')}
              >
                Take the quiz instead
              </button>
            </div>
          </>
        )}
      </article>
    </main>
  );
}

// ─── Quiz Main ────────────────────────────────────────────────────────────────

function QuizMain({
  activePlan,
  activeTopic,
  onNavigate,
  onQuizComplete,
}: {
  activePlan: PlanDetail | null;
  activeTopic: TopicWithTasks | null;
  onNavigate: (view: LearnView) => void;
  onQuizComplete: (score: number, total: number) => void;
}) {
  const planTitle = activePlan?.title ?? DEFAULT_PLAN_TITLE;
  const topicTitle = activeTopic?.title ?? '';
  const [quiz, setQuiz] = useState<null | Quiz>(null);
  const [attempt, setAttempt] = useState<null | QuizAttempt>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!activeTopic?.id) return;
    setQuiz(null);
    setAttempt(null);
    setCurrentQ(0);
    setAnswers({});
    setIsLoading(true);

    void api
      .getTopicQuiz(activeTopic.id)
      .then(async (existingQuiz) => {
        if (existingQuiz) {
          setQuiz(existingQuiz);
          const a = await api.startQuizAttempt(existingQuiz.id);
          setAttempt(a);
        }
      })
      .catch(() => {
        /* no quiz yet — will auto-generate below */
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTopic?.id]);

  // Auto-generate when no quiz found after load
  useEffect(() => {
    if (isLoading || quiz !== null || isGenerating || !activeTopic?.id) return;
    setIsGenerating(true);
    void (async () => {
      try {
        const newQuiz = await api.createTopicQuiz(activeTopic.id);
        setQuiz(newQuiz);
        const a = await api.startQuizAttempt(newQuiz.id);
        setAttempt(a);
      } catch {
        /* silent */
      } finally {
        setIsGenerating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, quiz, activeTopic?.id]);

  async function handleSelectAnswer(questionId: string, choice: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: choice }));
    if (attempt?.id) {
      await api.saveQuizAnswer(attempt.id, questionId, choice).catch(() => {});
    }
  }

  async function handleSubmitQuiz() {
    if (!attempt?.id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const completed = await api.completeQuizAttempt(attempt.id);
      onQuizComplete(completed.score ?? 0, completed.totalQuestions ?? quiz?.questions.length ?? 0);
      onNavigate('results');
    } catch {
      /* ignore */
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentQuestion = quiz?.questions[currentQ] ?? null;
  const isLastQuestion = quiz ? currentQ === quiz.questions.length - 1 : false;

  return (
    <main className="learn-main">
      <div className="quiz-header">
        <p className="quiz-header__breadcrumb">
          {planTitle} / {topicTitle} / Quiz
        </p>
        <div className="quiz-header__title-row">
          <h1>{topicTitle} Quiz</h1>
        </div>
        {quiz && (
          <p className="quiz-header__progress">
            {currentQ + 1} / {quiz.questions.length}
          </p>
        )}
      </div>

      {(isLoading || isGenerating) && (
        <div className="quiz-generate-card">
          <span className="plan-create-spinner" aria-hidden="true" />
          <p>{isGenerating ? 'Generating quiz questions…' : 'Loading quiz…'}</p>
        </div>
      )}

      {!isLoading && !isGenerating && quiz && currentQuestion && (
        <div className="quiz-question-card">
          <div className="quiz-question-meta">
            <strong>Question {currentQ + 1}</strong>
            <span>Multiple Choice</span>
          </div>
          <h2>{currentQuestion.promptMd}</h2>
          <div className="quiz-choice-list" role="radiogroup" aria-label="Answer choices">
            {(currentQuestion.choices ?? []).map((choice) => {
              const isSelected = answers[currentQuestion.id] === choice;
              return (
                <button
                  aria-checked={isSelected}
                  className={isSelected ? 'selected' : undefined}
                  key={choice}
                  role="radio"
                  tabIndex={isSelected ? 0 : -1}
                  type="button"
                  onClick={() => void handleSelectAnswer(currentQuestion.id, choice)}
                >
                  {choice}
                </button>
              );
            })}
          </div>
          <div className="quiz-controls">
            <Button
              disabled={currentQ === 0}
              variant="secondary"
              onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
            >
              Previous
            </Button>
            {isLastQuestion ? (
              <Button disabled={isSubmitting} onClick={() => void handleSubmitQuiz()}>
                {isSubmitting ? 'Submitting…' : 'Submit Quiz'}
              </Button>
            ) : (
              <Button
                onClick={() =>
                  setCurrentQ((q) => Math.min((quiz.questions.length ?? 1) - 1, q + 1))
                }
              >
                Next Question
              </Button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Results Main ─────────────────────────────────────────────────────────────

function ResultsMain({
  activePlan,
  activeTopic,
  quizScore,
  quizTotal,
  onNavigate,
  onNextTopic,
}: {
  activePlan: PlanDetail | null;
  activeTopic: TopicWithTasks | null;
  quizScore: null | number;
  quizTotal: null | number;
  onNavigate: (view: LearnView) => void;
  onNextTopic: () => void;
}) {
  const planTitle = activePlan?.title ?? DEFAULT_PLAN_TITLE;
  const topicTitle = activeTopic?.title ?? '';
  const score = quizScore ?? 0;
  const total = quizTotal ?? 0;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <main className="learn-main">
      <div className="quiz-header">
        <p className="quiz-header__breadcrumb">
          {planTitle} / {topicTitle} / Results
        </p>
        <div className="quiz-header__title-row">
          <h1>Quiz Results</h1>
        </div>
      </div>

      <div className="quiz-results-score">
        <div className="quiz-results-score__circle">
          <span className="quiz-results-score__pct">{pct}%</span>
          <span className="quiz-results-score__label">
            {score}/{total} correct
          </span>
        </div>
        <div className="quiz-results-score__verdict">
          {pct >= 80 ? '🎉 Great job!' : pct >= 60 ? '👍 Good effort!' : '📚 Keep studying!'}
        </div>
      </div>

      <div className="quiz-results-actions">
        <Button variant="secondary" onClick={() => onNavigate('quiz')}>
          Retake Quiz
        </Button>
        <Button onClick={onNextTopic}>Next Topic</Button>
      </div>
    </main>
  );
}

// ─── Guide Panel ──────────────────────────────────────────────────────────────

interface GuidePanelProps {
  scopeType: 'task' | 'topic';
  scopeId: string | undefined;
  quickActions: ReadonlyArray<{ action: GuideAction; label: string }>;
  contextMd: string;
}

function GuidePanel({ scopeType, scopeId, quickActions, contextMd }: GuidePanelProps) {
  const [messages, setMessages] = useState<ReadonlyArray<{ content: string; role: string }>>([]);
  const [inputVal, setInputVal] = useState('');
  const [threadId, setThreadId] = useState<null | string>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!scopeId) return;
    let cancelled = false;
    void (async () => {
      try {
        const { thread } = await api.getChatThread(scopeType, scopeId);
        if (cancelled) return;
        setThreadId(thread.id);
        const { messages: msgs } = await api.getThreadMessages(thread.id);
        if (cancelled) return;
        setMessages(msgs.map((m) => ({ role: m.role, content: m.contentMd })));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeId, scopeType]);

  async function sendQuickAction(action: GuideAction) {
    if (!scopeId || isLoading) return;
    setIsLoading(true);
    try {
      let tid = threadId;
      if (!tid) {
        const { thread } = await api.getChatThread(scopeType, scopeId);
        tid = thread.id;
        setThreadId(tid);
      }
      const { assistantMessage } = await api.postGuideAction(tid, action, {
        topicMd: contextMd,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage.contentMd }]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = inputVal.trim();
    if (!text || !scopeId || isLoading) return;
    setInputVal('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);
    try {
      let tid = threadId;
      if (!tid) {
        const { thread } = await api.getChatThread(scopeType, scopeId);
        tid = thread.id;
        setThreadId(tid);
      }
      const { message } = await api.postThreadMessage(tid, text);
      setMessages((prev) => [...prev, { role: 'assistant', content: message.contentMd }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <aside className="learn-guide">
      <div className="learn-guide__tabs">
        <Tabs
          activeId="guide"
          items={[
            { id: 'guide', label: 'Guide' },
            { id: 'visualize', label: 'Visualize' },
            { id: 'progress', label: 'Progress' },
          ]}
        />
      </div>
      <div className="learn-chat-area">
        {messages.map((m, i) => (
          <article key={i} className={`learn-message ${m.role}`}>
            {m.role === 'assistant' && <p className="learn-message__label">Sherpa</p>}
            <p>{m.content}</p>
          </article>
        ))}
        {isLoading && (
          <div className="learn-chat-loading">
            <span className="plan-create-spinner" aria-hidden="true" />
            Thinking…
          </div>
        )}
      </div>
      <div className="learn-quick-actions">
        {quickActions.map(({ action, label }) => (
          <button key={action} type="button" onClick={() => void sendQuickAction(action)}>
            {label}
          </button>
        ))}
      </div>
      <form className="learn-chat-input-bar" onSubmit={(e) => void handleSubmit(e)}>
        <input
          aria-label="Ask your Sherpa anything"
          placeholder="Ask your Sherpa anything..."
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
        />
        <button aria-label="Send message" className="learn-chat-input-bar__send" type="submit">
          →
        </button>
      </form>
    </aside>
  );
}

// ─── Quick action configs per view ───────────────────────────────────────────

const EXERCISE_ACTIONS: ReadonlyArray<{ action: GuideAction; label: string }> = [
  { action: 'small_hint', label: 'Small hint' },
  { action: 'explain_concept', label: 'Explain error' },
  { action: 'break_it_down', label: 'Break it down' },
];
const THEORY_ACTIONS: ReadonlyArray<{ action: GuideAction; label: string }> = [
  { action: 'break_it_down', label: 'Show me an example' },
  { action: 'explain_concept', label: 'Compare both' },
  { action: 'small_hint', label: 'Go deeper' },
];
const QUIZ_ACTIONS: ReadonlyArray<{ action: GuideAction; label: string }> = [
  { action: 'small_hint', label: 'Small hint' },
  { action: 'explain_concept', label: 'Explain topic' },
  { action: 'break_it_down', label: 'Break it down' },
];

// ─── Main export ─────────────────────────────────────────────────────────────

interface LearnPageViewProps extends SharedViewProps {
  quizScore: null | number;
  quizTotal: null | number;
}

export function LearnPageView({
  activePlan,
  activeTopic,
  activeTask,
  view,
  quizScore,
  quizTotal,
  onNavigate,
  onNewPlan,
  onSelectTopic,
  onSelectTask,
  onNextTopic,
  onQuizComplete,
}: LearnPageViewProps) {
  // guide panel config per view
  const guideScope: 'task' | 'topic' = view === 'exercise' ? 'task' : 'topic';
  const guideScopeId = view === 'exercise' ? activeTask?.id : activeTopic?.id;
  const guideContextMd =
    view === 'exercise'
      ? (activeTask?.promptMd ?? activeTask?.title ?? '')
      : (activeTopic?.explanationMd ?? activeTopic?.title ?? '');
  const quickActions =
    view === 'theory' ? THEORY_ACTIONS : view === 'exercise' ? EXERCISE_ACTIONS : QUIZ_ACTIONS;

  return (
    <section className="learn-space" aria-label="Your learning space">
      <header className="learn-topbar">
        <Logo />
        <nav aria-label="Learning navigation">
          <a href="/">Home</a>
          <a href="/setup">Setup</a>
          <a aria-current="page" href="/learn">
            Learning Space
          </a>
        </nav>
        <div className="learn-topbar__right">
          <div className="learn-topbar__status">
            <span className="learn-topbar__status-dot" aria-hidden="true" />
            <span>All systems ready</span>
          </div>
          <div aria-label="User initials" className="learn-avatar">
            OZ
          </div>
        </div>
      </header>

      <div className="learn-layout">
        <LearnSidebar
          activePlan={activePlan}
          activeTopic={activeTopic}
          activeTask={activeTask}
          view={view}
          onNavigate={onNavigate}
          onNewPlan={onNewPlan}
          onSelectTask={onSelectTask}
          onSelectTopic={onSelectTopic}
        />

        {view === 'theory' && (
          <TheoryMain activePlan={activePlan} activeTopic={activeTopic} onNavigate={onNavigate} />
        )}
        {view === 'quiz' && (
          <QuizMain
            activePlan={activePlan}
            activeTopic={activeTopic}
            onNavigate={onNavigate}
            onQuizComplete={onQuizComplete}
          />
        )}
        {view === 'results' && (
          <ResultsMain
            activePlan={activePlan}
            activeTopic={activeTopic}
            quizScore={quizScore}
            quizTotal={quizTotal}
            onNavigate={onNavigate}
            onNextTopic={onNextTopic}
          />
        )}
        {view === 'exercise' && (
          <ExerciseMain
            activePlan={activePlan}
            activeTopic={activeTopic}
            activeTask={activeTask}
            onNavigate={onNavigate}
          />
        )}

        <GuidePanel
          contextMd={guideContextMd}
          key={`${guideScope}-${guideScopeId ?? 'none'}`}
          quickActions={quickActions}
          scopeId={guideScopeId}
          scopeType={guideScope}
        />
      </div>
    </section>
  );
}
