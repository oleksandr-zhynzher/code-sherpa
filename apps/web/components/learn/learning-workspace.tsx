import type { ReactNode } from 'react';

import { Button, Logo, Pill, ProgressBar, Tabs } from '../ui/design-system';

const topics = [
  'Arrays Basics',
  'Linked Lists',
  'Arrays & Hash Maps',
  'Stacks & Queues',
  'Trees & Graphs',
  'Sorting Algorithms',
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

export function LearningWorkspace(): ReactNode {
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
              <h2>Continue where you left off</h2>
            </div>
            <Button variant="secondary">New</Button>
          </div>

          <article className="learn-continue-card">
            <span>Arrays &amp; Hash Maps — Exercise 3</span>
            <strong>Data Structures Fundamentals</strong>
            <ProgressBar label="Data Structures Fundamentals progress" max={12} value={5} />
            <small>5 of 12 camps · Last: 2 days ago</small>
          </article>

          <div className="learn-path-card active">
            <strong>Data Structures Fundamentals</strong>
            <span>5 of 12 camps</span>
          </div>
          <div className="learn-path-card">
            <strong>Algorithm Patterns</strong>
            <span>1 of 8 camps · Last: 1 week ago</span>
          </div>

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
        </aside>

        <main className="learn-main">
          <header className="learn-exercise-header">
            <p>Data Structures / Arrays &amp; Hash Maps / Exercise 3</p>
            <div>
              <h1>Two Sum</h1>
              <Pill tone="warning">Medium</Pill>
            </div>
          </header>

          <section className="learn-exercise-body">
            <div>
              <h2>Exercise</h2>
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

            <div className="learn-editor-label">
              <h2>Your Solution</h2>
              <span>solution.py</span>
            </div>
            <pre className="learn-code" aria-label="Your Solution">
              {codeLines.map((line, index) => `${index + 1}  ${line}`).join('\n')}
            </pre>

            <div className="learn-action-bar">
              <Button>Check My Answer</Button>
              <Button variant="secondary">Save Progress</Button>
              <Button variant="ghost">Get a Hint</Button>
            </div>

            <section className="learn-result" role="status">
              <strong>All tests passed!</strong>
              <p>3 of 3 test cases passed — your solution handles all edge cases correctly.</p>
            </section>

            <section className="learn-next">
              <div>
                <p className="learn-kicker">Up next</p>
                <h2>Take the Quiz</h2>
                <p>10 questions · Test your understanding</p>
              </div>
              <a href="/learn#quiz">Review theory</a>
            </section>
          </section>
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
          <div className="learn-chat">
            <article className="learn-message assistant">
              <strong>Sherpa</strong>
              <p>
                Great approach using a hash map! You&apos;re storing each number&apos;s index as you
                iterate — that gives you O(n) time complexity.
              </p>
            </article>
            <article className="learn-message user">
              <p>Why do I check &apos;if diff in seen&apos; before adding the current number?</p>
            </article>
            <article className="learn-message assistant">
              <strong>Sherpa</strong>
              <p>
                Good question! If you added the number first, you might match a number with itself.
                By checking before storing, you compare with a different earlier element.
              </p>
            </article>
            <div className="learn-quick-actions">
              <button type="button">Small hint</button>
              <button type="button">Explain error</button>
              <button type="button">Break it down</button>
            </div>
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
