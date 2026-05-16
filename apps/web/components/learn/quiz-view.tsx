import type { ReactNode } from 'react';

import { Button, Logo, ProgressBar, Tabs } from '../ui/design-system';

const topics = [
  'Arrays Basics',
  'Linked Lists',
  'Arrays & Hash Maps',
  'Stacks & Queues',
  'Trees & Graphs',
];

const choices = [
  'O(1) — Constant time',
  'O(log n) — Logarithmic time',
  'O(n) — Linear time',
  'O(n log n) — Linearithmic time',
];

export function QuizView(): ReactNode {
  return (
    <section className="learn-space quiz-frame" id="quiz" aria-label="Learning Space quiz">
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
              <h2>Quiz in progress</h2>
            </div>
            <Button variant="secondary">New</Button>
          </div>

          <article className="learn-continue-card">
            <span>Arrays &amp; Hash Maps — Q4 of 10</span>
            <strong>Data Structures</strong>
            <ProgressBar label="Data Structures quiz progress" max={10} value={4} />
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
            <a aria-current="page" href="/learn#quiz">
              Quiz
            </a>
          </nav>
        </aside>

        <main className="learn-main">
          <header className="quiz-header">
            <p className="learn-kicker">Data Structures / Arrays &amp; Hash Maps / Quiz</p>
            <div>
              <h1>Arrays &amp; Hash Maps Quiz</h1>
              <time dateTime="PT12M34S">12:34</time>
            </div>
            <span>4 / 10</span>
          </header>

          <article className="quiz-card">
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
          <div className="quiz-hint">
            <strong>Hint available</strong>
            <p>
              Think about how hash functions distribute keys across buckets. What happens in the
              ideal case?
            </p>
          </div>
          <article className="learn-message assistant">
            <strong>Sherpa</strong>
            <p>
              Consider what makes hash maps fast — the hash function computes an index directly. How
              many steps does that take on average?
            </p>
          </article>
          <div className="learn-quick-actions">
            <button type="button">Small hint</button>
            <button type="button">Explain topic</button>
            <button type="button">Break it down</button>
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
