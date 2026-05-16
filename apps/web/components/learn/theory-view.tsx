import type { ReactNode } from 'react';

import { Button, Tabs } from '../ui/design-system';

const steps = [
  'The key is passed through a hash function',
  'The result maps to a bucket index in the array',
  'The value is stored at that bucket location',
];

export function TheoryView(): ReactNode {
  return (
    <section className="theory-view" id="theory">
      <main className="theory-main">
        <p className="learn-kicker">Data Structures / Arrays &amp; Hash Maps / Theory</p>
        <article className="theory-article">
          <h1>What is a Hash Map?</h1>
          <p>
            A hash map is a data structure that maps keys to values using a hash function. It
            provides constant-time O(1) average complexity for lookups, insertions, and deletions,
            making it one of the most efficient data structures for key-value storage.
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
                  <strong>{index + 1}</strong>
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
            When two different keys produce the same hash value, this is called a collision. Common
            resolution strategies include <mark>chaining and open addressing.</mark>
          </p>

          <div className="theory-next">
            <div>
              <p className="learn-kicker">Up next</p>
              <h2>Practice with Exercises</h2>
              <p>8 exercises · Arrays &amp; Hash Maps</p>
            </div>
            <Button>Exercise</Button>
            <a href="/learn#quiz">Take the quiz instead</a>
          </div>
        </article>
      </main>

      <aside className="theory-guide">
        <Tabs
          activeId="guide"
          items={[
            { id: 'guide', label: 'Guide' },
            { id: 'visualize', label: 'Visualize' },
            { id: 'progress', label: 'Progress' },
          ]}
        />
        <div className="theory-selected">
          <span>Selected from theory:</span>
          <strong>chaining and open addressing</strong>
        </div>
        <article className="learn-message user">
          <p>Can you explain what chaining and open addressing mean?</p>
        </article>
        <article className="learn-message assistant">
          <strong>Sherpa</strong>
          <p>
            Sure! These are two strategies for handling hash collisions: Chaining keeps a list at
            each bucket, while open addressing probes for the next empty slot in the array.
          </p>
        </article>
        <div className="learn-quick-actions">
          <button type="button">Show me an example</button>
          <button type="button">Compare both</button>
          <button type="button">Go deeper</button>
        </div>
      </aside>
    </section>
  );
}
