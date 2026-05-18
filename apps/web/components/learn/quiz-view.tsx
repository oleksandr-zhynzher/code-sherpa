'use client';

import { useEffect, useState } from 'react';

import { api } from '../../lib/api';
import type { LearnView, PlanDetail, Quiz, QuizAttempt, Task } from '../../lib/types';
import { Button, Logo, ProgressBar, Tabs } from '../ui/design-system';

type TopicWithTasks = PlanDetail['topics'][number];

type Props = {
  activePlan?: PlanDetail | null;
  activeTopic?: TopicWithTasks | null;
  activeTask?: Task | null;
  onNavigate?: (view: LearnView) => void;
  onNewPlan?: () => void;
  onSelectTopic?: (idx: number) => void;
  onQuizComplete?: (score: number, total: number) => void;
};

const mockTopics = [
  { id: 'arrays-basics', label: 'Arrays Basics', status: 'done' },
  { id: 'linked-lists', label: 'Linked Lists', status: 'done' },
  { id: 'arrays-hash-maps', label: 'Arrays & Hash Maps', status: 'active' },
  { id: 'stacks-queues', label: 'Stacks & Queues', status: 'upcoming' },
  { id: 'trees-graphs', label: 'Trees & Graphs', status: 'upcoming' },
];

const mockChoices = [
  'O(1) — Constant time',
  'O(log n) — Logarithmic time',
  'O(n) — Linear time',
  'O(n log n) — Linearithmic time',
];

export function QuizView({
  activePlan,
  activeTopic,
  onNavigate,
  onNewPlan,
  onSelectTopic,
  onQuizComplete,
}: Props) {
  const hasRealData = activePlan !== null && activePlan !== undefined;
  const planTitle = activePlan?.title ?? 'Data Structures';
  const topicTitle = activeTopic?.title ?? 'Arrays & Hash Maps';
  const doneTasks = activePlan?.doneTasks ?? 4;
  const totalTasks = activePlan?.totalTasks ?? 10;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>(
    [],
  );
  const [inputVal, setInputVal] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    if (!activeTopic?.id) return;

    async function fetchQuiz() {
      setIsLoading(true);
      try {
        const existingQuiz = await api.getTopicQuiz(activeTopic!.id);
        if (existingQuiz) {
          setQuiz(existingQuiz);
          const newAttempt = await api.startQuizAttempt(existingQuiz.id);
          setAttempt(newAttempt);
        }
      } catch {
        /* no quiz yet — show generate button */
      } finally {
        setIsLoading(false);
      }
    }

    async function loadThread() {
      try {
        const { thread } = await api.getChatThread('topic', activeTopic!.id);
        setThreadId(thread.id);
        const { messages: msgs } = await api.getThreadMessages(thread.id);
        setMessages(
          msgs.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.contentMd })),
        );
      } catch {
        /* ignore */
      }
    }

    void fetchQuiz();
    void loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTopic?.id]);

  async function handleGenerateQuiz() {
    if (!activeTopic?.id) return;
    setIsGenerating(true);
    try {
      const newQuiz = await api.createTopicQuiz(activeTopic.id);
      setQuiz(newQuiz);
      const newAttempt = await api.startQuizAttempt(newQuiz.id);
      setAttempt(newAttempt);
      setCurrentQ(0);
      setAnswers({});
    } catch {
      /* ignore */
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSelectAnswer(questionId: string, choice: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: choice }));
    if (attempt?.id) {
      try {
        await api.saveQuizAnswer(attempt.id, questionId, choice);
      } catch {
        /* ignore */
      }
    }
  }

  async function handleSubmitQuiz() {
    if (!attempt?.id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const completedAttempt = await api.completeQuizAttempt(attempt.id);
      onQuizComplete?.(
        completedAttempt.score ?? 0,
        completedAttempt.totalQuestions ?? quiz?.questions.length ?? 0,
      );
      onNavigate?.('results');
    } catch {
      /* ignore */
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQuickAction(action: 'small_hint' | 'explain_concept' | 'break_it_down') {
    if (!threadId || isChatLoading || !quiz) return;
    const q = quiz.questions[currentQ];
    setIsChatLoading(true);
    try {
      const { userMessage, assistantMessage } = await api.postGuideAction(threadId, action, {
        topicMd: q ? `Question: ${q.promptMd}` : (activeTopic?.title ?? ''),
      });
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: userMessage.contentMd },
        { role: 'assistant', content: assistantMessage.contentMd },
      ]);
    } catch {
      /* ignore */
    } finally {
      setIsChatLoading(false);
    }
  }

  async function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = inputVal.trim();
    if (!msg || !threadId || isChatLoading) return;
    setInputVal('');
    setIsChatLoading(true);
    try {
      const { userMessage, assistantMessage } = await api.postGuideAction(
        threadId,
        'explain_concept',
        { topicMd: msg },
      );
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: userMessage.contentMd },
        { role: 'assistant', content: assistantMessage.contentMd },
      ]);
    } catch {
      /* ignore */
    } finally {
      setIsChatLoading(false);
    }
  }

  const currentQuestion = quiz?.questions[currentQ] ?? null;
  const isLastQuestion = quiz ? currentQ === quiz.questions.length - 1 : false;

  function renderQuizContent() {
    if (isLoading) {
      return (
        <div className="quiz-generate-card">
          <span className="plan-create-spinner" aria-hidden="true" />
          <p>Loading quiz…</p>
        </div>
      );
    }
    if (isGenerating) {
      return (
        <div className="quiz-generate-card">
          <span className="plan-create-spinner" aria-hidden="true" />
          <p>Generating quiz questions…</p>
        </div>
      );
    }
    if (!quiz) {
      return (
        <div className="quiz-generate-card">
          <p>No quiz yet for this topic.</p>
          <Button onClick={() => void handleGenerateQuiz()}>Generate Quiz</Button>
        </div>
      );
    }
    if (quiz.questions.length === 0) {
      return (
        <div className="quiz-generate-card">
          <p>No questions available for this quiz.</p>
        </div>
      );
    }
    if (!currentQuestion) return null;
    return (
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
            <Button onClick={() => setCurrentQ((q) => Math.min(quiz.questions.length - 1, q + 1))}>
              Next Question
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="learn-space" id="quiz" aria-label="Learning Space quiz">
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
        {/* Sidebar */}
        <aside className="learn-sidebar">
          <div className="learn-sidebar__header">
            <p className="learn-kicker">Your Paths</p>
            <Button variant="secondary" onClick={onNewPlan}>
              New
            </Button>
          </div>

          <button className="learn-continue-card warning" type="button">
            <div className="learn-continue-card__icon" aria-hidden="true">
              ▶
            </div>
            <div>
              <p className="learn-continue-card__action">Quiz in progress</p>
              <p className="learn-continue-card__topic">{topicTitle} — Quiz</p>
            </div>
          </button>

          <div className="learn-path-row active">
            <div className="learn-path-row__header">
              <strong className="learn-path-row__title">{planTitle}</strong>
              <span className="learn-path-row__meta">{activePlan?.topics.length ?? 6} topics</span>
            </div>
            <ProgressBar label={`${planTitle} quiz progress`} max={totalTasks} value={doneTasks} />
          </div>

          <div className="learn-topics-section">
            <p className="learn-topics-section__label">Topics</p>
            {hasRealData
              ? activePlan.topics.map((topic, topicIdx) => {
                  const isActive = activeTopic?.id === topic.id;
                  return (
                    <div key={topic.id}>
                      <button
                        className={`learn-topic-item${isActive ? ' active' : ''}`}
                        type="button"
                        onClick={() => onSelectTopic?.(topicIdx)}
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
                            className="learn-topic-subtopic"
                            type="button"
                            onClick={() => onNavigate?.('theory')}
                          >
                            Theory
                          </button>
                          <button
                            className="learn-topic-subtopic"
                            type="button"
                            onClick={() => onNavigate?.('exercise')}
                          >
                            Exercises
                          </button>
                          <button className="learn-topic-subtopic active" type="button">
                            Quiz
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              : mockTopics.map((topic) => (
                  <div key={topic.id}>
                    <button
                      className={`learn-topic-item${topic.status === 'active' ? ' active' : ''}`}
                      type="button"
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
                      <span className="learn-topic-item__name">{topic.label}</span>
                    </button>
                    {topic.status === 'active' && (
                      <div className="learn-topic-subtopics">
                        <button
                          className="learn-topic-subtopic"
                          type="button"
                          onClick={() => onNavigate?.('theory')}
                        >
                          Theory
                        </button>
                        <button
                          className="learn-topic-subtopic"
                          type="button"
                          onClick={() => onNavigate?.('exercise')}
                        >
                          Exercises
                        </button>
                        <button className="learn-topic-subtopic active" type="button">
                          Quiz
                        </button>
                      </div>
                    )}
                  </div>
                ))}
          </div>
        </aside>

        {/* Main area */}
        <main className="learn-main">
          {!hasRealData ? (
            <>
              <div className="quiz-header">
                <p className="quiz-header__breadcrumb">
                  {planTitle} / {topicTitle} / Quiz
                </p>
                <div className="quiz-header__title-row">
                  <h1>{topicTitle} Quiz</h1>
                  <time className="quiz-header__timer" dateTime="PT12M34S">
                    12:34
                  </time>
                </div>
                <p className="quiz-header__progress">4 / 10</p>
              </div>

              <div className="quiz-question-card">
                <div className="quiz-question-meta">
                  <strong>Question 4</strong>
                  <span>Multiple Choice</span>
                </div>
                <h2>What is the average time complexity of a hash map lookup operation?</h2>

                <div className="quiz-choice-list" role="radiogroup" aria-label="Answer choices">
                  {mockChoices.map((choice) => (
                    <button
                      aria-checked={choice.startsWith('O(1)')}
                      className={choice.startsWith('O(1)') ? 'selected' : undefined}
                      key={choice}
                      role="radio"
                      tabIndex={choice.startsWith('O(1)') ? 0 : -1}
                      type="button"
                    >
                      {choice}
                    </button>
                  ))}
                </div>

                <div className="quiz-controls">
                  <Button variant="secondary">Previous</Button>
                  <Button>Next Question</Button>
                </div>
              </div>
            </>
          ) : (
            <>
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

              {renderQuizContent()}
            </>
          )}
        </main>

        {/* Right panel */}
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
            {!hasRealData ? (
              <>
                <div className="learn-hint-card">
                  <strong>Hint available</strong>
                  <p>
                    Think about how hash functions distribute keys across buckets. What happens in
                    the ideal case?
                  </p>
                </div>
                <article className="learn-message assistant">
                  <p className="learn-message__label">Sherpa</p>
                  <p>
                    Consider what makes hash maps fast — the hash function computes an index
                    directly. How many steps does that take on average?
                  </p>
                </article>
              </>
            ) : (
              <>
                {messages.map((m, i) => (
                  <article key={i} className={`learn-message ${m.role}`}>
                    {m.role === 'assistant' && <p className="learn-message__label">Sherpa</p>}
                    <p>{m.content}</p>
                  </article>
                ))}
                {isChatLoading && (
                  <div className="learn-chat-loading">
                    <span className="plan-create-spinner" aria-hidden="true" />
                    Thinking…
                  </div>
                )}
              </>
            )}
          </div>
          <div className="learn-quick-actions">
            <button type="button" onClick={() => void handleQuickAction('small_hint')}>
              Small hint
            </button>
            <button type="button" onClick={() => void handleQuickAction('explain_concept')}>
              Explain topic
            </button>
            <button type="button" onClick={() => void handleQuickAction('break_it_down')}>
              Break it down
            </button>
          </div>
          <form className="learn-chat-input-bar" onSubmit={(e) => void handleChatSubmit(e)}>
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
      </div>
    </section>
  );
}
