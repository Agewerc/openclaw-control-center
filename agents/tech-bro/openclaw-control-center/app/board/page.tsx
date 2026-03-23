'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverlay,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, ChevronDown, ChevronUp, RefreshCw,
  Zap, CheckCircle, Archive, ListChecks, Search, Filter, CheckCircle2,
} from 'lucide-react'

type TaskStatus = 'planned' | 'in-progress' | 'verify' | 'done'
type Priority = 'critical' | 'high' | 'medium' | 'low'
type Effort = 'xs' | 's' | 'm' | 'l' | 'xl'

interface Subtask { text: string; done: boolean }

interface CompletionNote {
  agent: string
  timestamp: string
  note: string
}

interface Task {
  id: string
  name: string
  projectName: string
  agent: string
  effort: Effort
  priority: Priority
  status: TaskStatus
  dependsOn: string[]
  description?: string
  acceptanceCriteria?: string
  blocked: boolean
  agentNote?: string
  subtasks: Subtask[]
  added: string
  completionNote?: CompletionNote
}

// ── Config ────────────────────────────────────────────────────────────────────
const COLUMN_CONFIG: Record<TaskStatus, { label: string; icon: any; accent: string; statsColor: string }> = {
  planned:       { label: 'Planned',     icon: ListChecks,  accent: 'border-sky-500/40 text-sky-400',     statsColor: 'text-sky-400' },
  'in-progress': { label: 'In Progress', icon: Zap,         accent: 'border-green-500/40 text-green-400', statsColor: 'text-green-400' },
  verify:        { label: 'Verify',      icon: CheckCircle, accent: 'border-amber-500/40 text-amber-400', statsColor: 'text-amber-400' },
  done:          { label: 'Done',        icon: Archive,     accent: 'border-violet-500/40 text-violet-400', statsColor: 'text-violet-400' },
}

const priorityConfig: Record<Priority, { label: string; cls: string }> = {
  critical: { label: 'Critical', cls: 'bg-red-500/15 text-red-400 border border-red-500/30' },
  high:     { label: 'High',     cls: 'bg-orange-500/15 text-orange-400 border border-orange-500/30' },
  medium:   { label: 'Medium',   cls: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' },
  low:      { label: 'Low',      cls: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30' },
}

const effortConfig: Record<Effort, { label: string; cls: string }> = {
  xs: { label: 'XS', cls: 'bg-green-500/15 text-green-400 border border-green-500/30' },
  s:  { label: 'S',  cls: 'bg-teal-500/15 text-teal-400 border border-teal-500/30' },
  m:  { label: 'M',  cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
  l:  { label: 'L',  cls: 'bg-violet-500/15 text-violet-400 border border-violet-500/30' },
  xl: { label: 'XL', cls: 'bg-purple-500/15 text-purple-400 border border-purple-500/30' },
}

const agentColors: Record<string, string> = {
  'tech-bro':    'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
  'finance-bro': 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  'pm-bro':      'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  'joe':         'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  'health-bro':  'bg-pink-500/15 text-pink-400 border border-pink-500/30',
  'career-bro':  'bg-sky-500/15 text-sky-400 border border-sky-500/30',
}

// epic colours — rotate through a palette
const epicPalette = [
  'bg-pink-500/15 text-pink-400 border border-pink-500/30',
  'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
  'bg-teal-500/15 text-teal-400 border border-teal-500/30',
  'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
]
const epicColorMap = new Map<string, string>()
let epicColorIdx = 0
function epicColor(name: string) {
  if (!epicColorMap.has(name)) {
    epicColorMap.set(name, epicPalette[epicColorIdx % epicPalette.length])
    epicColorIdx++
  }
  return epicColorMap.get(name)!
}

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded-full font-medium border ${cls}`}>{children}</span>
}

// ── Task card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onSubtaskToggle }: {
  task: Task; onSubtaskToggle: (id: string, idx: number, done: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const doneSubs = task.subtasks.filter(s => s.done).length
  const totalSubs = task.subtasks.length

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors select-none"
    >
      <div className="flex items-start gap-2 p-3">
        <button {...attributes} {...listeners}
          className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 touch-none"
          onClick={e => e.stopPropagation()}>
          <GripVertical size={13} />
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(v => !v)}>
          {/* Epic badge */}
          <div className="mb-1.5">
            <Badge cls={epicColor(task.projectName)}>{task.projectName}</Badge>
          </div>
          {/* Task ID + name */}
          <p className="font-semibold text-sm leading-snug mb-1.5">
            <span className="font-mono text-xs text-muted-foreground mr-1.5">{task.id}</span>
            {task.name}
          </p>
          {/* Badges row */}
          <div className="flex items-center gap-1 flex-wrap">
            {task.agent && <Badge cls={agentColors[task.agent] || 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30'}>{task.agent}</Badge>}
            {task.effort && <Badge cls={effortConfig[task.effort]?.cls || ''}>{effortConfig[task.effort]?.label}</Badge>}
            {task.priority && <Badge cls={priorityConfig[task.priority]?.cls || ''}>{priorityConfig[task.priority]?.label}</Badge>}
            {task.blocked && <Badge cls="bg-red-500/20 text-red-400 border border-red-500/40">🔴 Blocked</Badge>}
            {totalSubs > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">{doneSubs}/{totalSubs}</span>
            )}
          </div>
          {/* Subtask progress bar */}
          {totalSubs > 0 && (
            <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full transition-all"
                style={{ width: `${(doneSubs / totalSubs) * 100}%` }} />
            </div>
          )}
        </div>

        <button className="text-muted-foreground shrink-0 mt-0.5" onClick={() => setExpanded(v => !v)}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {task.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-foreground/80">{task.description}</p>
            </div>
          )}
          {task.acceptanceCriteria && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Acceptance</p>
              <p className="text-sm text-foreground/80">{task.acceptanceCriteria}</p>
            </div>
          )}
          {task.subtasks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Subtasks <span className="font-normal text-muted-foreground/60">{doneSubs}/{totalSubs}</span>
              </p>
              <ul className="space-y-1.5">
                {task.subtasks.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={s.done}
                      onChange={() => onSubtaskToggle(task.id, i, !s.done)}
                      className="mt-0.5 accent-primary cursor-pointer shrink-0" />
                    <span className={s.done ? 'line-through text-muted-foreground' : 'text-foreground/80'}>{s.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {task.dependsOn.length > 0 && (
            <p className="text-xs text-muted-foreground">Depends on: {task.dependsOn.join(', ')}</p>
          )}
          {task.agentNote && !task.completionNote && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Agent note</p>
              <p className="text-sm text-foreground/70 italic">{task.agentNote}</p>
            </div>
          )}
          {task.completionNote && (
            <div className="border border-green-500/30 bg-green-500/5 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={13} className="text-green-400 shrink-0" />
                <span className="text-xs font-semibold text-green-400">
                  Completed by {task.completionNote.agent}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">{task.completionNote.timestamp}</span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed pl-5">
                "{task.completionNote.note}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────
function Column({ id, tasks, onSubtaskToggle }: {
  id: TaskStatus; tasks: Task[]
  onSubtaskToggle: (id: string, idx: number, done: boolean) => void
}) {
  const cfg = COLUMN_CONFIG[id]
  const Icon = cfg.icon
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div ref={setNodeRef} className={`flex flex-col gap-2 rounded-xl p-3 border transition-colors min-h-40 ${
      isOver ? 'bg-primary/5 border-primary/40' : 'bg-background/30 border-border/50'
    }`}>
      <div className={`flex items-center gap-2 pb-2 border-b ${cfg.accent}`}>
        <Icon size={14} />
        <span className="font-semibold text-xs uppercase tracking-wide">{cfg.label}</span>
        <span className="ml-auto text-xs font-mono bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{tasks.length}</span>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {tasks.length === 0 ? (
            <p className={`text-xs text-muted-foreground italic px-2 py-6 text-center border border-dashed rounded-lg transition-colors ${
              isOver ? 'border-primary/40 text-primary/60' : 'border-border/40'
            }`}>{isOver ? 'Drop here' : 'Empty'}</p>
          ) : (
            tasks.map(t => <TaskCard key={t.id} task={t} onSubtaskToggle={onSubtaskToggle} />)
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ── Main board ────────────────────────────────────────────────────────────────
export default function BoardPage() {
  const [columns, setColumns] = useState<Record<TaskStatus, Task[]>>({
    planned: [], 'in-progress': [], verify: [], done: [],
  })
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [search, setSearch] = useState('')
  const [epicFilter, setEpicFilter] = useState('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  async function load() {
    try {
      const [tasksRes, logsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/agent-logs?action=completed&limit=100'),
      ])
      const tasksJson = await tasksRes.json()
      const logsJson  = await logsRes.json()

      // Build a map of taskId → latest completion entry
      const completionMap = new Map<string, CompletionNote>()
      for (const entry of (logsJson.entries || [])) {
        if (entry.taskId && !completionMap.has(entry.taskId)) {
          completionMap.set(entry.taskId, {
            agent: entry.agent,
            timestamp: entry.timestamp,
            note: entry.note,
          })
        }
      }

      // Attach completionNote to tasks
      const enrich = (tasks: Task[]) =>
        tasks.map(t => ({
          ...t,
          completionNote: completionMap.get(t.id),
        }))

      setColumns({
        planned:       enrich(tasksJson.planned || []),
        'in-progress': enrich(tasksJson.inProgress || []),
        verify:        enrich(tasksJson.verify || []),
        done:          enrich(tasksJson.done || []),
      })
      setAllTasks(enrich(tasksJson.tasks || []))
      setStats(tasksJson.stats || {})
    } catch { /* */ }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const findTask = useCallback((id: string) => allTasks.find(t => t.id === id) ?? null, [allTasks])
  const findCol = useCallback((taskId: string): TaskStatus | null => {
    for (const col of Object.keys(columns) as TaskStatus[])
      if (columns[col].some(t => t.id === taskId)) return col
    return null
  }, [columns])
  const isColId = (id: string): id is TaskStatus => Object.keys(COLUMN_CONFIG).includes(id)

  const onDragStart = ({ active }: DragStartEvent) => setActiveTask(findTask(active.id as string))

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    if (!over) return
    const taskId = active.id as string
    const overId = over.id as string
    const srcCol = findCol(taskId)
    const dstCol: TaskStatus | null = isColId(overId) ? overId : findCol(overId)
    if (!srcCol || !dstCol || srcCol === dstCol) return

    const task = findTask(taskId)
    if (!task) return

    setColumns(prev => ({
      ...prev,
      [srcCol]: prev[srcCol].filter(t => t.id !== taskId),
      [dstCol]: [...prev[dstCol], { ...task, status: dstCol }],
    }))

    setSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, newStatus: dstCol }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setColumns(prev => ({
        ...prev,
        [dstCol]: prev[dstCol].filter(t => t.id !== taskId),
        [srcCol]: [...prev[srcCol], task],
      }))
      alert('Failed to save — reverted.')
    } finally { setSaving(false) }
  }

  const onSubtaskToggle = async (taskId: string, subtaskIndex: number, done: boolean) => {
    // Optimistic update
    const update = (tasks: Task[]) => tasks.map(t => {
      if (t.id !== taskId) return t
      const subs = [...t.subtasks]
      subs[subtaskIndex] = { ...subs[subtaskIndex], done }
      return { ...t, subtasks: subs }
    })
    setColumns(prev => ({
      planned: update(prev.planned),
      'in-progress': update(prev['in-progress']),
      verify: update(prev.verify),
      done: update(prev.done),
    }))
    setAllTasks(prev => update(prev))

    try {
      const res = await fetch('/api/tasks/subtask', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, subtaskIndex, done }),
      })
      if (!res.ok) throw new Error()
    } catch { load() }
  }

  const filter = (tasks: Task[]) => tasks.filter(t => {
    const ms = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase())
    const me = epicFilter === 'all' || t.projectName === epicFilter
    const ma = agentFilter === 'all' || t.agent === agentFilter
    const mp = priorityFilter === 'all' || t.priority === priorityFilter
    return ms && me && ma && mp
  })

  const epics = [...new Set(allTasks.map(t => t.projectName))]
  const agents = [...new Set(allTasks.map(t => t.agent))]
  const colIds = Object.keys(COLUMN_CONFIG) as TaskStatus[]

  const totalSubs = Object.values(columns).flat().reduce((n, t) => n + t.subtasks.length, 0)
  const doneSubs  = Object.values(columns).flat().reduce((n, t) => n + t.subtasks.filter(s => s.done).length, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Work Board</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Active tasks from briefed projects · drag to move · synced to <code className="text-xs bg-muted px-1 py-0.5 rounded">TASK_BOARD.md</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>}
          <button onClick={() => { setRefreshing(true); load() }} disabled={refreshing}
            className="btn btn-outline flex items-center gap-2 text-sm">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-2">
          {colIds.map(col => (
            <div key={col} className="card py-3 text-center">
              <p className={`text-2xl font-bold ${COLUMN_CONFIG[col].statsColor}`}>{columns[col].length}</p>
              <p className="text-xs text-muted-foreground mt-1">{COLUMN_CONFIG[col].label}</p>
            </div>
          ))}
        </div>
        {totalSubs > 0 && (
          <div className="card py-2 px-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full transition-all"
                style={{ width: `${(doneSubs / totalSubs) * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{doneSubs}/{totalSubs} subtasks complete</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input type="text" placeholder="Search tasks…"
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Filter size={14} className="text-muted-foreground shrink-0" />
        <select value={epicFilter} onChange={e => setEpicFilter(e.target.value)}
          className="px-2 py-1.5 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All epics</option>
          {epics.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
          className="px-2 py-1.5 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All agents</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
          className="px-2 py-1.5 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-muted-foreground">Loading board…</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-start">
            {colIds.map(col => (
              <Column key={col} id={col} tasks={filter(columns[col])} onSubtaskToggle={onSubtaskToggle} />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="bg-card border border-primary/60 rounded-lg p-3 shadow-2xl rotate-1 scale-105 opacity-95 max-w-xs">
                <Badge cls={epicColor(activeTask.projectName)}>{activeTask.projectName}</Badge>
                <p className="font-semibold text-sm mt-1.5">
                  <span className="font-mono text-xs text-muted-foreground mr-1">{activeTask.id}</span>
                  {activeTask.name}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
