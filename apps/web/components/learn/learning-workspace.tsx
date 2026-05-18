import type { ReactNode } from 'react';

import type { LearnView, PlanDetail, Task } from '../../lib/types';
import { Button, Logo, Pill, ProgressBar, Tabs } from '../ui/design-system';

type TopicWithTasks = PlanDetail['topics'][number];

type Props = {
  activePlan?: PlanDetail | null;
  activeTopic?: TopicWithTasks | null;
  activeTask?: Task | null;
  onNavigate?: (view: LearnView) => void;
  onNewPlan?: () => void;
  onSelectTask?: (taskIdx: number) => void;
  onSelectTopic?: (topicIdx: number) => void;
};

// ─── Mock fallback data (used when no real plan is loaded) ───────────────────

const mockTopics = [
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function difficultyTone(d: string): 'success' | 'warning' | 'danger' {
  if (d === 'easy') return 'success';
  if (d === 'hard') return 'danger';
  return 'warning';
}

export function LearningWorkspace({
  activePlan,
  activeTopic,
  activeTask,
  onNavigate,
  onNewPlan,
  onSelectTask,
  onSelectTopic,
}: Props): ReactNode {
  const hasRealData = activePlan !== null && activePlan !== undefined;

  const doneTasks = activePlan?.doneTasks ?? 5;
  const totalTasks = activePlan?.totalTasks ?? 12;
  const planTitle = activePlan?.title ?? 'Data Structures Fundamentals';

  const topicTitle = activeTopic?.title ?? 'Arrays & Hash Maps';
  const taskTitle = activeTask?.title ?? 'Two Sum';
  const taskDifficulty = activeTask?.difficulty ?? 'medium';
  const taskPrompt =
    activeTask?.promptMd ??
    'Given an array of integers and a target sum, return the indices of two numbers that add up to the target.\n\n**Example**\n\nInput: nums = [2, 7, 11, 15], target = 9\n\nOutput: [0, 1] (because 2 + 7 = 9)';

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
                          <button
                            className="learn-topic-subtopic"
                            type="button"
                            onClick={() => onNavigate?.('theory')}
                          >
                            Theory
                          </button>
                          <button className="learn-topic-subtopic active" type="button">
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
                      {isActive && topic.tasks.length > 1 && (
                        <div className="learn-topic-subtopics">
                          {topic.tasks.map((task, taskIdx) => (
                            <button
                              className={`learn-topic-subtopic${activeTask?.id === task.id ? ' active' : ''}`}
                              key={task.id}
                              type="button"
                              onClick={() => onSelectTask?.(taskIdx)}
                            >
                              {task.title}
                            </button>
                          ))}
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
                        <button className="learn-topic-subtopic active" type="button">
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
          <div className="learn-exercise-header">
            <p className="learn-exercise-header__breadcrumb">
              {planTitle} / {topicTitle} / {taskTitle}
            </p>
            <div className="learn-exercise-header__title-row">
              <h1 className="learn-exercise-header__title">{taskTitle}</h1>
              <Pill tone={difficultyTone(taskDifficulty)}>
                {taskDifficulty.charAt(0).toUpperCase() + taskDifficulty.slice(1)}
              </Pill>
            </div>
          </div>

          <div className="learn-exercise-desc">
            {taskPrompt.split('\n\n').map((para, i) => {
              if (para.startsWith('**') && para.endsWith('**')) {
                return (
                  <div className="learn-example" key={i}>
                    <strong>{para.replaceAll('**', '')}</strong>
                  </div>
                );
              }
              return <p key={i}>{para.replaceAll('**', '')}</p>;
            })}
          </div>

          <div className="learn-editor-header">
            <h2>Your Solution</h2>
            <span className="learn-editor-lang">{activeTask?.language ?? 'Python'}</span>
          </div>

          <div className="learn-code-editor">
            <div className="learn-code-editor__label">
              <span>solution.{activeTask?.language === 'typescript' ? 'ts' : 'py'}</span>
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
