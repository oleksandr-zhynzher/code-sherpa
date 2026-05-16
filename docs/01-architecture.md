# 01 — Architecture

## High-level diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Docker Compose (Network)                        │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │                         Frontend (Next.js)                         │ │
│ │                              [Port 3000]                           │ │
│ │  Plan view · Topic view · Task view · Chat panel · Viz panel       │ │
│ └──────────────────────────────┬─────────────────────────────────────┘ │
│                                │ HTTP + WebSocket (SSE)                │
│ ┌──────────────────────────────▼─────────────────────────────────────┐ │
│ │                       Backend (Fastify/Node.js)                    │ │
│ │                              [Port 8000]                           │ │
│ │  ┌────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────┐  │ │
│ │  │ Plan svc   │ │ Task svc    │ │ Agent svc    │ │ Workspace svc│  │ │
│ │  └────────────┘ └─────────────┘ └──────────────┘ └──────────────┘  │ │
│ └────────┬──────────────┬──────────────────┬─────────────────┬───────┘ │
└──────────┼──────────────┼──────────────────┼─────────────────┼─────────┘
           │              │                  │                 │
     ┌─────▼─────┐  ┌─────▼──────┐    ┌──────▼──────┐   ┌──────▼───────┐
     │  SQLite   │  │  Local FS  │    │ Claude CLI  │   │  GitHub API  │
     │ volume    │  │  workspace/│    │ (subprocess)│   │  (PAT)       │
     └───────────┘  └────────────┘    └─────────────┘   └──────────────┘
```

## Components

### Environment Setup (Docker Compose)

The application is orchestrated via an outer `docker-compose.yml` that definitions two main services:

- **`frontend`** (runs the Next.js UI)
- **`backend`** (runs Fastify/Node.js)
- Both services share a common Docker network. The backend container mounts local filesystem directories as volumes so that the `workspace/` and `code-sherpa.db` persist and remain accessible natively on the host machine.

### Frontend (Next.js + React + Tailwind)

- **Plan view** — tree of topics with progress bars.
- **Topic view** — explanation (Markdown rendered), list of tasks, "ask tutor" box.
- **Task view** — three panes:
  1. Problem statement + examples.
  2. Code editor (Monaco) bound to the local file.
  3. Test runner output + chat + viz tabs.
- **Chat panel** — streaming tutor responses; supports inline viz blocks.
- **Viz renderer** — switches on block type: `mermaid`, `svg`, `chartjs`, `html`.

### Backend (Fastify/Node.js)

Single process, TypeScript. Endpoints split by concern:

| Service     | Endpoints (sketch)                                                       |
| ----------- | ------------------------------------------------------------------------ |
| `plan`      | `POST /plans` (generate via agent), `GET /plans/{id}`                    |
| `topic`     | `GET /topics/{id}`, `POST /topics/{id}/explain`                          |
| `task`      | `POST /tasks/{id}/scaffold`, `POST /tasks/{id}/run`                      |
| `agent`     | `POST /agent/chat` (SSE stream), `POST /agent/visualize`                 |
| `workspace` | `GET /fs/{path}`, `PUT /fs/{path}`, `POST /git/commit`, `POST /git/push` |
| `repo`      | `POST /repo/link` (store PAT + url), `GET /repo/status`                  |

### Agent layer (Claude CLI wrapper)

- Spawns `claude` (or your installed CLI binary) as a subprocess via Node.js `child_process.spawn`.
- Communicates via stdin (prompt + system prompt + structured JSON context)
  and stdout (streamed tokens + tool-call blocks).
- A small **tool protocol** lets the agent call backend functions:
  - `db.read_topic(id)`
  - `fs.write_scaffold(task_id, language)`
  - `tests.generate(task_id)`
  - `viz.render(spec)` — returns a renderable block to the UI
  - `git.commit_solution(task_id, message)`
- All tool calls are **mediated by the backend** — the agent never touches the
  filesystem or git directly. This keeps blast radius small.

### Storage

- **SQLite** (`code-sherpa.db`) — see [Data model](#data-model) below.
- **Local FS workspace** (`./workspace/`) — mirrors the linked GitHub repo's
  layout. This _is_ a git working tree; the linked GitHub repo is its `origin`.
- **`.code-sherpa/`** in the workspace — agent state: chat transcripts per task,
  cached explanations, viz cache.

### GitHub integration

- User pastes a repo URL + a fine-grained PAT (scope: `contents:write`).
- Backend `git clone`s it into `workspace/`. From then on, commit/push happens
  through `git` CLI with the PAT in a credential helper file (gitignored).
- "Send the link to the repo and the agent creates the files" → the agent
  reads the topic/task structure from the DB and runs `fs.write_scaffold`
  tools that the workspace service translates into actual file writes inside
  the working tree.

## Data model (SQLite)

```sql
-- A learning plan generated by the agent for a stated goal.
CREATE TABLE plan (
  id            INTEGER PRIMARY KEY,
  title         TEXT NOT NULL,
  goal          TEXT NOT NULL,            -- "interview prep, FAANG, 6 weeks"
  created_at    TEXT NOT NULL,
  meta_json     TEXT                      -- agent's planning notes
);

-- Ordered topics inside a plan.
CREATE TABLE topic (
  id            INTEGER PRIMARY KEY,
  plan_id       INTEGER REFERENCES plan(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  slug          TEXT NOT NULL,            -- "two-pointers"
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'todo',  -- todo|in_progress|done
  explanation_md TEXT                     -- cached explanation
);

-- Coding tasks inside a topic.
CREATE TABLE task (
  id            INTEGER PRIMARY KEY,
  topic_id      INTEGER REFERENCES topic(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  slug          TEXT NOT NULL,            -- "valid-palindrome"
  title         TEXT NOT NULL,
  difficulty    TEXT,                     -- easy|medium|hard
  prompt_md     TEXT NOT NULL,
  language      TEXT NOT NULL DEFAULT 'python',
  solution_path TEXT,                     -- relative path inside workspace/
  test_path     TEXT,
  status        TEXT NOT NULL DEFAULT 'todo',  -- todo|in_progress|passing|done
  last_run_at   TEXT,
  last_run_pass BOOLEAN
);

-- Agent chat history scoped to a task (for context continuity).
CREATE TABLE chat_message (
  id            INTEGER PRIMARY KEY,
  task_id       INTEGER REFERENCES task(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,            -- user|assistant|tool
  content_md    TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

-- Cached visualizations so we don't re-generate.
CREATE TABLE visualization (
  id            INTEGER PRIMARY KEY,
  task_id       INTEGER REFERENCES task(id) ON DELETE CASCADE,
  prompt        TEXT NOT NULL,
  kind          TEXT NOT NULL,            -- mermaid|svg|chartjs|html
  payload       TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

-- Single-row table for repo link (POC is single-user).
CREATE TABLE repo_link (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  url           TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  workspace_path TEXT NOT NULL,
  pat_encrypted TEXT NOT NULL
);
```

## Key flows

### Flow A — Generate a learning plan

1. UI sends `POST /plans` with `{ goal: "graphs in 2 weeks" }`.
2. Agent service spawns Claude CLI with a **planner system prompt** and the
   user goal.
3. Agent emits a JSON plan: `{ title, topics: [{slug, title, tasks:[…]}] }`.
4. Backend validates & inserts into `plan` / `topic` / `task`.
5. UI navigates to the new plan.

### Flow B — Start a task

1. UI calls `POST /tasks/{id}/scaffold`.
2. Workspace service:
   - Resolves `solution_path` (e.g. `graphs/bfs-shortest-path/solution.py`).
   - Creates the file empty (or with a function signature stub from the prompt).
3. Agent generates `test_path` (e.g. `…/test_solution.py`) — pytest/jest cases
   derived from `prompt_md`.
4. UI opens the solution file in the Monaco editor and shows the test file
   read-only alongside.

### Flow C — Ask + visualize

1. User types "show me how two pointers work on `[1,2,3,4,5]` for target sum 6".
2. UI sends `POST /agent/chat` with task context.
3. Agent decides this needs a viz → calls the `viz.render` tool with a Mermaid
   or SVG spec.
4. Backend caches the viz, streams a chat message containing a viz block ref.
5. Frontend renders the block inline.

### Flow D — Save & commit

1. User edits the solution; UI autosaves via `PUT /fs/{path}`.
2. User clicks "Run tests" → `POST /tasks/{id}/run` shells out to
   `pytest` / `npx vitest` for that file and streams output.
3. On green, "Commit & push" calls `POST /git/commit` then `POST /git/push`.
4. Agent generates a commit message (`feat(graphs): solve BFS shortest path`)
   from the task metadata.
5. `task.status = 'done'`; topic progress bar updates.

## Security notes (POC scope)

- PAT stored encrypted with a key in `~/.code-sherpa/key` (mode 0600).
- Backend bound to `127.0.0.1` only.
- Tests run inside the user's local Python/Node — no sandbox in POC. Document
  that running untrusted agent-generated code carries risk and require
  explicit "Run" clicks (no auto-run).
- All agent tool calls are validated against an allow-list of paths inside
  `workspace/` to prevent path traversal.
