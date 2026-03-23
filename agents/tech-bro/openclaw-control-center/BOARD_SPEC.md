# Board Spec — Ideas Board + Work Board

**From pm-bro | For tech-bro**
This spec replaces the current Projects tab with two distinct views.

---

## Mental Model

```
Ideas Board  →  requirements session  →  Work Board
(raw ideas)      (pm-bro + Alan)         (real tasks)
```

- **Ideas Board** — where raw project ideas live. No tasks, no assignments.
- **Work Board** — where actual work happens. Only tasks that came out of a requirements session appear here.

Nothing moves from Ideas → Work Board without a BRIEF.md. pm-bro is the gate.

---

## Navigation

Add two entries to the sidebar:

```
💡 Ideas        → /ideas
📋 Board        → /board
```

The current `/projects` page becomes `/ideas`.
The work board is a new page at `/board`.

Optional: keep `/projects/{id}` as a project detail page (see below).

---

## View 1 — Ideas Board (`/ideas`)

### Purpose
Capture and display all raw project ideas. Simple, low-noise. No task data.

### Layout
Simple card grid or table — not a kanban. Ideas don't have workflow stages.

Each idea card shows:
- Project name
- Category badge (OpenClaw / Personal)
- Date added
- One-line description (truncated)
- **"Requirements needed"** label — always shown, since ideas haven't been briefed

### Sorting
Default: newest first. Allow sort by category.

### No drag and drop
Ideas don't move between columns — they either stay as ideas or graduate to the Work Board after a requirements session. pm-bro handles that transition by writing the BRIEF.md and creating tasks.

### Data source
Read from `PROJECT_REGISTER.md` — show only projects with `status: 'idea'`.

### Add idea button
Simple form: name + one-line description → appends to PROJECT_REGISTER.md + CONTROL.md via API.

---

## View 2 — Work Board (`/board`)

### Purpose
The execution view. Shows tasks (stories) as cards across a kanban pipeline. Only tasks from projects that have a BRIEF.md appear here.

### Columns

```
planned  |  in-progress  |  verify  |  done
```

| Column | Meaning |
|--------|---------|
| `planned` | Task is ready to be picked up — dependencies met |
| `in-progress` | Agent has picked it up and is working |
| `verify` | Agent marked done — waiting for Alan to review |
| `done` | Alan signed off |

**No "idea" column on the Work Board.** Ideas never appear here.

### Card — Task (Story)

Each card represents one **task**, not a project. Cards show:

**Collapsed:**
```
[Epic Badge: Personal Finance Tracker]
T001 — Build expense tracking API
[tech-bro]  [M]  [high]  [2/5 subtasks]
```

- Epic badge (project name) — coloured by project or category
- Task ID + Task name
- Agent badge
- Effort badge (XS / S / M / L / XL)
- Priority badge (critical / high / medium / low)
- Subtask progress pill (e.g. `2/5`)
- 🔴 Blocked badge if blocked

**Expanded (click to expand):**
- Full task description
- Subtask checklist (checkboxes — interactive)
- Acceptance criteria
- Dependencies (e.g. "depends on T002")
- Agent notes / completion note (written by agent when marking done)
- Link to full project: "View project →"

### Drag and drop
Tasks can be dragged between `planned → in-progress → verify → done`.

On drag:
- Updates `TASK_BOARD.md` — changes task status
- Adds entry to Quick Log in `CONTROL.md`

Agents also update task status themselves (via file writes) — the board reflects that on refresh.

### Filtering
- Filter by **Epic** (project name)
- Filter by **Agent**
- Filter by **Priority**

Default: show all active projects, all agents.

### Stats bar (top of board)
```
[12 planned]  [4 in-progress]  [2 verify]  [28 done]
Progress: ████████░░░░  18/46 tasks complete
```

---

## Data Model

### Task structure (in TASK_BOARD.md)

pm-bro writes tasks to `/projects/TASK_BOARD.md` in this format:

```markdown
## Active Tasks

| ID | Task | Project | Agent | Effort | Priority | Status | Depends On | Added |
|----|------|---------|-------|--------|----------|--------|------------|-------|
| T001 | Build expense tracking API | Personal Finance Tracker | tech-bro | M | high | planned | — | 2026-03-23 |
| T002 | Build frontend dashboard | Personal Finance Tracker | tech-bro | L | high | waiting | T001 | 2026-03-23 |
| T003 | Deploy to AWS | Personal Finance Tracker | tech-bro | S | medium | waiting | T002 | 2026-03-23 |

## Completed Tasks

| ID | Task | Project | Agent | Completed | Notes |
|----|------|---------|-------|-----------|-------|
```

### Subtask structure (in TASK_BOARD.md, under each task)

```markdown
### T001 — Build expense tracking API
**Description:** Create REST API endpoints for expense CRUD operations.
**Acceptance:** All endpoints return correct data, error handling in place, tests pass.
**Blocked:** false
**Agent note:** —

**Subtasks:**
- [x] Set up Express router
- [x] Create expense model
- [ ] Add auth middleware
- [ ] Write error handling
- [ ] Write tests
```

### TypeScript interfaces

```typescript
type TaskStatus = 'planned' | 'in-progress' | 'verify' | 'done' | 'waiting' | 'blocked'
type Priority = 'critical' | 'high' | 'medium' | 'low'
type Effort = 'xs' | 's' | 'm' | 'l' | 'xl'

interface Subtask {
  text: string
  done: boolean
}

interface Task {
  id: string                  // T001, T002, etc.
  name: string
  projectName: string         // Epic name — links to project
  agent: string
  effort: Effort
  priority: Priority
  status: TaskStatus
  dependsOn: string[]         // Task IDs this is blocked by
  description?: string
  acceptanceCriteria?: string
  blocked: boolean
  agentNote?: string          // Written by agent on completion
  subtasks: Subtask[]
  added: string               // ISO date
}

interface ProjectIdea {
  id: string
  name: string
  category: string
  description: string
  lastUpdate?: string
  // No tasks, no assignments — ideas are pre-requirements
}
```

---

## API Endpoints

### GET /api/tasks
Returns all tasks from TASK_BOARD.md, grouped by status column.

```typescript
// Response
{
  tasks: Task[]
  planned: Task[]
  inProgress: Task[]
  verify: Task[]
  done: Task[]
  stats: {
    total: number
    planned: number
    inProgress: number
    verify: number
    done: number
    totalSubtasks: number
    doneSubtasks: number
  }
}
```

### PATCH /api/tasks
Move a task to a new status column. Updates TASK_BOARD.md.

```typescript
// Request
{ taskId: string; newStatus: TaskStatus }
```

### PATCH /api/tasks/subtask
Toggle a subtask done/undone. Updates TASK_BOARD.md.

```typescript
// Request
{ taskId: string; subtaskIndex: number; done: boolean }
```

### GET /api/ideas
Returns all projects with `status: 'idea'` from PROJECT_REGISTER.md + CONTROL.md.

### POST /api/ideas
Add a new idea. Appends to PROJECT_REGISTER.md + CONTROL.md.

```typescript
// Request
{ name: string; description: string; category: 'OpenClaw' | 'Personal' }
```

---

## Project Detail Page (`/projects/{id}`) — optional but recommended

A full project view when you click "View project →" from a task card.

Shows:
- Project name, category, priority, effort, agent
- Status (current pipeline stage)
- Problem statement + success criteria (from BRIEF.md)
- MVP scope — in scope / out of scope
- Full task list with status and subtask progress
- Quick Log entries for this project

Data source: reads the project's `BRIEF.md` + filters TASK_BOARD.md by project name.

---

## File Responsibilities

| File | Written by | Read by |
|------|-----------|---------|
| `CONTROL.md` | pm-bro + app | app |
| `PROJECT_REGISTER.md` | pm-bro | app (ideas board) |
| `TASK_BOARD.md` | pm-bro + agents + app | app (work board) + agents |
| `active/{id}/BRIEF.md` | pm-bro | app (project detail) |
| `AGENT_LOGS.md` | agents | pm-bro (hourly review) |

---

## Build Order (MVP)

**Phase 1 — Ideas Board**
1. Rename current `/projects` → `/ideas`
2. Simplify to card grid (remove kanban from ideas)
3. Filter to only show `status: 'idea'` projects
4. Add idea via simple form

**Phase 2 — Work Board**
1. New page `/board`
2. Parse TASK_BOARD.md → GET /api/tasks
3. 4-column kanban (planned / in-progress / verify / done)
4. Task cards with epic badge, agent, effort, priority, subtask progress
5. Drag and drop → PATCH /api/tasks
6. Subtask toggle → PATCH /api/tasks/subtask
7. Filter by epic / agent / priority

**Phase 3 — Project Detail** *(post-MVP)*
1. `/projects/{id}` page
2. Read BRIEF.md
3. Show full task list

---

## What pm-bro Will Do

Once the Work Board is live:
- After each requirements session → writes tasks to TASK_BOARD.md
- Hourly review → reads AGENT_LOGS.md → unlocks waiting tasks → posts Discord update
- Moving tasks between columns in TASK_BOARD.md (agents also do this themselves)

The app just reflects the file state. Always.

---

*Written by pm-bro | 2026-03-23*
