# 04 — POC End-to-End Walkthrough

This is the user story the POC must support after Stage 7. Use it as an
acceptance script.

## Setup (one-time)

1. Clone this repo, run `make dev`.
2. Open `http://localhost:3000`. The Setup page asks for:
   - Path to the local `claude` CLI binary (auto-detected if on PATH).
   - GitHub repo URL (e.g. `git@github.com:me/algos-journal.git`).
   - GitHub PAT (fine-grained, `contents:write` on that repo only).
3. Backend clones the repo into `./workspace/`. Setup is done.

## Day 1 — Plan generation

1. Click **New plan**. Type:
   > I have 3 weeks before interviews. I'm comfortable with arrays and
   > strings. I struggle with graphs and dynamic programming. 45 min/day.
2. Watch the chat panel as the agent thinks aloud and streams tool calls:
   ```
   → db.create_plan({title:"3-Week Interview Prep", goal:"…"})
   → db.add_topic({slug:"graphs-foundations", position:1, …})
   → db.add_task({topic:"graphs-foundations", slug:"bfs-shortest-path", …})
   → …
   ```
3. The plan tree renders on the left as topics/tasks land. Total: ~6 topics,
   ~18 tasks.

## Day 1 — First task

1. Click **graphs-foundations → bfs-shortest-path**.
2. Task page shows:
   - Problem statement + 2 examples.
   - Empty `workspace/graphs/bfs-shortest-path/solution.py` open in Monaco.
   - Read-only `test_solution.py` with 5 pytest cases the agent generated.
   - Chat panel on the right.
3. Type in chat: "Show me how BFS expands on a 4×4 grid from (0,0) to (3,3),
   blocking cell (1,1)."
4. Agent replies with a short paragraph and an inline Mermaid graph showing
   the BFS layer order. You can scrub through layers by hovering.
5. Click **Hint → Level 1**: "Use a queue and a visited set; track distance
   with the queue entry."
6. You write the solution. Autosave to disk every keystroke (debounced).
7. Click **Run**. Output streams: `5 passed in 0.04s`. Status badge flips
   to **Passing**.
8. Click **Commit & push**. Toast: `Committed feat(graphs): solve BFS shortest
   path → opens at github.com/me/algos-journal/commit/…`. Status flips to
   **Done**, topic progress bar moves from 0/3 to 1/3.

## Day 2 — Resume

1. Open the app. Home page: "Welcome back. Today's plan: 2 tasks (~45 min).
   Streak: 1 day."
2. Click the next task. Chat history from yesterday is gone (new task =
   fresh thread), but the plan, repo, and progress are intact.
3. Repeat the loop.

## Day 8 — Stuck on a DP task

1. You write a solution; tests fail with a wrong answer.
2. Click **Why did this fail?** in chat.
3. Agent reads the test output + your code, replies:
   > Your recurrence handles the base case for `n=0` but not `n=1`. Trace
   > for `n=1`: …
   > (no rewritten code unless you ask)
4. Optional: click **Trace my code** → agent emits a step-by-step state table
   for input `n=3`, rendered as an inline table.

## What's in your linked repo at the end of week 3

```
algos-journal/
├── README.md
├── graphs/
│   ├── bfs-shortest-path/{solution.py,test_solution.py}
│   ├── dfs-connected-components/…
│   └── dijkstra/…
├── dynamic-programming/
│   ├── coin-change/…
│   ├── longest-increasing-subseq/…
│   └── …
└── .almamater/
    └── backup.db
```

A real, browsable, shareable record of what you actually solved — the artifact
LeetCode never gives you.

## Non-goals for this walkthrough

- No multi-user, no auth screens.
- No mobile.
- No animation videos (Mermaid/SVG only).
- No third-party LLM choices — just the local Claude CLI you already have.

If every step above works without falling back to the terminal, the POC is
done.
