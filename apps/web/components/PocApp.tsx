'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '../lib/api';
import { formatProgress, statusLabel } from '../lib/format';
import type {
  ChatMessage,
  PlanDetail,
  PlanSummary,
  RunResult,
  SetupState,
  Task,
  TaskFiles,
  Visualization,
} from '../lib/types';

const defaultGoal =
  'I have 3 weeks before interviews. I struggle with graphs and dynamic programming. 45 min/day.';
const defaultWorkspacePath = './workspace';
const defaultSetupState: SetupState = {
  agentDriver: 'copilot',
  autoSaveProgress: true,
  claudePath: null,
  copilotPath: null,
  exerciseLanguage: 'python',
  guideTone: 'encouraging',
  repoUrl: null,
  safeRunChecks: true,
  workspacePath: defaultWorkspacePath,
};

function findTask(plan: PlanDetail | null, taskId: string | null): Task | null {
  if (plan === null || taskId === null) {
    return null;
  }

  return plan.topics.flatMap((topic) => topic.tasks).find((task) => task.id === taskId) ?? null;
}

export function PocApp() {
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [plans, setPlans] = useState<ReadonlyArray<PlanSummary>>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanDetail | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [files, setFiles] = useState<TaskFiles | null>(null);
  const [goal, setGoal] = useState(defaultGoal);
  const [solutionDraft, setSolutionDraft] = useState('');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [chatInput, setChatInput] = useState('visualize BFS expansion');
  const [chat, setChat] = useState<ReadonlyArray<ChatMessage>>([]);
  const [visualization, setVisualization] = useState<Visualization | null>(null);
  const [status, setStatus] = useState('Loading POC workspace...');
  const [error, setError] = useState<string | null>(null);

  const selectedTask = useMemo(
    () => findTask(selectedPlan, selectedTaskId),
    [selectedPlan, selectedTaskId],
  );

  const refreshPlans = useCallback(async () => {
    const response = await api.listPlans();
    setPlans(response.data);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const setupState = await api.getSetup();
        setSetup(setupState);
        await refreshPlans();
        setStatus('Ready');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load POC');
      }
    };

    void load();
  }, [refreshPlans]);

  const mutate = useCallback(async (label: string, action: () => Promise<void>) => {
    setError(null);
    setStatus(label);
    try {
      await action();
      setStatus('Ready');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Action failed');
      setStatus('Needs attention');
    }
  }, []);

  const saveSetup = () =>
    mutate('Saving setup...', async () => {
      const setupState = await api.saveSetup({
        ...(setup ?? defaultSetupState),
        workspacePath: setup?.workspacePath ?? defaultWorkspacePath,
      });
      setSetup(setupState);
    });

  const createPlan = () =>
    mutate('Generating plan...', async () => {
      const plan = await api.createPlan(goal);
      setSelectedPlan(plan);
      setSelectedTaskId(plan.topics[0]?.tasks[0]?.id ?? null);
      await refreshPlans();
    });

  const openPlan = (planId: string) =>
    mutate('Opening plan...', async () => {
      const plan = await api.showPlan(planId);
      setSelectedPlan(plan);
      setSelectedTaskId(plan.topics[0]?.tasks[0]?.id ?? null);
      setFiles(null);
      setRunResult(null);
      setChat([]);
      setVisualization(null);
    });

  const scaffold = () =>
    selectedTask === null
      ? undefined
      : mutate('Scaffolding task...', async () => {
          const response = await api.scaffoldTask(selectedTask.id);
          setFiles(response.files);
          setSolutionDraft(response.files.solution);
          await openPlan(selectedPlan?.id ?? '');
        });

  const saveSolution = () =>
    selectedTask === null
      ? undefined
      : mutate('Saving solution...', async () => {
          const response = await api.saveSolution(selectedTask.id, solutionDraft);
          setFiles(response.files);
        });

  const runTask = () =>
    selectedTask === null
      ? undefined
      : mutate('Running tests...', async () => {
          await api.saveSolution(selectedTask.id, solutionDraft);
          const response = await api.runTask(selectedTask.id);
          setRunResult(response.result);
          if (selectedPlan !== null) {
            setSelectedPlan(await api.showPlan(selectedPlan.id));
          }
        });

  const sendChat = () =>
    selectedTask === null
      ? undefined
      : mutate('Asking tutor...', async () => {
          const response = await api.chat(selectedTask.id, chatInput);
          setChat((messages) => [...messages, response.userMessage, response.assistantMessage]);
          setVisualization(response.visualization);
        });

  const commit = () =>
    selectedTask === null
      ? undefined
      : mutate('Committing task...', async () => {
          await api.commitTask(selectedTask.id);
          if (selectedPlan !== null) {
            setSelectedPlan(await api.showPlan(selectedPlan.id));
            await refreshPlans();
          }
        });

  return (
    <div className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">code-sherpa POC</p>
          <h1>AI-tutored algorithms practice, local-first.</h1>
          <p className="lede">
            Generate a plan, scaffold tasks into a workspace, run tests, ask for help, and commit
            passing work.
          </p>
        </div>
        <div className="status-card" role="status">
          <span>Status</span>
          <strong>{status}</strong>
          {error === null ? null : <p className="error">{error}</p>}
        </div>
      </header>

      <section className="grid two">
        <article className="panel">
          <h2>1. Setup</h2>
          <label>
            Claude CLI path
            <input
              value={setup?.claudePath ?? ''}
              onChange={(event) =>
                setSetup((current) => ({
                  ...(current ?? defaultSetupState),
                  claudePath: event.target.value,
                }))
              }
              placeholder="/usr/local/bin/claude"
            />
          </label>
          <label>
            GitHub repo URL
            <input
              value={setup?.repoUrl ?? ''}
              onChange={(event) =>
                setSetup((current) => ({
                  ...(current ?? defaultSetupState),
                  repoUrl: event.target.value,
                }))
              }
              placeholder="git@github.com:me/algos-journal.git"
            />
          </label>
          <p className="hint">Workspace: {setup?.workspacePath ?? defaultWorkspacePath}</p>
          <button type="button" onClick={saveSetup}>
            Save setup
          </button>
        </article>

        <article className="panel">
          <h2>2. Generate plan</h2>
          <label>
            Goal
            <textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={5} />
          </label>
          <button type="button" onClick={createPlan}>
            New plan
          </button>
        </article>
      </section>

      <section className="grid main-grid">
        <aside className="panel">
          <h2>Plans</h2>
          {plans.length === 0 ? (
            <p className="empty">No plans yet. Generate one to start.</p>
          ) : null}
          <div className="stack">
            {plans.map((plan) => (
              <button
                key={plan.id}
                className="list-button"
                type="button"
                onClick={() => openPlan(plan.id)}
              >
                <strong>{plan.title}</strong>
                <span>{formatProgress(plan)}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel">
          <h2>{selectedPlan?.title ?? 'Plan detail'}</h2>
          {selectedPlan === null ? (
            <p className="empty">Choose or create a plan.</p>
          ) : (
            <div className="topics">
              {selectedPlan.topics.map((topic) => (
                <article key={topic.id} className="topic">
                  <div className="topic-header">
                    <h3>{topic.title}</h3>
                    <button
                      type="button"
                      onClick={() =>
                        void api.explainTopic(topic.id).then(() => openPlan(selectedPlan.id))
                      }
                    >
                      Explain
                    </button>
                  </div>
                  {topic.explanationMd === null ? null : (
                    <p className="hint">{topic.explanationMd}</p>
                  )}
                  {topic.tasks.map((task) => (
                    <button
                      key={task.id}
                      className={task.id === selectedTaskId ? 'task active' : 'task'}
                      type="button"
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        setFiles(null);
                        setRunResult(null);
                      }}
                    >
                      <span>{task.title}</span>
                      <small>{statusLabel(task.status)}</small>
                    </button>
                  ))}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel task-panel">
          <h2>{selectedTask?.title ?? 'Task workspace'}</h2>
          {selectedTask === null ? (
            <p className="empty">Select a task from the plan.</p>
          ) : (
            <>
              <p className="prompt">{selectedTask.promptMd}</p>
              <div className="toolbar">
                <button type="button" onClick={scaffold}>
                  Scaffold
                </button>
                <button type="button" onClick={saveSolution}>
                  Save
                </button>
                <button type="button" onClick={runTask}>
                  Run tests
                </button>
                <button type="button" onClick={commit}>
                  Commit
                </button>
              </div>
              <label>
                solution.py
                <textarea
                  className="code"
                  value={solutionDraft || files?.solution || ''}
                  onChange={(event) => setSolutionDraft(event.target.value)}
                  rows={15}
                />
              </label>
              <details open>
                <summary>Generated tests</summary>
                <pre>{files?.test ?? 'Scaffold the task to create tests.'}</pre>
              </details>
              <details open>
                <summary>Run output</summary>
                <pre className={runResult?.passed ? 'pass' : 'output'}>
                  {runResult?.output ?? 'Run tests to see output.'}
                </pre>
              </details>
            </>
          )}
        </section>
      </section>

      <section className="grid two">
        <article className="panel">
          <h2>Ask tutor</h2>
          <label>
            Message
            <textarea
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              rows={3}
            />
          </label>
          <button type="button" onClick={sendChat} disabled={selectedTask === null}>
            Send
          </button>
          <div className="chat-log">
            {chat.map((message) => (
              <article key={message.id} className={`message ${message.role}`}>
                <strong>{message.role}</strong>
                <p>{message.contentMd}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Visualization</h2>
          {visualization === null ? (
            <p className="empty">Ask for a visualization to render Mermaid/SVG payloads here.</p>
          ) : (
            <pre>{visualization.payload}</pre>
          )}
        </article>
      </section>
    </div>
  );
}
