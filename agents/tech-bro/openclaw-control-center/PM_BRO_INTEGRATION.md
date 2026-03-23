# PM-Bro ↔ Control Center Integration

**For tech-bro** — build instructions for the Projects tab.
**Full spec lives at:** `/projects/PM_SYSTEM.md` — treat that as the source of truth.

---

## What's Changing

Two things to build:

1. **New 5-column pipeline** — replaces the current 4 columns
2. **Extended project cards** — new fields pm-bro writes, cards need to show

---

## Change 1 — New Pipeline (5 columns)

Replace the current `planned / active / next / backlog` with:

```
idea → planned → in-progress → verify → done
```

### TypeScript type update

```typescript
type ColumnId = 'idea' | 'planned' | 'in-progress' | 'verify' | 'done'
```

### COLUMN_CONFIG update

```typescript
const COLUMN_CONFIG: Record<ColumnId, {...}> = {
  idea: {
    label: 'Ideas',
    icon: Lightbulb,
    accent: 'border-zinc-500/40 text-zinc-400',
    statsColor: 'text-zinc-400',
    emptyText: 'No ideas yet.',
  },
  planned: {
    label: 'Planned',
    icon: ListChecks,
    accent: 'border-sky-500/40 text-sky-400',
    statsColor: 'text-sky-400',
    emptyText: 'No planned projects.',
  },
  'in-progress': {
    label: 'In Progress',
    icon: Zap,
    accent: 'border-green-500/40 text-green-400',
    statsColor: 'text-green-400',
    emptyText: 'Nothing in progress.',
  },
  verify: {
    label: 'Verify',
    icon: CheckCircle,
    accent: 'border-amber-500/40 text-amber-400',
    statsColor: 'text-amber-400',
    emptyText: 'Nothing to verify.',
  },
  done: {
    label: 'Done',
    icon: Archive,
    accent: 'border-violet-500/40 text-violet-400',
    statsColor: 'text-violet-400',
    emptyText: 'Nothing done yet.',
  },
}
```

### CONTROL.md section mapping

Update the parser to map CONTROL.md section headers → new statuses:

| CONTROL.md section | Status |
|--------------------|--------|
| `## Ideas` | `idea` |
| `## Planned` | `planned` |
| `## In Progress` | `in-progress` |
| `## Verify` | `verify` |
| `## Done` | `done` |

Old sections (`Now`, `Next`, `Later`, `Backlog`) should still parse gracefully for backwards compatibility — map them to the closest new status:
- `Now` → `in-progress`
- `Next` / `Planned` → `planned`
- `Later` / `Backlog` → `idea`

---

## Change 2 — Extended Project Cards

### Updated TypeScript interface

```typescript
export interface WorkspaceProject {
  id: string
  name: string
  category: string
  status: 'idea' | 'planned' | 'in-progress' | 'verify' | 'done'
  priority?: 'critical' | 'high' | 'medium' | 'low'
  effort?: 'xs' | 's' | 'm' | 'l' | 'xl'
  agent?: string
  blocked?: boolean
  statusNotes?: string
  lastUpdate?: string
  description: string
  implementationSteps: { text: string; done: boolean }[]
  keyFeatures: string[]
  notes: string[]
  source?: string
  whyItMatters?: string
}
```

### Parser update — `parseRegisterMd()`

Add extraction for new header fields alongside existing `category` / `source`:

```typescript
const priorityMatch = line.match(/\*\*Priority:\*\*\s*(.+)/)
if (priorityMatch) { priority = priorityMatch[1].trim() as any; continue }

const effortMatch = line.match(/\*\*Effort:\*\*\s*(.+)/)
if (effortMatch) { effort = effortMatch[1].trim() as any; continue }

const agentMatch = line.match(/\*\*Agent:\*\*\s*(.+)/)
if (agentMatch) { agent = agentMatch[1].trim(); continue }

const statusNotesMatch = line.match(/\*\*Status notes:\*\*\s*(.+)/)
if (statusNotesMatch) { statusNotes = statusNotesMatch[1].trim(); continue }

const blockedMatch = line.match(/\*\*Blocked:\*\*\s*true/i)
if (blockedMatch) { blocked = true; continue }
```

Add Implementation Steps section parsing:

```typescript
if (line.startsWith('### Implementation Steps')) { currentSection = 'steps'; continue }

// In section content handler:
if (currentSection === 'steps') {
  const stepMatch = trimmed.match(/^-\s+\[(x| )\]\s+(.+)/i)
  if (stepMatch) {
    implementationSteps.push({ done: stepMatch[1].toLowerCase() === 'x', text: stepMatch[2] })
  }
}
```

---

## Change 3 — Card UI

### Collapsed card — add badges after CategoryBadge

```tsx
// Priority badge
const priorityColors = {
  critical: 'bg-red-500/15 text-red-400 border border-red-500/30',
  high:     'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  medium:   'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  low:      'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30',
}

// Effort badge labels + colours
const effortConfig = {
  xs: { label: 'XS', cls: 'bg-green-500/15 text-green-400 border border-green-500/30' },
  s:  { label: 'S',  cls: 'bg-teal-500/15 text-teal-400 border border-teal-500/30' },
  m:  { label: 'M',  cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
  l:  { label: 'L',  cls: 'bg-violet-500/15 text-violet-400 border border-violet-500/30' },
  xl: { label: 'XL', cls: 'bg-purple-500/15 text-purple-400 border border-purple-500/30' },
}

// Agent badge colours
const agentColors: Record<string, string> = {
  'tech-bro':    'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
  'finance-bro': 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  'pm-bro':      'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  'joe':         'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  'health-bro':  'bg-pink-500/15 text-pink-400 border border-pink-500/30',
  'career-bro':  'bg-sky-500/15 text-sky-400 border border-sky-500/30',
}
```

Show a 🔴 `Blocked` badge in red if `project.blocked === true`.

### Expanded card — Implementation Steps section

Add above Key Features:

```tsx
{project.implementationSteps.length > 0 && (
  <div>
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
      Steps
      <span className="ml-2 text-muted-foreground/60">
        {project.implementationSteps.filter(s => s.done).length}/{project.implementationSteps.length}
      </span>
    </p>
    <ul className="space-y-1">
      {project.implementationSteps.map((step, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={step.done}
            onChange={() => toggleStep(project.name, i, !step.done)}
            className="mt-0.5 accent-primary cursor-pointer"
          />
          <span className={step.done ? 'line-through text-muted-foreground' : 'text-foreground/80'}>
            {step.text}
          </span>
        </li>
      ))}
    </ul>
  </div>
)}

{project.statusNotes && (
  <div>
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Status Notes</p>
    <p className="text-sm text-foreground/80 italic">{project.statusNotes}</p>
  </div>
)}
```

---

## Change 4 — Step Toggle Endpoint

Create `/app/api/workspace-projects/step/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import fs from 'fs'

const REGISTER_MD = '/Users/alangewerc/.openclaw/workspace/projects/PROJECT_REGISTER.md'

export async function PATCH(request: Request) {
  const { projectName, stepIndex, done }: { projectName: string; stepIndex: number; done: boolean } = await request.json()

  let content = fs.readFileSync(REGISTER_MD, 'utf-8')

  const sectionRegex = new RegExp(
    `(## \\d+\\.\\s+${escapeRegex(projectName)}[\\s\\S]*?### Implementation Steps\\n)((?:- \\[[ x]\\] [^\\n]+\\n)*)`,
    'i'
  )
  const match = content.match(sectionRegex)
  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const steps = match[2].split('\n').filter(Boolean)
  if (stepIndex >= steps.length) return NextResponse.json({ error: 'Index out of range' }, { status: 400 })

  steps[stepIndex] = steps[stepIndex].replace(/\[[ x]\]/i, done ? '[x]' : '[ ]')
  content = content.replace(match[2], steps.join('\n') + '\n')
  fs.writeFileSync(REGISTER_MD, content, 'utf-8')

  return NextResponse.json({ success: true })
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
```

---

## Change 5 — Stats Bar

Update stats bar to show 5 columns + a global step progress line:

```tsx
// Below the 5 column stat cards:
<div className="text-xs text-muted-foreground text-center">
  {doneSteps}/{totalSteps} implementation steps complete
</div>
```

---

## Build Order (MVP)

1. 5-column pipeline + CONTROL.md parser update
2. Backwards-compatible old status mapping
3. Extended interface + parser for new fields
4. Card badges (collapsed)
5. Implementation steps + status notes (expanded)
6. Step toggle endpoint
7. Stats bar update

---

## Coordination

- pm-bro maintains `/projects/PM_SYSTEM.md` — the master spec
- If schema changes, pm-bro updates that file first then pings tech-bro
- Questions → #pm-bro on Discord

---

*Written by pm-bro | Updated: 2026-03-23*
