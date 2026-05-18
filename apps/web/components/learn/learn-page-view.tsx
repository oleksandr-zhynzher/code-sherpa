'use client';

import { BookOpen, CheckCircle2, Code2, HelpCircle } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

import { api } from '../../lib/api';
import type {
  GuideAction,
  LearnView,
  PlanDetail,
  Quiz,
  QuizAttempt,
  Task,
  Visualization,
} from '../../lib/types';
import { Button, Logo, Pill, ProgressBar } from '../ui/design-system';
import { VisualizationRenderer } from '../visualization/VisualizationRenderer';

type TopicWithTasks = PlanDetail['topics'][number];

interface SharedViewProps {
  activePlan: PlanDetail | null;
  activeTopic: TopicWithTasks | null;
  activeTask: Task | null;
  view: LearnView;
  onMarkTaskDone: (taskId: string) => void;
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

// ─── Markdown Renderers ───────────────────────────────────────────────────────

/** Renders **bold**, `code`, and _italic_ inline markdown patterns. */
function InlineMd({ text }: { text: string }) {
  const re = /\*\*([^*]+)\*\*|`([^`]+)`|_([^_]+)_/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > cursor) nodes.push(text.slice(cursor, idx));
    const [, bold, code, italic] = m;
    if (bold !== undefined) nodes.push(<strong key={key}>{bold}</strong>);
    else if (code !== undefined) nodes.push(<code key={key}>{code}</code>);
    else if (italic !== undefined) nodes.push(<em key={key}>{italic}</em>);
    cursor = idx + m[0].length;
    key++;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

/** Renders block-level markdown: headings, lists, and paragraphs with inline styles. */
function renderMdBlock(block: string, key: number): ReactNode {
  const lines = block.split('\n').filter(Boolean);
  if (lines.length === 0) return null;
  const first = lines[0] ?? '';

  if (first === '---' || first === '***' || first === '___') {
    return <hr key={key} />;
  }
  if (first.startsWith('> ')) {
    return (
      <blockquote key={key}>
        {lines.map((l, j) => (
          <p key={j}>
            <InlineMd text={l.replace(/^> ?/, '')} />
          </p>
        ))}
      </blockquote>
    );
  }
  if (first.startsWith('### ')) {
    return (
      <h4 key={key}>
        <InlineMd text={first.slice(4)} />
      </h4>
    );
  }
  if (first.startsWith('## ')) {
    return (
      <h3 key={key}>
        <InlineMd text={first.slice(3)} />
      </h3>
    );
  }
  if (first.startsWith('# ')) {
    return (
      <h2 key={key}>
        <InlineMd text={first.slice(2)} />
      </h2>
    );
  }
  if (lines.every((l) => /^[*-] /.test(l.trim()))) {
    return (
      <ul key={key}>
        {lines.map((l, j) => (
          <li key={j}>
            <InlineMd text={l.replace(/^[*-] /, '')} />
          </li>
        ))}
      </ul>
    );
  }
  if (lines.every((l) => /^\d+\. /.test(l.trim()))) {
    return (
      <ol key={key}>
        {lines.map((l, j) => (
          <li key={j}>
            <InlineMd text={l.replace(/^\d+\. /, '')} />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <p key={key}>
      {lines.flatMap((l, j) =>
        j === 0
          ? [<InlineMd key={j} text={l} />]
          : [<br key={`br-${j}`} />, <InlineMd key={j} text={l} />],
      )}
    </p>
  );
}

function MarkdownContent({ md }: { md: string }) {
  const rendered: ReactNode[] = [];
  let key = 0;

  // Split by fenced code blocks, preserving them as individual segments
  const segments = md.split(/(```\w*\n.*?```)/s);

  for (const segment of segments) {
    if (segment.startsWith('```')) {
      const lang = /^```(\w+)/.exec(segment)?.[1] ?? '';
      const code = segment.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
      rendered.push(
        <pre key={key++} className="learn-code-block" data-language={lang || undefined}>
          <code>{code}</code>
        </pre>,
      );
      continue;
    }

    for (const block of segment.split(/\n{2,}/)) {
      const node = renderMdBlock(block, key++);
      if (node) rendered.push(node);
    }
  }
  return <>{rendered}</>;
}

// ─── Radio Icon ──────────────────────────────────────────────────────────────

function RadioIcon({ active, size = 18 }: { active: boolean; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className={`radio-icon${active ? ' radio-icon--active' : ''}`}
      fill="none"
      height={size}
      viewBox="0 0 18 18"
      width={size}
    >
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      {active && <circle cx="9" cy="9" r="4" fill="currentColor" />}
    </svg>
  );
}

// ─── Subtopic Icon ────────────────────────────────────────────────────────────

function SubtopicIcon({
  type,
  active,
  done,
}: {
  type: 'exercise' | 'quiz' | 'theory';
  active: boolean;
  done?: boolean;
}) {
  const cls = `subtopic-icon${active ? ' subtopic-icon--active' : done ? ' subtopic-icon--done' : ''}`;
  if (type === 'theory' && done)
    return <CheckCircle2 aria-hidden="true" className={cls} size={16} />;
  if (type === 'theory') return <BookOpen aria-hidden="true" className={cls} size={16} />;
  if (type === 'exercise') return <Code2 aria-hidden="true" className={cls} size={16} />;
  return <HelpCircle aria-hidden="true" className={cls} size={16} />;
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  activePlan: PlanDetail | null;
  activeTopic: TopicWithTasks | null;
  activeTask: Task | null;
  view: LearnView;
  readTopics: ReadonlySet<string>;
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
  readTopics,
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
          const topicActive = isActive || topic.status === 'done';
          return (
            <div key={topic.id}>
              <button
                className={`learn-topic-item${isActive ? ' active' : ''}`}
                type="button"
                onClick={() => onSelectTopic(topicIdx)}
              >
                <RadioIcon active={topicActive} />
                <span className="learn-topic-item__name">{topic.title}</span>
              </button>
              {isActive && (
                <div className="learn-topic-subtopics">
                  <button
                    className={`learn-topic-subtopic${view === 'theory' ? ' active' : ''}`}
                    type="button"
                    onClick={() => onNavigate('theory')}
                  >
                    <SubtopicIcon
                      active={view === 'theory'}
                      done={readTopics.has(topic.id)}
                      type="theory"
                    />
                    Theory
                  </button>

                  <div className="learn-topic-subtopic-group">
                    <button
                      className={`learn-topic-subtopic${view === 'exercise' ? ' active' : ''}`}
                      type="button"
                      onClick={() => onNavigate('exercise')}
                    >
                      <SubtopicIcon
                        active={view === 'exercise'}
                        done={
                          topic.tasks.length > 0 &&
                          topic.tasks.every((t) => t.status === 'done' || t.status === 'passing')
                        }
                        type="exercise"
                      />
                      Exercises
                    </button>
                    {view === 'exercise' && topic.tasks.length > 1 && (
                      <div className="learn-topic-tasks">
                        {topic.tasks.map((task, taskIdx) => (
                          <button
                            className={`learn-topic-subtopic${activeTask?.id === task.id ? ' active' : ''}`}
                            key={task.id}
                            type="button"
                            onClick={() => onSelectTask(taskIdx)}
                          >
                            <RadioIcon active={activeTask?.id === task.id} size={14} />
                            {task.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    className={`learn-topic-subtopic${view === 'quiz' || view === 'results' ? ' active' : ''}`}
                    type="button"
                    onClick={() => onNavigate('quiz')}
                  >
                    <SubtopicIcon
                      active={view === 'quiz' || view === 'results'}
                      done={topic.quizPassed}
                      type="quiz"
                    />
                    Quiz
                  </button>
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

type RunStatus = 'idle' | 'saving' | 'running' | 'pass' | 'fail' | 'error';

function ExerciseMain({
  activePlan,
  activeTopic,
  activeTask,
  onMarkTaskDone,
  onNavigate,
  onGetHint,
}: {
  activePlan: PlanDetail | null;
  activeTopic: TopicWithTasks | null;
  activeTask: Task | null;
  onMarkTaskDone: (taskId: string) => void;
  onNavigate: (view: LearnView) => void;
  onGetHint: () => void;
}) {
  const planTitle = activePlan?.title ?? DEFAULT_PLAN_TITLE;
  const topicTitle = activeTopic?.title ?? '';
  const taskTitle = activeTask?.title ?? 'Select a task';
  const taskDifficulty = activeTask?.difficulty ?? 'medium';
  const taskPrompt = activeTask?.promptMd ?? '';
  const isDone = activeTask?.status === 'done' || activeTask?.status === 'passing';
  const [code, setCode] = useState('');
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [runOutput, setRunOutput] = useState('');

  useEffect(() => {
    setCode('');
    setRunStatus('idle');
    setRunOutput('');
  }, [activeTask?.id]);

  async function handleSave() {
    if (!activeTask?.id || runStatus === 'saving' || runStatus === 'running') return;
    setRunStatus('saving');
    try {
      await api.saveSolution(activeTask.id, code);
      setRunStatus('idle');
    } catch {
      setRunStatus('error');
      setRunOutput('Failed to save progress.');
    }
  }

  async function handleCheck() {
    if (!activeTask?.id || runStatus === 'running' || runStatus === 'saving') return;
    setRunStatus('saving');
    try {
      await api.saveSolution(activeTask.id, code);
    } catch {
      setRunStatus('error');
      setRunOutput('Failed to save solution before running.');
      return;
    }
    setRunStatus('running');
    try {
      const { result } = await api.runTask(activeTask.id);
      setRunStatus(result.passed ? 'pass' : 'fail');
      const output =
        result.output ||
        (result.exitCode === 'ENOENT'
          ? 'Test runner not found. Make sure your workspace is set up correctly.'
          : result.passed
            ? ''
            : 'No output from test runner.');
      setRunOutput(output);
    } catch {
      setRunStatus('error');
      setRunOutput('Failed to run tests. Please try again.');
    }
  }

  const isBusy = runStatus === 'saving' || runStatus === 'running';

  return (
    <main className="learn-main">
      <div className="view-header">
        <p className="view-breadcrumb">
          <span>{planTitle}</span> / <span>{topicTitle}</span> /{' '}
          <span className="view-breadcrumb__current">Exercise</span>
        </p>
        <div className="view-header__title-row">
          <h1 className="view-header__title">{taskTitle}</h1>
          <Pill tone={difficultyTone(taskDifficulty)}>
            {taskDifficulty.charAt(0).toUpperCase() + taskDifficulty.slice(1)}
          </Pill>
          {isDone ? (
            <span className="mark-as-read-btn mark-as-read-btn--done">
              <CheckCircle2 aria-hidden="true" size={15} />
              Completed
            </span>
          ) : (
            <button
              className="mark-as-read-btn"
              type="button"
              onClick={() => activeTask && onMarkTaskDone(activeTask.id)}
            >
              <CheckCircle2 aria-hidden="true" size={15} />
              Mark as done
            </button>
          )}
        </div>
      </div>

      <div className="view-body">
        <div className="learn-exercise-desc">
          {taskPrompt.split('\n\n').map((para, i) => (
            <p key={i}>
              <InlineMd text={para} />
            </p>
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
          <Button disabled={isBusy || !activeTask} onClick={() => void handleCheck()}>
            {runStatus === 'running'
              ? 'Running…'
              : runStatus === 'saving'
                ? 'Saving…'
                : 'Check My Answer'}
          </Button>
          <Button
            disabled={isBusy || !activeTask}
            variant="secondary"
            onClick={() => void handleSave()}
          >
            {runStatus === 'saving' ? 'Saving…' : 'Save Progress'}
          </Button>
          <Button variant="ghost" onClick={onGetHint}>
            Get a Hint
          </Button>
        </div>

        {runStatus === 'pass' && (
          <div className="learn-run-result learn-run-result--pass" role="status">
            <strong>✓ All tests passed!</strong>
            {runOutput && <pre className="learn-run-output">{runOutput}</pre>}
          </div>
        )}
        {runStatus === 'fail' && (
          <div className="learn-run-result learn-run-result--fail" role="status">
            <strong>✗ Tests failed</strong>
            {runOutput && <pre className="learn-run-output">{runOutput}</pre>}
          </div>
        )}
        {runStatus === 'error' && (
          <div className="learn-run-result learn-run-result--fail" role="status">
            <strong>Error</strong>
            {runOutput && <p>{runOutput}</p>}
          </div>
        )}

        <div className="learn-next">
          <div>
            <p className="learn-kicker">Up next</p>
            <h2>Take the Quiz</h2>
            <p>Test your understanding of {topicTitle}</p>
          </div>
          <Button onClick={() => onNavigate('quiz')}>Take Quiz</Button>
        </div>
      </div>
    </main>
  );
}

// ─── Theory Main ──────────────────────────────────────────────────────────────

function TheoryMain({
  activePlan,
  activeTopic,
  onNavigate,
  onMarkAsRead,
}: {
  activePlan: PlanDetail | null;
  activeTopic: TopicWithTasks | null;
  onNavigate: (view: LearnView) => void;
  onMarkAsRead: () => void;
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

  // Mark section complete and navigate away
  function handleNext(view: LearnView) {
    onMarkAsRead();
    onNavigate(view);
  }

  async function generate() {
    if (!activeTopic?.id || isGenerating) return;
    setIsGenerating(true);
    setGenError(null);
    try {
      const { explanationMd } = await api.explainTopic(activeTopic.id);
      setExplanation(explanationMd);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Failed to generate explanation');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="learn-main">
      <div className="view-header">
        <p className="view-breadcrumb">
          <span>{planTitle}</span> / <span>{topicTitle}</span> /{' '}
          <span className="view-breadcrumb__current">Theory</span>
        </p>
        <div className="view-header__title-row">
          <h1 className="view-header__title">{topicTitle}</h1>
          <button className="mark-as-read-btn" type="button" onClick={onMarkAsRead}>
            <CheckCircle2 aria-hidden="true" size={15} />
            Mark as read
          </button>
        </div>
      </div>
      <div className="view-body">
        <article className="theory-article">
          {isGenerating && (
            <div className="theory-generate-card">
              <span className="plan-create-spinner" aria-hidden="true" />
              <p>Generating explanation…</p>
            </div>
          )}
          {!isGenerating && genError && (
            <div className="theory-generate-card">
              <p style={{ color: 'var(--error)' }}>{genError}</p>
              <Button onClick={() => void generate()}>Retry</Button>
            </div>
          )}
          {!isGenerating && !genError && !explanation && (
            <div className="theory-generate-card">
              <p>No theory content yet.</p>
              <Button onClick={() => void generate()}>Generate Theory</Button>
            </div>
          )}
          {!isGenerating && !genError && explanation && (
            <>
              <div className="theory-md-content">
                <MarkdownContent md={explanation} />
              </div>
              <div className="theory-next">
                <div>
                  <p className="learn-kicker">Up next</p>
                  <h2>Practice with Exercises</h2>
                  <p>
                    {activeTopic?.tasks.length ?? 0} exercises · {topicTitle}
                  </p>
                </div>
                <Button onClick={() => handleNext('exercise')}>Exercise</Button>
                <button
                  className="theory-next__quiz-link"
                  type="button"
                  onClick={() => handleNext('quiz')}
                >
                  Take the quiz instead
                </button>
              </div>
            </>
          )}
        </article>
      </div>
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
      .catch(() => {})
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTopic?.id]);

  async function generateQuiz() {
    if (!activeTopic?.id || isGenerating) return;
    setIsGenerating(true);
    try {
      const newQuiz = await api.createTopicQuiz(activeTopic.id);
      setQuiz(newQuiz);
      const a = await api.startQuizAttempt(newQuiz.id);
      setAttempt(a);
    } catch {
      /* ignore */
    } finally {
      setIsGenerating(false);
    }
  }

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
      <div className="view-header">
        <p className="view-breadcrumb">
          <span>{planTitle}</span> / <span>{topicTitle}</span> /{' '}
          <span className="view-breadcrumb__current">Quiz</span>
        </p>
        <div className="view-header__title-row">
          <h1 className="view-header__title">{topicTitle} Quiz</h1>
          {quiz && (
            <span className="quiz-header__progress">
              {currentQ + 1} / {quiz.questions.length}
            </span>
          )}
        </div>
      </div>

      <div className="view-body">
        {(isLoading || isGenerating) && (
          <div className="quiz-generate-card">
            <span className="plan-create-spinner" aria-hidden="true" />
            <p>{isGenerating ? 'Generating quiz questions…' : 'Loading quiz…'}</p>
          </div>
        )}

        {!isLoading && !isGenerating && !quiz && (
          <div className="quiz-generate-card">
            <p>No quiz yet for this topic.</p>
            <Button onClick={() => void generateQuiz()}>Generate Quiz</Button>
          </div>
        )}

        {!isLoading && !isGenerating && quiz && currentQuestion && (
          <div className="quiz-question-card">
            <div className="quiz-question-meta">
              <strong>Question {currentQ + 1}</strong>
              <span>Multiple Choice</span>
            </div>
            <h2>
              <InlineMd text={currentQuestion.promptMd} />
            </h2>
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
                    <span
                      className={`quiz-choice__radio${isSelected ? ' selected' : ''}`}
                      aria-hidden="true"
                    />
                    <span>
                      <InlineMd text={choice} />
                    </span>
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
      </div>
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
      <div className="view-header">
        <p className="view-breadcrumb">
          <span>{planTitle}</span> / <span>{topicTitle}</span> /{' '}
          <span className="view-breadcrumb__current">Results</span>
        </p>
        <div className="view-header__title-row">
          <h1 className="view-header__title">Quiz Results</h1>
        </div>
      </div>

      <div className="view-body">
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
  taskId?: string | null;
  activeTopic?: TopicWithTasks | null;
  pendingAction?: GuideAction | null;
  onPendingActionConsumed?: () => void;
}

function GuidePanel({
  scopeType,
  scopeId,
  quickActions,
  contextMd,
  taskId,
  activeTopic,
  pendingAction,
  onPendingActionConsumed,
}: GuidePanelProps) {
  const [guideTab, setGuideTab] = useState<'guide' | 'progress' | 'visualize'>('guide');
  const [messages, setMessages] = useState<ReadonlyArray<{ content: string; role: string }>>([]);
  const [inputVal, setInputVal] = useState('');
  const [threadId, setThreadId] = useState<null | string>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [visualizations, setVisualizations] = useState<ReadonlyArray<Visualization> | null>(null);
  const [isLoadingViz, setIsLoadingViz] = useState(false);

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

  // Load visualizations when Visualize tab becomes active
  useEffect(() => {
    if (guideTab !== 'visualize' || !taskId) return;
    let cancelled = false;
    setIsLoadingViz(true);
    void (async () => {
      try {
        const { visualizations: viz } = await api.getTaskVisualizations(taskId);
        if (!cancelled) setVisualizations(viz);
      } catch {
        if (!cancelled) setVisualizations([]);
      } finally {
        if (!cancelled) setIsLoadingViz(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [guideTab, taskId]);

  // Fire pending action from parent (e.g. "Get a Hint" button in exercise area)
  useEffect(() => {
    if (!pendingAction) return;
    onPendingActionConsumed?.();
    void sendQuickAction(pendingAction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAction]);

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

  async function sendMessage(text: string) {
    if (!text || !scopeId || isLoading) return;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = inputVal.trim();
    if (!text) return;
    setInputVal('');
    await sendMessage(text);
  }

  return (
    <aside className="learn-guide">
      <div className="learn-guide__tabs">
        <button
          className={`learn-guide__tab${guideTab === 'guide' ? ' active' : ''}`}
          type="button"
          onClick={() => setGuideTab('guide')}
        >
          Guide
        </button>
        <button
          className={`learn-guide__tab${guideTab === 'visualize' ? ' active' : ''}`}
          type="button"
          onClick={() => setGuideTab('visualize')}
        >
          Visualize
        </button>
        <button
          className={`learn-guide__tab${guideTab === 'progress' ? ' active' : ''}`}
          type="button"
          onClick={() => setGuideTab('progress')}
        >
          Progress
        </button>
      </div>

      {guideTab === 'guide' && (
        <>
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
        </>
      )}

      {guideTab === 'visualize' && (
        <div className="learn-guide-panel">
          {!taskId && (
            <p className="learn-guide-panel__empty">
              Open a task to see and generate visualizations.
            </p>
          )}
          {taskId && isLoadingViz && (
            <div className="learn-chat-loading">
              <span className="plan-create-spinner" aria-hidden="true" />
              Loading visualizations…
            </div>
          )}
          {taskId && !isLoadingViz && visualizations?.length === 0 && (
            <div className="learn-guide-panel__empty">
              <p>No visualizations yet.</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setGuideTab('guide');
                  void sendMessage('Please generate a visualization for this task.');
                }}
              >
                Generate Visualization
              </Button>
            </div>
          )}
          {taskId && !isLoadingViz && visualizations && visualizations.length > 0 && (
            <div className="learn-guide-viz-list">
              {visualizations.map((viz) => (
                <div key={viz.id} className="learn-guide-viz-item">
                  <VisualizationRenderer visualization={viz} />
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={() => {
                  setGuideTab('guide');
                  void sendMessage('Please generate a new visualization for this task.');
                }}
              >
                Generate New
              </Button>
            </div>
          )}
        </div>
      )}

      {guideTab === 'progress' && (
        <div className="learn-guide-panel">
          {!activeTopic && <p className="learn-guide-panel__empty">No topic selected.</p>}
          {activeTopic && (
            <>
              <p className="learn-guide-panel__heading">{activeTopic.title}</p>
              <ul className="learn-guide-progress-list">
                {activeTopic.tasks.map((t) => (
                  <li
                    key={t.id}
                    className={`learn-guide-progress-item${t.status === 'done' ? ' done' : ''}`}
                  >
                    <span
                      className="learn-guide-progress-item__icon"
                      aria-label={t.status === 'done' ? 'Done' : 'Not done'}
                    >
                      {t.status === 'done' ? '✓' : '○'}
                    </span>
                    <span>{t.title}</span>
                  </li>
                ))}
              </ul>
              <p className="learn-guide-panel__sub">
                {activeTopic.tasks.filter((t) => t.status === 'done').length} /{' '}
                {activeTopic.tasks.length} tasks completed
              </p>
            </>
          )}
        </div>
      )}
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
  onMarkTaskDone,
  onNavigate,
  onNewPlan,
  onSelectTopic,
  onSelectTask,
  onNextTopic,
  onQuizComplete,
}: LearnPageViewProps) {
  // Seed from DB-persisted theoryRead flags; augment with any marked this session
  const [readTopics, setReadTopics] = useState<ReadonlySet<string>>(
    () => new Set(activePlan?.topics.filter((t) => t.theoryRead).map((t) => t.id) ?? []),
  );
  const [pendingHint, setPendingHint] = useState<GuideAction | null>(null);

  function handleMarkAsRead() {
    const topicId = activeTopic?.id;
    if (!topicId) return;
    setReadTopics((prev) => new Set([...prev, topicId]));
    api.markTheoryRead(topicId).catch(() => {});
  }

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
          readTopics={readTopics}
          onNavigate={onNavigate}
          onNewPlan={onNewPlan}
          onSelectTask={onSelectTask}
          onSelectTopic={onSelectTopic}
        />

        {view === 'theory' && (
          <TheoryMain
            activePlan={activePlan}
            activeTopic={activeTopic}
            onNavigate={onNavigate}
            onMarkAsRead={handleMarkAsRead}
          />
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
            onMarkTaskDone={onMarkTaskDone}
            onNavigate={onNavigate}
            onGetHint={() => setPendingHint('small_hint')}
          />
        )}

        <GuidePanel
          contextMd={guideContextMd}
          key={`${guideScope}-${guideScopeId ?? 'none'}`}
          quickActions={quickActions}
          scopeId={guideScopeId}
          scopeType={guideScope}
          taskId={activeTask?.id ?? null}
          activeTopic={activeTopic}
          pendingAction={pendingHint}
          onPendingActionConsumed={() => setPendingHint(null)}
        />
      </div>
    </section>
  );
}
