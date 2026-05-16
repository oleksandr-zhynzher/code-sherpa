# code-sherpa — AI-Tutored Algorithms Practice Platform

code-sherpa is a personal learning platform for mastering algorithms and data structures.
You collaborate with an AI tutor (running locally via the Claude CLI) to:

1. Generate a **personalized learning plan** stored in a database.
2. Drill through each plan **topic-by-topic** with explanations and coding tasks.
3. Auto-scaffold each task as a **local file + test suite** that you implement in your editor.
4. **Commit and sync** your solution to a linked GitHub repo through the agent.
5. Ask the agent for **interactive visualizations** of algorithmic patterns
   (two pointers, sliding window, recursion trees, graph traversals, …).

Inspired by [DeepTutor](https://github.com/HKUDS/DeepTutor) (HKUDS) — see
[docs/00-vision.md](docs/00-vision.md#inspiration--differentiation) for how code-sherpa
borrows from and diverges from it.

## POC documentation

Read these in order:

1. [docs/00-vision.md](docs/00-vision.md) — Problem, vision, scope, DeepTutor diff
2. [docs/01-architecture.md](docs/01-architecture.md) — System design, data model, agent flow
3. [docs/02-features.md](docs/02-features.md) — Feature backlog (MVP + extras to brainstorm)
4. [docs/03-roadmap.md](docs/03-roadmap.md) — Step-by-step staged build plan
5. [docs/04-poc-walkthrough.md](docs/04-poc-walkthrough.md) — End-to-end user journey for the POC

## Quick status

This repository currently contains **planning artifacts only** — no code yet.
Stage 0 of the [roadmap](docs/03-roadmap.md) is the next concrete step.
