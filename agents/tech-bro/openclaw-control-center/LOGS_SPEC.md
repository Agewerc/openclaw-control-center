# Logs Spec — Agent Activity Feed

**From pm-bro | For tech-bro**

---

## Goal

Full transparency on what every agent has done — a live activity feed visible in the app. No more digging through files.

---

## Data Source

`/projects/AGENT_LOGS.md` — agents write structured entries here on every significant action.

---

## AGENT_LOGS.md Format

Each entry follows this exact structure so the app can parse it reliably:

```markdown
---
**ID:** LOG-001
**Timestamp:** 2026-03-23 14:30
**Agent:** tech-bro
**Action:** completed
**Task:** T001
**Project:** Personal Finance Tracker
**Note:** Parser extended, all 5 fields extracting correctly. Tests pass. T002 is now unblocked.
---

---
**ID:** LOG-002
**Timestamp:** 2026-03-23 13:15
**Agent:** tech-bro
**Action:** started
**Task:** T001
**Project:** Personal Finance Tracker
**Note:** Picking up task. Reviewing existing parser code first.
---
```

### Action types

| Action | Meaning |
|--------|---------|
| `started` | Agent picked up a task |
| `completed` | Agent finished a task |
| `blocked` | Agent hit a blocker |
| `note` | Agent added a progress update mid-task |
| `created` | pm-bro created tasks for a project |
| `reviewed` | pm-bro completed hourly review |
| `unblocked` | pm-bro unlocked a waiting task |

---

## TypeScript Interface

```typescript
type LogAction = 'started' | 'completed' | 'blocked' | 'note' | 'created' | 'reviewed' | 'unblocked'

interface AgentLogEntry {
  id: string           // LOG-001
  timestamp: string    // ISO or YYYY-MM-DD HH:mm
  agent: string        // tech-bro, pm-bro, joe, etc.
  action: LogAction
  taskId?: string      // T001 — optional (some actions are project-level)
  projectName?: string
  note: string
}
```

---

## API Endpoint

### GET /api/agent-logs

Parse `AGENT_LOGS.md` and return entries newest-first.

```typescript
// Query params (all optional)
?agent=tech-bro
?project=Personal Finance Tracker
?action=completed
?limit=50

// Response
{
  entries: AgentLogEntry[]
  total: number
}
```

---

## View 1 — Logs Tab (`/logs`)

Full activity feed. Newest first.

### Layout

Header:
```
Agent Logs                              [Filter by agent ▾] [Filter by project ▾]
Live feed of all agent activity
```

Feed rows:
```
● 14:30  ✅ completed   tech-bro    T001 — Build expense API        Personal Finance Tracker
         "Parser extended, all 5 fields extracting correctly. T002 now unblocked."

● 13:15  🔄 started     tech-bro    T001 — Build expense API        Personal Finance Tracker
         "Picking up task. Reviewing existing parser code first."

● 12:00  📋 created     pm-bro      T001, T002, T003 created        Personal Finance Tracker
         "Requirements session complete. 3 tasks created and sequenced."
```

### Row design

Each row:
- Timestamp (relative: "2 hours ago" on hover shows exact)
- Action icon + coloured label
- Agent badge (coloured by agent)
- Task ID + task name (if applicable)
- Project name in muted text
- Note on second line, indented, smaller text

### Action colours

| Action | Icon | Colour |
|--------|------|--------|
| completed | ✅ | green |
| started | 🔄 | blue |
| blocked | 🚫 | red |
| note | 💬 | zinc |
| created | 📋 | violet |
| reviewed | 🔍 | amber |
| unblocked | 🔓 | teal |

---

## View 2 — Completion Note on Task Card (Work Board)

When a task has `action: completed` in the logs, show it inline in the expanded task card:

```
─────────────────────────────────────
✅ Completed by tech-bro — 23 Mar 14:30
"Parser extended, all 5 fields extracting correctly. 
 Tests pass. T002 is now unblocked."
─────────────────────────────────────
```

Pull this by filtering AGENT_LOGS entries where `taskId === task.id && action === 'completed'` — take the most recent one.

---

## Build Order

1. `GET /api/agent-logs` — parse AGENT_LOGS.md
2. `/logs` page — full activity feed with filters
3. Completion note on task card (Work Board) — pull from logs API

---

## Notes

- Create `AGENT_LOGS.md` at `/projects/AGENT_LOGS.md` if it doesn't exist — app should handle gracefully
- pm-bro will also write to this file (for `created`, `reviewed`, `unblocked` actions)
- Agents write to it directly during task execution
- Never delete entries — append only

---

*Written by pm-bro | 2026-03-23*
