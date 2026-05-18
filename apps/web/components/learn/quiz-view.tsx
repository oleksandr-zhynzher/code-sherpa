import type { ReactNode } from 'react';

import type { LearnView, PlanDetail, Task } from '../../lib/types';
import { Button, Logo, ProgressBar, Tabs } from '../ui/design-system';

type TopicWithTasks = PlanDetail['topics'][number];

type Props = {
  activePlan?: PlanDetail | null;
  activeTopic?: TopicWithTasks | null;
  activeTask?: Task | null;
  onNavigate?: (view: LearnView) => void;
  onNewPlan?: () => void;
  onSelectTopic?: (idx: number) => void;
};

const mockTopics = [
  { id: 'arrays-basics', label: 'Arrays Basics', status: 'done' },
  { id: 'linked-lists', label: 'Linked Lists', status: 'done' },
  { id: 'arrays-hash-maps', label: 'Arrays & Hash Maps', status: 'active' },
  { id: 'stacks-queues', label: 'Stacks & Queues', status: 'upcoming' },
  { id: 'trees-graphs', label: 'Trees & Graphs', status: 'upcoming' },
];

const choices = [
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
}: Props): ReactNode {
  const hasRealData = activePlan !== null && activePlan !== undefined;
  const planTitle = activePlan?.title ?? 'Data Structures';
  const topicTitle = activeTopic?.title ?? 'Arrays & Hash Maps';
  const doneTasks = activePlan?.doneTasks ?? 4;
  const totalTasks = activePlan?.totalTasks ?? 10;
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
              {choices.map((choice) => (
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
            <div className="learn-hint-card">
              <strong>Hint available</strong>
              <p>
                Think about how hash functions distribute keys across buckets. What happens in the
                ideal case?
              </p>
            </div>
            <article className="learn-message assistant">
              <p className="learn-message__label">Sherpa</p>
              <p>
                Consider what makes hash maps fast — the hash function computes an index directly.
                How many steps does that take on average?
              </p>
            </article>
          </div>
          <div className="learn-quick-actions">
            <button type="button">Small hint</button>
            <button type="button">Explain topic</button>
            <button type="button">Break it down</button>
          </div>
          <div className="learn-chat-input-bar">
            <input
              aria-label="Ask your Sherpa anything"
              placeholder="Ask your Sherpa anything..."
              type="text"
            />
            <button aria-label="Send message" className="learn-chat-input-bar__send" type="button">
              →
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
