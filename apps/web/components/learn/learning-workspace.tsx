import type { ReactNode } from 'react';

import type { LearnView } from '../../lib/types';
import { Button, Logo, Pill, ProgressBar, Tabs } from '../ui/design-system';

const topics = [
  { id: 'arrays-basics', label: 'Arrays Basics', status: 'done' },
  { id: 'linked-lists', label: 'Linked Lists', status: 'done' },
  { id: 'arrays-hash-maps', label: 'Arrays & Hash Maps', status: 'active' },
  { id: 'stacks-queues', label: 'Stacks & Queues', status: 'upcoming' },
  { id: 'trees-graphs', label: 'Trees & Graphs', status: 'upcoming' },
  { id: 'sorting', label: 'Sorting Algorithms', status: 'upcoming' },
];

const codeLines = [
  'def two_sum(nums, target):',
  '    seen = {}',
  '    for i, num in enumerate(nums):',
  '        diff = target - num',
  '        if diff in seen:',
  '            return [seen[diff], i]',
  '        seen[num] = i',
];

type Props = { onNavigate?: (view: LearnView) => void };

export function LearningWorkspace({ onNavigate }: Props): ReactNode {
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
        {/* Sidebar */}
        <aside className="learn-sidebar">
          <div className="learn-sidebar__header">
            <p className="learn-kicker">Your Paths</p>
            <Button variant="secondary">New</Button>
          </div>

          <button
            className="learn-continue-card"
            onClick={() => onNavigate?.('exercise')}
            type="button"
          >
            <div className="learn-continue-card__icon" aria-hidden="true">
              ▶
            </div>
            <div>
              <p className="learn-continue-card__action">Continue where you left off</p>
              <p className="learn-continue-card__topic">Arrays &amp; Hash Maps</p>
            </div>
          </button>

          <div className="learn-path-row active">
            <div className="learn-path-row__header">
              <strong className="learn-path-row__title">Data Structures Fundamentals</strong>
              <span className="learn-path-row__meta">5 of 12 camps</span>
            </div>
            <ProgressBar label="Data Structures Fundamentals progress" max={12} value={5} />
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
                    <button className="learn-topic-subtopic active" type="button">
                      Exercises
                    </button>
                    <button
                      className="learn-topic-subtopic"
                      onClick={() => onNavigate?.('quiz')}
                      type="button"
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
          <div className="learn-exercise-header">
            <p className="learn-exercise-header__breadcrumb">
              Data Structures / Arrays &amp; Hash Maps / Exercise 3
            </p>
            <div className="learn-exercise-header__title-row">
              <h1 className="learn-exercise-header__title">Two Sum</h1>
              <Pill tone="warning">Medium</Pill>
            </div>
          </div>

          <div className="learn-exercise-desc">
            <p>
              Given an array of integers and a target sum, return the indices of two numbers that
              add up to the target.
            </p>
            <div className="learn-example">
              <strong>Example</strong>
              <p>Input: nums = [2, 7, 11, 15], target = 9</p>
              <p>Output: [0, 1] (because 2 + 7 = 9)</p>
            </div>
          </div>

          <div className="learn-editor-header">
            <h2>Your Solution</h2>
            <span className="learn-editor-lang">Python</span>
          </div>

          <div className="learn-code-editor">
            <div className="learn-code-editor__label">
              <span>solution.py</span>
            </div>
            <pre aria-label="Your Solution">
              {codeLines.map((line, i) => (
                <span className="learn-code-line" key={i}>
                  <span className="learn-code-line-num">{i + 1}</span>
                  {line}
                  {'\n'}
                </span>
              ))}
            </pre>
          </div>

          <div className="learn-action-bar">
            <Button>Check My Answer</Button>
            <Button variant="secondary">Save Progress</Button>
            <Button variant="ghost">Get a Hint</Button>
          </div>

          <section className="learn-result" role="status">
            <strong>All tests passed!</strong>
            <p>3 of 3 test cases passed — your solution handles all edge cases correctly.</p>
          </section>

          <div className="learn-next">
            <div>
              <p className="learn-kicker">Up next</p>
              <h2>Take the Quiz</h2>
              <p>10 questions · Test your understanding</p>
            </div>
            <Button onClick={() => onNavigate?.('quiz')}>Take Quiz</Button>
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
                Great approach using a hash map! You&apos;re storing each number&apos;s index as you
                iterate — that gives you O(n) time complexity.
              </p>
            </article>
            <article className="learn-message user">
              <p>Why do I check &apos;if diff in seen&apos; before adding the current number?</p>
            </article>
            <article className="learn-message assistant">
              <p className="learn-message__label">Sherpa</p>
              <p>
                Good question! If you added the number first, you might match a number with itself.
                By checking before storing, you compare with a different earlier element.
              </p>
            </article>
          </div>
          <div className="learn-quick-actions">
            <button type="button">Small hint</button>
            <button type="button">Explain error</button>
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
