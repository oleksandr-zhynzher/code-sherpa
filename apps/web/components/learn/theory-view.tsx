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

const steps = [
  'The key is passed through a hash function',
  'The result maps to a bucket index in the array',
  'The value is stored at that bucket location',
];

export function TheoryView({
  activePlan,
  activeTopic,
  onNavigate,
  onNewPlan,
  onSelectTopic,
}: Props): ReactNode {
  const hasRealData = activePlan !== null && activePlan !== undefined;
  const planTitle = activePlan?.title ?? 'Data Structures Fundamentals';
  const topicTitle = activeTopic?.title ?? 'Arrays & Hash Maps';
  const doneTasks = activePlan?.doneTasks ?? 5;
  const totalTasks = activePlan?.totalTasks ?? 12;

  return (
    <section className="learn-space" id="theory" aria-label="Learning Space theory">
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

          <button
            className="learn-continue-card"
            type="button"
            onClick={() => onNavigate?.('exercise')}
          >
            <div className="learn-continue-card__icon" aria-hidden="true">
              ▶
            </div>
            <div>
              <p className="learn-continue-card__action">Continue where you left off</p>
              <p className="learn-continue-card__topic">{topicTitle}</p>
            </div>
          </button>

          {hasRealData ? (
            <div className="learn-path-row active">
              <div className="learn-path-row__header">
                <strong className="learn-path-row__title">{planTitle}</strong>
                <span className="learn-path-row__meta">
                  {doneTasks} of {totalTasks} tasks
                </span>
              </div>
              <ProgressBar label={`${planTitle} progress`} max={totalTasks} value={doneTasks} />
            </div>
          ) : (
            <div className="learn-path-row active">
              <div className="learn-path-row__header">
                <strong className="learn-path-row__title">Data Structures Fundamentals</strong>
                <span className="learn-path-row__meta">5 of 12 camps</span>
              </div>
              <ProgressBar label="Data Structures Fundamentals progress" max={12} value={5} />
            </div>
          )}

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
                          <button className="learn-topic-subtopic active" type="button">
                            Theory
                          </button>
                          <button
                            className="learn-topic-subtopic"
                            type="button"
                            onClick={() => onNavigate?.('exercise')}
                          >
                            Exercises
                          </button>
                          <button
                            className="learn-topic-subtopic"
                            type="button"
                            onClick={() => onNavigate?.('quiz')}
                          >
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
                        <button className="learn-topic-subtopic active" type="button">
                          Theory
                        </button>
                        <button
                          className="learn-topic-subtopic"
                          type="button"
                          onClick={() => onNavigate?.('exercise')}
                        >
                          Exercises
                        </button>
                        <button
                          className="learn-topic-subtopic"
                          type="button"
                          onClick={() => onNavigate?.('quiz')}
                        >
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
          <p className="learn-exercise-header__breadcrumb">
            {planTitle} / {topicTitle} / Theory
          </p>

          {hasRealData && activeTopic?.explanationMd ? (
            <article className="theory-article">
              <h1>{activeTopic.title}</h1>
              <div className="theory-md-content">
                {activeTopic.explanationMd.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <div className="theory-next">
                <div>
                  <p className="learn-kicker">Up next</p>
                  <h2>Practice with Exercises</h2>
                  <p>
                    {activeTopic.tasks.length} exercises · {activeTopic.title}
                  </p>
                </div>
                <Button onClick={() => onNavigate?.('exercise')}>Exercise</Button>
                <button
                  className="theory-next__quiz-link"
                  type="button"
                  onClick={() => onNavigate?.('quiz')}
                >
                  Take the quiz instead
                </button>
              </div>
            </article>
          ) : (
            <article className="theory-article">
              <h1>What is a Hash Map?</h1>
              <p>
                A hash map is a data structure that maps keys to values using a hash function. It
                provides constant-time O(1) average complexity for lookups, insertions, and
                deletions, making it one of the most efficient data structures for key-value
                storage.
              </p>

              <aside className="theory-key-concept">
                <p className="learn-kicker">KEY CONCEPT</p>
                <strong>
                  A hash function converts a key into an array index. Good hash functions distribute
                  keys uniformly to minimize collisions.
                </strong>
              </aside>

              <section>
                <h2>How It Works</h2>
                <div className="theory-steps">
                  {steps.map((step, index) => (
                    <div className="theory-step" key={step}>
                      <strong className="theory-step__num">{index + 1}</strong>
                      <p>{step}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2>Example: Python Dictionary</h2>
                <pre className="learn-code">
                  {[
                    'scores = {}',
                    "scores['alice'] = 95",
                    "scores['bob'] = 87",
                    "print(scores['alice'])  # 95",
                  ].join('\n')}
                </pre>
              </section>

              <section>
                <h2>Time Complexity</h2>
                <div className="theory-complexity">
                  <span>Lookup</span>
                  <strong>O(1) average</strong>
                  <span>Insert</span>
                  <strong>O(1) average</strong>
                  <span>Delete</span>
                  <strong>O(1) average</strong>
                </div>
              </section>

              <p>
                When two different keys produce the same hash value, this is called a collision.
                Common resolution strategies include <mark>chaining and open addressing.</mark>
              </p>

              <div className="theory-next">
                <div>
                  <p className="learn-kicker">Up next</p>
                  <h2>Practice with Exercises</h2>
                  <p>8 exercises · Arrays &amp; Hash Maps</p>
                </div>
                <Button onClick={() => onNavigate?.('exercise')}>Exercise</Button>
                <button
                  className="theory-next__quiz-link"
                  type="button"
                  onClick={() => onNavigate?.('quiz')}
                >
                  Take the quiz instead
                </button>
              </div>
            </article>
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
            <div className="theory-selected">
              <span>Selected from theory:</span>
              <strong>chaining and open addressing</strong>
            </div>
            <article className="learn-message user">
              <p>Can you explain what chaining and open addressing mean?</p>
            </article>
            <article className="learn-message assistant">
              <p className="learn-message__label">Sherpa</p>
              <p>
                Sure! These are two strategies for handling hash collisions: Chaining keeps a list
                at each bucket, while open addressing probes for the next empty slot in the array.
              </p>
            </article>
          </div>
          <div className="learn-quick-actions">
            <button type="button">Show me an example</button>
            <button type="button">Compare both</button>
            <button type="button">Go deeper</button>
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
