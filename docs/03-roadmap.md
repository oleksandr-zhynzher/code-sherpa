# 03 — Step-by-Step Implementation Roadmap

Each stage is small enough to ship in one focused sitting and ends with a
**verify** step you can actually run. Don't move to the next stage until the
verify passes.

---

## Stage 0 — Repo & toolchain bootstrap

**Goal.** Empty but runnable monorepo via Docker.

1. Create folders: `backend/`, `web/`, `docs/` (already exists), `workspace/`
   (gitignored), `.almamater/` (gitignored).
2. `backend/`: `pyproject.toml` with FastAPI, uvicorn, pydantic, sqlite3 (stdlib),
   pytest. Add `Dockerfile` for the Python backend.
3. `web/`: `npm create next-app` (TS, Tailwind, App Router). Add `Dockerfile` for the Node.js frontend.
4. Root `docker-compose.yml` defining `frontend` and `backend` services. Map `workspace/` and `.almamater/` as volumes into the backend container.
5. `.gitignore` covers `workspace/`, `.almamater/`, `.env`, `*.db`.

**Verify.** `docker compose up --build` boots FastAPI on `127.0.0.1:8000` and Next.js on `:3000`;
both serve a hello page.

---

## Stage 1 — DB + plan/topic/task CRUD (no agent yet)

**Goal.** Persist the data model without any AI involved.

1. Create the schema from [docs/01-architecture.md](01-architecture.md#data-model-sqlite)
   as `backend/migrations/001_init.sql`. Run on startup if absent.
2. Pydantic models for `Plan`, `Topic`, `Task`.
3. Endpoints: `POST/GET /plans`, `GET /topics/{id}`, `GET /tasks/{id}`.
4. **Seed a hand-written plan** ("Arrays & Two Pointers, 3 tasks") so the UI
   has something real to show.
5. Frontend: plan list page → plan detail (tree of topics/tasks).

**Verify.** Create plan via `curl`, see it render in the browser. Pytest covers
CRUD + cascade deletes.

---

## Stage 2 — Workspace + GitHub linking

**Goal.** Link a real repo and round-trip a file.

1. `POST /repo/link` — accepts `{url, pat}`, encrypts PAT, stores in
   `repo_link`, `git clone`s into `workspace/`.
2. `GET /fs/{path}`, `PUT /fs/{path}` — read/write inside `workspace/` only
   (path-traversal guard).
3. `POST /git/commit` (`{message}`), `POST /git/push`. Use `subprocess` with a
   credential helper file pointing at the encrypted PAT.
4. UI: "Settings → Link repo" form. After linking, "Repo OK ✓" badge.

**Verify.** Link a throwaway GitHub repo, edit a file via the UI, commit, push;
see the commit appear on GitHub. Path traversal attempts return 400.

---

## Stage 3 — Claude CLI agent harness (no tools yet)

**Goal.** Stream tokens from the local CLI into the browser.

1. `backend/agent/cli.py` — `class ClaudeAgent` with `async def stream(prompt, system)`
   that spawns the CLI subprocess and yields stdout chunks.
2. `POST /agent/chat` — SSE endpoint that pipes the stream.
3. UI: chat panel on a task page; user message → streamed assistant reply,
   persisted to `chat_message`.

**Verify.** Send "hi" from the UI, see tokens stream in. Reload page → message
history is restored.

---

## Stage 4 — Tool protocol + plan generation

**Goal.** Replace the seed plan with one the agent generates.

1. Define tool protocol: agent emits JSON blocks like
   `{"tool":"db.create_plan","args":{...}}` interleaved with prose. Backend
   parses, executes, and feeds results back as the next user turn.
2. Implement tools: `db.create_plan`, `db.add_topic`, `db.add_task`.
3. New "Create plan" UI flow: user types goal → agent runs the planner system
   prompt → progress indicator while topics/tasks land in DB.

**Verify.** "Plan me 5 days of two-pointer practice" produces a coherent plan
in the DB. Bad/missing fields return validation errors that the agent can
recover from on retry.

---

## Stage 5 — Task scaffolding + test runner

**Goal.** Open a task, get files, run tests.

1. Tools: `fs.write_scaffold(task_id, language)`,
   `tests.generate(task_id)`. Both write into `workspace/` via the workspace
   service.
2. `POST /tasks/{id}/scaffold` triggers the agent to call the tools.
3. `POST /tasks/{id}/run` shells out to `pytest <test_path>` (Python) or
   `npx vitest run <test_path>` (TS). Stream stdout/stderr via SSE.
4. UI task page: Monaco editor + Run button + output pane.
5. On "all tests pass", set `task.status = 'passing'` (not yet `done`).

**Verify.** Open a task, files appear, write the obvious solution, click Run,
see green. Status updates in the topic view.

---

## Stage 6 — Commit-on-pass workflow

**Goal.** Close the loop into the linked repo.

1. "Commit & push" button enabled only when `status = 'passing'`.
2. Agent generates commit message from task metadata.
3. `git add <solution_path> <test_path> && git commit -m … && git push`.
4. On success: `task.status = 'done'`, topic progress updates, toast with
   commit URL on GitHub.

**Verify.** Solve a task end-to-end; new commit visible on GitHub with both
files in the conventional layout.

---

## Stage 7 — Visualization tool

**Goal.** Inline Mermaid/SVG/Chart.js answers to "show me how X works".

1. Tool: `viz.render({kind, payload, prompt})`. Backend caches in
   `visualization` table, returns an id.
2. Agent system prompt teaches it to prefer `viz.render` for spatial/algorithmic
   explanations.
3. Frontend chat renderer recognizes viz blocks (by id) and switches on `kind`:
   - `mermaid` → `mermaid.js`
   - `svg` → sanitized inline SVG
   - `chartjs` → `react-chartjs-2`

**Verify.** Ask "visualize BFS on a 4×4 grid from (0,0) to (3,3)" — get a
labeled grid SVG or Mermaid graph rendered inline. Refresh page → cached viz
still renders.

---

## Stage 8 — Topic explanations + hint ladder

**Goal.** Move beyond just tasks; flesh out the *learning* side.

1. `POST /topics/{id}/explain` — agent writes Markdown into `topic.explanation_md`.
2. UI topic page renders the explanation with rendered code blocks and viz
   embeds.
3. Task chat gains a "Hint" button — three levels: nudge → approach → near-solution.
   Implement as system-prompt instructions, not separate endpoints.

**Verify.** New topics auto-generate explanations on first visit. Hint button
yields qualitatively different responses at each level.

---

## Stage 9 — Polish for daily use

**Goal.** You actually use it.

1. Plan/topic progress bars and a streak counter on the home page.
2. Keyboard shortcuts: `g p` plan, `g t` task, `r` run, `c` commit.
3. Empty/error states everywhere (no whitescreen).
4. Backup script: nightly copy of `almamater.db` into the linked repo under
   `.almamater/backup.db`.

**Verify.** You run a real one-week sprint with it and don't have to drop
into the terminal except for the initial `make dev`.

---

## Stage 10 — Pick **one** extra from the brainstormed list

Don't pile features on. Pick the single feature that would most increase how
often you use the tool, then build it. Likely candidates from
[docs/02-features.md](02-features.md#brainstormed-extras-you-asked-for-more-ideas):

- Forced re-derivation (spaced repetition of code) — high stickiness.
- Constraint-driven variants — multiplies the value of every solved task.
- Mock-interview mode — directly serves the "interview prep" goal.

---

## Working principles for every stage

- **Tests first** for the backend stage you're on (pytest). Don't accept code
  without a regression test.
- **Touch only what the stage requires.** Resist refactoring earlier stages
  while building a later one — log it as a TODO in `docs/`.
- **Verify means a real run-through**, not just "it compiles".
- **Commit per stage**, with a tag (`stage-1`, `stage-2`, …) so you can roll
  back cleanly if a stage goes off the rails.
