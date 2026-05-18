# 05 — Pages, functionality, and site concept

This document describes what the product is, how it should *feel*, and what each main page is for. It does not prescribe detailed visual design (exact layouts, fonts, or pixel-perfect specs).

## What code-sherpa is

code-sherpa helps people build **problem-solving skills** step by step—with a guide beside them, like a mountain Sherpa who knows the terrain.

- A **Sherpa** is someone who helps you climb safely and learn the route, not someone who carries you to the top.
- In the product: your **route** is your learning path, each **camp** is a topic you rest at and learn, and each **climb** is a concrete exercise you tackle.

The promise is simple: **clear path, steady practice, help when you’re stuck, and a record of how far you’ve come.**

## Look and feel (themes, not design specs)

The experience should feel like **mountains, weather, and trail markers**—calm, sturdy, and encouraging.

- **Neutrals**: rock and trail (grounded background).
- **Main accent**: clear sky / alpine blue (guidance, “you’re oriented”).
- **Success**: summit green (progress, “you made it”).
- **Caution**: warm amber (pay attention—tricky step ahead).
- **Problem**: clear red when something is wrong so it’s obvious what needs fixing.

## Only three main pages

Everything important fits on **three pages** so people don’t get lost clicking around.

| Page | What it’s for |
| ---- | ------------- |
| **Home** | Understand the idea, feel trust, know how to start |
| **Setup** | Connect what’s needed once, fix problems in one place |
| **Your learning space** | Do all learning here—path, exercises, guide, pictures, progress |

The learning page should stay **one screen** with sections (side lists, tabs, or panels)—not a maze of separate mini-sites.

---

## 1) Home

**Why it exists:** Help a new visitor answer “What is this?”, “Is it for me?”, and “What do I do first?” in a few calm minutes.

**What people can do here:**

- See **who it’s for** (for example: busy adults leveling up skills for work or interviews).
- Read the **Sherpa idea** in plain words—guided practice, not being judged.
- See **how a typical session works**: pick a path → open an exercise → try a solution → check it → ask the guide → see a simple picture if it helps → save progress.
- Press **Start** (if they’re ready) or **Get set up** (if they need to connect things first).
- Optionally read longer explanations elsewhere (for example a simple help area), linked in everyday language—not required as its own page on day one.

Avoid technical jargon on this page; keep it welcoming.

---

## 2) Setup

**Why it exists:** One place to **get everything working** before learning starts, and to **fix** things when something breaks.

**What people can do here:**

- Connect the **helper** (the tool that answers questions and builds exercises)—in human terms, not installer jargon.
- Connect **where their work is saved** if the product uses an online project or folder they own (explained as “your journal” or “your practice folder,” depending on product decisions).
- Choose **simple preferences**: for example the language they use for exercises, if that matters.
- Turn on **safety choices**: for example “ask me before running a check” or “ask me before saving big changes,” if the product offers that.
- See a **clear status**: all good, or what’s wrong, with **next steps in plain English** (“We couldn’t reach your folder—try this…”).

When setup looks healthy, the page should **point them straight to Your learning space**.

---

## 3) Your learning space

**Why it exists:** This is where people **actually learn**. One page should hold the full loop so focus stays on practice, not navigation.

### Always visible (top or edge of the page)

- **What’s happening now**—working, waiting, done, or something needs attention.
- **Continue**—jump back to where they left off.
- **At a glance**: which path they’re on, roughly how far along, last time they practiced, and a gentle nudge for “what’s next.”
- If something in Setup is broken, a **short message** that sends them back to fix it—no dead ends.

### Path and exercises (usually a side column)

- See **all their learning paths** and how far each has gone.
- **Start a new path** from here (a small form: goal, time per day, what they want to focus on)—without leaving the page.
- Browse **topics** and see which are done, in progress, or not started.
- Ask for a **plain-language explanation** of a topic when they need it.
- Pick an **exercise** and see its status at a glance.

### Main exercise area (center)

- Read the **exercise** clearly: what to do, examples, and rules.
- Buttons for the core loop, in everyday words where possible—for example **Get a starter layout**, **Save my answer**, **Check my answer**, **Save my progress** (or an equivalent that matches the real product behavior).
- A place to **write or edit** their solution.
- A place to **see the checks** the product uses (even if read-only), so they understand what “correct” means.
- **Results** of the last check—in plain language: working or not, with enough detail to improve.

### Guide (help alongside the exercise)

- A **conversation** tied to *this* exercise, so the guide remembers context.
- Helpful actions in normal speech: **a small hint**, **explain what went wrong**, **break the next step into smaller pieces**.

### Pictures (“see how it works”)

- When a picture helps—steps, order, comparisons—show it **next to** the guide or the exercise, not on a separate page.
- Let them **look back** at earlier pictures for the same exercise if they asked more than once.

### Progress details (optional drawer or pop-over)

- Deeper view of **how they’re doing over time**: finished exercises, topics they find harder, simple encouragement.
- This should **not** require another website area—keep it as an extra layer on the same page.

### When something is missing

- **No path yet:** invite them to create one, with a short explanation.
- **No exercise picked:** gently choose a sensible next exercise or ask them to pick one.
- **Setup not finished:** clear message and a button back to **Setup**.

---

## Quality bar (what “ready for real users” means)

Across all three pages:

- People always know **what’s happening** (working, success, problem) in friendly language.
- **Empty states** feel helpful (“Nothing here yet—start here”) instead of blank or scary.
- Error messages say **what to try next**, not only that something failed.
- The experience works for people using **keyboard or assistive tools** where possible—not only mouse users.
- The learning page stays **one home** for practice; Setup stays **one home** for fixing connections.

---

## How the three pages work together

1. **Home** builds trust and points people to **Setup** or **Your learning space**.
2. **Setup** makes sure connections and preferences work, then sends people to **Your learning space**.
3. **Your learning space** carries almost all features: path, exercises, guide, pictures, and progress—so learners rarely need to hunt for the “right” page.
