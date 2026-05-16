import type { ReactNode } from 'react';

import { Button, Logo, Pill, ProgressBar, Tabs } from '../ui/design-system';

const topics = [
  'Arrays Basics',
  'Linked Lists',
  'Arrays & Hash Maps',
  'Stacks & Queues',
  'Trees & Graphs',
];

const performance = [
  { correct: '4 / 5 correct', label: 'Array Basics', value: 4 },
  { correct: '3 / 5 correct', label: 'Hash Map Operations', value: 3 },
];

export function QuizResultsView(): ReactNode {
  return (
    <section
      className="learn-space quiz-frame"
      id="quiz-results"
      aria-label="Learning Space quiz results"
    >
      <header className="learn-topbar">
        <Logo />
        <nav aria-label="Learning navigation">
          <a href="/">Home</a>
          <a href="/setup">Setup</a>
          <a aria-current="page" href="/learn">
            Learning Space
          </a>
        </nav>
        <div className="learn-topbar__status">
          <span aria-hidden="true" />
          <strong>All systems ready</strong>
          <div aria-label="User initials" className="learn-avatar">
            OZ
          </div>
        </div>
      </header>

      <div className="learn-layout">
        <aside className="learn-sidebar">
          <div className="learn-sidebar__header">
            <div>
              <p className="learn-kicker">Your Paths</p>
              <h2>Quiz completed!</h2>
            </div>
            <Button variant="secondary">New</Button>
          </div>

          <article className="learn-continue-card">
            <span>You scored 7 out of 10</span>
            <strong>Data Structures</strong>
            <ProgressBar label="Data Structures quiz score" max={10} value={7} />
            <small>6 topics · 40% complete</small>
          </article>

          <div className="learn-topic-list">
            <p className="learn-kicker">Topics</p>
            {topics.map((topic) => (
              <button
                className={topic === 'Arrays & Hash Maps' ? 'active' : undefined}
                key={topic}
                type="button"
              >
                {topic}
              </button>
            ))}
          </div>

          <nav className="quiz-subnav" aria-label="Arrays and Hash Maps views">
            <a href="/learn#theory">Theory</a>
            <a href="/learn">Exercises</a>
            <a aria-current="page" href="/learn#quiz-results">
              Quiz — 7/10
            </a>
          </nav>
        </aside>

        <main className="learn-main">
          <header className="quiz-header">
            <p className="learn-kicker">Data Structures / Arrays &amp; Hash Maps / Quiz Results</p>
            <div>
              <h1>Quiz Complete</h1>
              <Pill tone="success">Completed</Pill>
            </div>
          </header>

          <article className="quiz-card quiz-results-card">
            <div className="quiz-score">
              <strong>7 / 10</strong>
              <p>Good progress! You&apos;re building solid foundations.</p>
            </div>

            <div className="quiz-stats">
              <div>
                <strong>7</strong>
                <span>Correct</span>
              </div>
              <div>
                <strong>3</strong>
                <span>Incorrect</span>
              </div>
              <div>
                <strong>18:26</strong>
                <span>Time taken</span>
              </div>
            </div>

            <section className="quiz-performance">
              <h2>Topic Performance</h2>
              {performance.map((item) => (
                <div className="quiz-performance-row" key={item.label}>
                  <div>
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
              <Button>Continue to Next Topic</Button>
            </div>
          </article>
        </main>

        <aside className="learn-guide">
          <Tabs
            activeId="guide"
            items={[
              { id: 'guide', label: 'Guide' },
              { id: 'visualize', label: 'Visualize' },
              { id: 'progress', label: 'Progress' },
            ]}
          />
          <article className="learn-message assistant">
            <strong>Sherpa</strong>
            <p>
              Great job completing the quiz! You scored 70% — that&apos;s a solid result for this
              topic.
            </p>
            <p>
              Your array skills are strong — you nailed those questions. I&apos;d suggest spending a
              bit more time on hash map collision handling and time complexity before moving on.
            </p>
            <p>
              Like reaching a camp on the trail — take a moment, review the map, then decide your
              next move. Ready when you are!
            </p>
          </article>
          <div className="learn-quick-actions">
            <button type="button">Review weak areas</button>
            <button type="button">Retry quiz</button>
            <button type="button">Next topic</button>
          </div>
          <label className="learn-chat-input">
            <span>Ask your Sherpa anything...</span>
            <textarea rows={3} />
          </label>
        </aside>
      </div>
    </section>
  );
}
