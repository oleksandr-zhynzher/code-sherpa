'use client';

import type { PlanSummary } from '../../lib/types';
import { Button, Logo, ProgressBar } from '../ui/design-system';

interface CoursesPageProps {
  plans: PlanSummary[];
  onSelect: (plan: PlanSummary) => void;
  onCreateNew: () => void;
}

export function CoursesPage({ plans, onSelect, onCreateNew }: CoursesPageProps) {
  return (
    <section className="courses-page" aria-label="Your learning courses">
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

      <div className="courses-body">
        <div className="courses-page-header">
          <div>
            <h1 className="courses-page-title">Your Learning Paths</h1>
            <p className="courses-page-subtitle">Select a path to continue or create a new one.</p>
          </div>
          <Button onClick={onCreateNew}>+ New Path</Button>
        </div>

        {plans.length === 0 ? (
          <div className="courses-empty">
            <p>You haven&apos;t created any learning paths yet.</p>
            <Button onClick={onCreateNew}>Create Your First Path</Button>
          </div>
        ) : (
          <div className="courses-grid">
            {plans.map((plan) => {
              const pct =
                plan.totalTasks > 0 ? Math.round((plan.doneTasks / plan.totalTasks) * 100) : 0;
              return (
                <article className="course-card" key={plan.id}>
                  <div className="course-card__body">
                    <h2 className="course-card__title">{plan.title}</h2>
                    {plan.goal && <p className="course-card__goal">{plan.goal}</p>}
                    <div className="course-card__meta-row">
                      <span className="course-card__progress-label">
                        {plan.doneTasks} of {plan.totalTasks} tasks · {pct}%
                      </span>
                    </div>
                    <ProgressBar
                      label={`${plan.title} progress`}
                      max={plan.totalTasks}
                      value={plan.doneTasks}
                    />
                  </div>
                  <div className="course-card__footer">
                    <Button onClick={() => onSelect(plan)}>
                      {plan.doneTasks > 0 ? 'Continue' : 'Start'}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
