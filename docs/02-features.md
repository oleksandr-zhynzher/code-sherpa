# 02 — Feature Backlog

Features are tagged:

- **[MVP]** — required for the POC success criteria in [00-vision.md](00-vision.md#success-criteria-for-the-poc).
- **[Next]** — natural extension once MVP is solid.
- **[Stretch]** — interesting, defer until there's a reason.

## Core learning loop

- **[MVP]** Goal-driven plan generation (`"learn graphs in 2 weeks"` → DB).
- **[MVP]** Topic explanation on demand, cached after first generation.
- **[MVP]** Task scaffolding: solution file + test file in chosen language.
- **[MVP]** In-app code editor (Monaco) bound to the local file.
- **[MVP]** Run tests from the UI; live output stream.
- **[MVP]** Mark task done automatically when tests pass.
- **[Next]** Hint ladder — agent gives progressively bigger hints on request,
  not the full solution unless asked.
- **[Next]** "Why did my solution fail?" — agent reads test output + your code
  and explains the bug without rewriting it.
- **[Next]** Complexity check — after passing tests, agent estimates time/space
  complexity and suggests improvements.
- **[Stretch]** Spaced-repetition scheduler — re-surface old tasks at
  increasing intervals, present them empty again to re-solve from memory.

## Visualization

- **[MVP]** Inline Mermaid graphs (good for trees, state machines, DFS/BFS order).
- **[MVP]** Inline SVG (agent emits raw SVG for two-pointer/sliding-window animations).
- **[MVP]** Inline Chart.js (e.g. complexity comparisons).
- **[Next]** Step-through animator — agent emits a sequence of frames; UI
  shows play/pause/scrub. Great for sorting algorithms, recursion stacks.
- **[Next]** "Trace my code" — agent runs your solution mentally on a sample
  input and emits per-step state.
- **[Stretch]** Manim integration (DeepTutor's Math Animator) for polished
  videos — only worth it if step-through animator isn't enough.

## GitHub / repo integration

- **[MVP]** Link a single repo via URL + PAT.
- **[MVP]** Auto-clone into `workspace/`; treat that as source of truth.
- **[MVP]** Per-task commit + push with agent-generated message.
- **[MVP]** Conventional layout: `<topic-slug>/<task-slug>/{solution,test}.<ext>`.
- **[Next]** Branch-per-topic mode for users who want PRs.
- **[Next]** Auto-generate a `README.md` per topic folder summarizing solved tasks.
- **[Next]** Repo bootstrap: if the user gives an empty repo, the agent creates
  a starter README + CI workflow that runs all tests.
- **[Stretch]** GitHub Actions integration — open a PR from a task, let CI
  validate before "done" status sticks.

## Agent / tutor

- **[MVP]** Local Claude CLI subprocess as the only agent runtime.
- **[MVP]** Per-task chat thread persisted in DB.
- **[MVP]** Tool protocol: `db.read_topic`, `fs.write_scaffold`,
  `tests.generate`, `viz.render`, `git.commit_solution`.
- **[Next]** Persistent learner profile (à la DeepTutor Memory): "user knows
  Python well, weak on DP, prefers terse explanations".
- **[Next]** Configurable tutor persona (Socratic vs. direct vs. exam-coach).
- **[Stretch]** Multiple agent backends (OpenAI, local Ollama) behind a common
  interface.

## Knowledge base / context

- **[Next]** Drop a PDF or set of notes into a topic; agent uses them as
  primary source for explanations (RAG-lite).
- **[Next]** Index your past solutions so the agent can reference them
  ("you used a similar pattern in `arrays/two-sum`").
- **[Stretch]** Cross-topic concept graph: link "binary search" to "search
  in rotated array", auto-suggest follow-up tasks.

## UX polish

- **[MVP]** Plan progress overview (tasks done / total, streak counter).
- **[Next]** Daily plan widget — "today: 2 tasks, ~45 min".
- **[Next]** Keyboard-first navigation (no mouse needed for the core loop).
- **[Next]** Dark mode + theme.
- **[Stretch]** Calendar/heatmap of activity (GitHub-style).
- **[Stretch]** Export plan + solutions as a static site (your "portfolio").

## Brainstormed extras (you asked for more ideas)

These came out of asking *"what would make this stick where LeetCode + ChatGPT
doesn't?"*:

1. **Forced re-derivation.** When a task is marked done, schedule a future
   "blank-slate" re-attempt. Spaced repetition for code, not flashcards.
2. **Pattern flashcards.** Auto-extract the 1-paragraph "pattern" behind each
   solved task ("monotonic stack — keep elements that could still be the next
   greater"). Surface them as a swipeable deck.
3. **Constraint-driven variants.** After solving, the agent generates a
   variant: "now do it in O(1) extra space" or "now stream the input". One
   click adds it as a new task in the same topic.
4. **Mock-interview mode.** A timer + a stricter persona that won't give
   hints, asks you to talk through your approach (transcribed via Web Speech
   API), and evaluates afterwards.
5. **"Explain to a rubber duck" capture.** Record a 60s voice note explaining
   your solution; agent transcribes + grades clarity. Forces real understanding.
6. **Diff review.** When you re-solve a task later, the agent diffs your two
   solutions and points out improvements/regressions.
7. **Linked-concept jumps.** From any explanation, click a concept ("amortized
   analysis") to spawn a 1-task mini-detour topic, then return.
8. **Curated curricula import.** YAML/JSON file format for plans so you (or
   others) can share curricula. Acts like a `package.json` for learning paths.
9. **Plugin tasks.** Some tasks aren't pure algorithms — e.g. "implement a
   priority queue and benchmark it". Allow tasks with custom runner scripts.
10. **Local leaderboard against yourself.** Track time-to-solve per task; show
    trend lines per pattern. Useful to see "I'm finally fast at sliding window".

Pick from these once the MVP loop is running — don't try to build them upfront.
