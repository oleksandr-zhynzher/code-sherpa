# 00 — Vision & Scope

## Problem

Learning algorithms requires three things that rarely sit in the same place:

- **Curriculum** — a coherent path through topics matched to your level and goal.
- **Practice loop** — write code, run tests, see results fast.
- **Conceptual scaffolding** — explanations and visualizations of _why_ a pattern
  works (two pointers, sliding window, DP, graph search, …).

Today you bounce between LeetCode (practice), YouTube/blogs (concepts),
ChatGPT (explanations), and your own notes/repo (history). Nothing tracks you.

## Vision

A single workspace where an AI tutor:

- builds a **learning plan** with you,
- generates **topics + tasks** on demand,
- **scaffolds the code & tests** locally for each task,
- watches you commit, **syncs to your linked GitHub repo**,
- and **explains/visualizes** anything you get stuck on — in context.

The agent is the **local Claude CLI** invoked from the backend, so your code,
notes, and history live on your machine and your repo. The web UI is the
control surface; the CLI is the brain.

## Primary user (you)

A working developer studying algorithms 30–60 min/day, preparing for interviews
or just systematically filling gaps. Wants:

- progress that **persists** across sessions,
- a **single repo** of all solved problems (portfolio + spaced review),
- explanations tuned to **what you already know**,
- visualizations that aren't generic stock images.

## In scope (POC)

- One user, local-first deployment (you run it on your laptop).
- Web UI: plan view, topic view, task view, chat panel, visualization panel.
- SQLite database for plan/topics/tasks/progress.
- Claude CLI as the agent backend (subprocess + structured I/O).
- GitHub integration via a single linked repo + a GitHub Personal Access Token.
- File scaffolding: solution file + test file in a configurable language
  (Python first, then TS).
- Commit/push from the UI, with the agent organizing files into the repo's
  conventional layout.
- Visualizations: agent emits a self-contained HTML/SVG block (Mermaid,
  Chart.js, or hand-written SVG) that the UI renders inline.

## Explicitly out of scope (for now)

- Multi-user, auth, billing.
- Hosted deployment, cloud storage.
- Video/Manim animations (DeepTutor has this — defer until MVP works).
- Native mobile.
- Marketplace of curricula.

## Inspiration & differentiation

DeepTutor is the obvious reference (Chat / Deep Solve / Quiz / Visualize / Book
Engine / TutorBot / Knowledge Hub / Memory). code-sherpa overlaps in spirit but
narrows aggressively:

| Dimension          | DeepTutor                                       | code-sherpa                                     |
| ------------------ | ----------------------------------------------- | ----------------------------------------------- |
| Domain             | General tutoring across any uploaded material   | Algorithms & data structures only               |
| Primary artifact   | Conversations, books, notebooks                 | A working **GitHub repo of solved problems**    |
| Practice loop      | Quizzes generated from KB                       | Code task + tests + commit + repo sync          |
| Agent runtime      | Multi-provider, multi-agent (TutorBot, nanobot) | Single local Claude CLI subprocess              |
| Curriculum         | Book Engine builds reading material             | Learning Plan builds _coding_ tasks             |
| Visualization      | Manim, SVG, Mermaid, Chart.js                   | SVG + Mermaid + Chart.js (no Manim in POC)      |
| Persistence target | Internal DB / notebooks                         | Your **own GitHub repo** is the source of truth |
| Multi-user         | First-class (admin + grants + PocketBase)       | Out of scope                                    |

The key bet: a **GitHub-repo-as-portfolio** loop is more motivating for a
developer learning algorithms than a generic notebook. Everything else (plan,
explanations, visualizations) feeds that loop.

## Success criteria for the POC

You can sit down, in one session:

1. Ask for a 4-week plan on graphs → it lands in the DB.
2. Click a task ("BFS shortest path") → solution + test files appear locally.
3. Ask "show me how BFS expands on a 4×4 grid" → an inline visualization renders.
4. Implement the solution, run tests from the UI, see green.
5. Click commit → the linked repo gains `graphs/bfs-shortest-path/{solution,test}.py`
   with a sensible commit message.
6. Reopen the app tomorrow → progress, plan, and chat history are all there.
