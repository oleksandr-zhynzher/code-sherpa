'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import { api } from '../../lib/api';
import type { PlanDetail } from '../../lib/types';

type Props = {
  onCancel?: () => void;
  onPlanCreated: (plan: PlanDetail) => void;
};

const GOAL_SUGGESTIONS = [
  'Ace FAANG coding interviews',
  'Learn data structures from scratch',
  'Master dynamic programming',
  'Prepare for system design interviews',
];

type Step = 'form' | 'generating-plan' | 'generating-content';

const STEP_LABEL: Record<Step, string> = {
  form: '',
  'generating-plan': 'Building your learning plan…',
  'generating-content': 'Generating theory, quizzes & exercises for every topic…',
};

export function PlanCreate({ onCancel, onPlanCreated }: Props): ReactNode {
  const [goal, setGoal] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);

  const isGenerating = step !== 'form';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim() || isGenerating) return;
    setError(null);

    try {
      setStep('generating-plan');
      const plan = await api.createPlan(goal.trim());

      setStep('generating-content');
      await api.generateAllPlanContent(plan.id);

      const fresh = await api.showPlan(plan.id);
      onPlanCreated(fresh);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate plan. Is the AI assistant configured?',
      );
      setStep('form');
    }
  }

  return (
    <div className="plan-create-page">
      <div className="plan-create-card">
        <div className="plan-create-card__icon" aria-hidden="true">
          🗺
        </div>
        <h1 className="plan-create-card__title">Create your learning plan</h1>
        <p className="plan-create-card__desc">
          Describe your goal and the AI will build a personalised DSA curriculum — topics,
          exercises, and quizzes.
        </p>

        <form className="plan-create-form" onSubmit={handleSubmit}>
          <label className="plan-create-form__label" htmlFor="plan-goal">
            What do you want to achieve?
          </label>
          <input
            className="plan-create-form__input"
            disabled={isGenerating}
            id="plan-goal"
            maxLength={200}
            placeholder="e.g. Ace FAANG coding interviews"
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />

          <div className="plan-create-suggestions">
            {GOAL_SUGGESTIONS.map((s) => (
              <button
                className="plan-create-suggestion"
                disabled={isGenerating}
                key={s}
                type="button"
                onClick={() => setGoal(s)}
              >
                {s}
              </button>
            ))}
          </div>

          {error !== null && (
            <p className="plan-create-error" role="alert">
              {error}
            </p>
          )}

          <div className="plan-create-actions">
            {onCancel !== undefined && (
              <button
                className="plan-create-btn plan-create-btn--secondary"
                disabled={isGenerating}
                type="button"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
            <button
              className="plan-create-btn plan-create-btn--primary"
              disabled={isGenerating || goal.trim().length === 0}
              type="submit"
            >
              {isGenerating ? (
                <>
                  <span className="plan-create-spinner" aria-hidden="true" />
                  {STEP_LABEL[step]}
                </>
              ) : (
                'Generate Plan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
