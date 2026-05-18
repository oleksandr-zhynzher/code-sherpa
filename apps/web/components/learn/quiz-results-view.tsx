import type { ReactNode } from 'react';

import type { LearnView } from '../../lib/types';
import { Button, Logo, Pill, ProgressBar, Tabs } from '../ui/design-system';

const topics = [
  { id: 'arrays-basics', label: 'Arrays Basics', status: 'done' },
  { id: 'linked-lists', label: 'Linked Lists', status: 'done' },
  { id: 'arrays-hash-maps', label: 'Arrays & Hash Maps', status: 'active' },
  { id: 'stacks-queues', label: 'Stacks & Queues', status: 'upcoming' },
  { id: 'trees-graphs', label: 'Trees & Graphs', status: 'upcoming' },
];

const performance = [
  { correct: '4 / 5 correct', label: 'Array Basics', value: 4 },
  { correct: '3 / 5 correct', label: 'Hash Map Operations', value: 3 },
];

type Props = { onNavigate?: (view: LearnView) => void };

export function QuizResultsView({ onNavigate }: Props): ReactNode {
  return (
    <section className="learn-space" id="quiz-results" aria-label="Learning Space quiz results">
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
            <Button variant="secondary">New</Button>
          </div>

          <button className="learn-continue-card success" type="button">
            <div className="learn-continue-card__icon" aria-hidden="true">
              ✓
            </div>
            <div>
              <p className="learn-continue-card__action">Quiz completed!</p>
              <p className="learn-continue-card__topic">You scored 7 out of 10</p>
            </div>
          </button>

          <div className="learn-path-row active">
            <div className="learn-path-row__header">
              <strong className="learn-path-row__title">Data Structures</strong>
              <span className="learn-path-row__meta">6 topics</span>
            </div>
            <ProgressBar label="Data Structures quiz score" max={10} value={7} />
          </div>

          <div className="learn-topics-section">
            <p className="learn-topics-section__label">Topics</p>
            {topics.map((topic) => (
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
                      onClick={() => onNavigate?.('theory')}
                      type="button"
                    >
                      Theory
                    </button>
                    <button
                      className="learn-topic-subtopic"
                      onClick={() => onNavigate?.('exercise')}
                      type="button"
                    >
                      Exercises
                    </button>
                    <button className="learn-topic-subtopic active" type="button">
                      Quiz — 7/10
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
              Data Structures / Arrays &amp; Hash Maps / Quiz Results
            </p>
            <div className="quiz-header__title-row">
              <h1>Quiz Complete</h1>
              <Pill tone="success">Completed</Pill>
            </div>
          </div>

          <div className="quiz-score-card">
            <div className="quiz-score-card__score">7 / 10</div>
            <p className="quiz-score-card__msg">
              Good progress! You&apos;re building solid foundations.
            </p>

            <div className="quiz-stats">
              <div className="quiz-stats__item">
                <strong>7</strong>
                <span>Correct</span>
              </div>
              <div className="quiz-stats__item">
                <strong>3</strong>
                <span>Incorrect</span>
              </div>
              <div className="quiz-stats__item">
                <strong>18:26</strong>
                <span>Time taken</span>
              </div>
            </div>

            <section className="quiz-performance">
              <h2>Topic Performance</h2>
              {performance.map((item) => (
                <div className="quiz-performance-row" key={item.label}>
                  <div className="quiz-performance-row__header">
                    <strong>{item.label}</strong>
                    <span>{item.correct}</span>
                  </div>
                  <ProgressBar label={`${item.label} performance`} max={5} value={item.value} />
                </div>
              ))}
            </section>

            <div className="quiz-controls">
              <Button variant="secondary">Review Answers</Button>
              <Button variant="ghost">Retry Quiz</Button>
              <Button onClick={() => onNavigate?.('exercise')}>Continue to Next Topic</Button>
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
            <article className="learn-message assistant">
              <p className="learn-message__label">Sherpa</p>
              <p>
                Great job completing the quiz! You scored 70% — that&apos;s a solid result for this
                topic.
              </p>
              <p>
                Your array skills are strong. I&apos;d suggest spending more time on hash map
                collision handling before moving on.
              </p>
            </article>
          </div>
          <div className="learn-quick-actions">
            <button type="button">Review weak areas</button>
            <button type="button">Retry quiz</button>
            <button type="button">Next topic</button>
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
