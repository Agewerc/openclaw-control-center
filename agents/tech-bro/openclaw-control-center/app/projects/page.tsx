'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  DragOverlay, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  Search, ChevronDown, ChevronUp, Zap, Clock, Archive, Tag,
  ExternalLink, RefreshCw, ListChecks, GripVertical, Lightbulb,
  CheckCircle, AlertTriangle,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
type ColumnId = 'idea' | 'planned' | 'in-progress' | 'verify' | 'done'

interface Step { text: string; done: boolean }

interface WorkspaceProject {
  id: string
  name: string
  category: string
  status: ColumnId
  priority?: 'critical' | 'high' | 'medium' | 'low'
  effort?: 'xs' | 's' | 'm' | 'l' | 'xl'
  agent?: string
  blocked?: boolean
  statusNotes?: string
  lastUpdate?: string
  description: string
  implementationSteps: Step[]
  keyFeatures: string[]
  notes: string[]
  source?: string
}

interface ProjectData {
  projects: WorkspaceProject[]
  columns: Record<ColumnId, WorkspaceProject[]>
  stats: Record<string, number>
}

// ── Badge configs ─────────────────────────────────────────────────────────────
const categoryColors: Record<string, string> = {
  OpenClaw: 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  Personal: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  General:  'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30',
}

const priorityConfig = {
  critical: { label: 'Critical', cls: 'bg-red-500/15 text-red-400 border border-red-500/30' },
  high:     { label: 'High',     cls: 'bg-orange-500/15 text-orange-400 border border-orange-500/30' },
  medium:   { label: 'Medium',   cls: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' },
  low:      { label: 'Low',      cls: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30' },
}

const effortConfig = {
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

// ── Small badges ──────────────────────────────────────────────────────────────
function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium border ${cls}`}>{children}</span>
}

// ── Column config ─────────────────────────────────────────────────────────────
const COLUMN_CONFIG: Record<ColumnId, { label: string; icon: any; accent: string; statsColor: string; emptyText: string }> = {
  idea:          { label: 'Ideas',       icon: Lightbulb,    accent: 'border-zinc-500/40 text-zinc-400',   statsColor: 'text-zinc-400',   emptyText: 'No ideas yet.' },
  planned:       { label: 'Planned',     icon: ListChecks,   accent: 'border-sky-500/40 text-sky-400',     statsColor: 'text-sky-400',    emptyText: 'Nothing planned.' },
  'in-progress': { label: 'In Progress', icon: Zap,          accent: 'border-green-500/40 text-green-400', statsColor: 'text-green-400',  emptyText: 'Nothing in progress.' },
  verify:        { label: 'Verify',      icon: CheckCircle,  accent: 'border-amber-500/40 text-amber-400', statsColor: 'text-amber-400',  emptyText: 'Nothing to verify.' },
  done:          { label: 'Done',        icon: Archive,      accent: 'border-violet-500/40 text-violet-400',statsColor: 'text-violet-400', emptyText: 'Nothing done yet.' },
}

// ── Project card ──────────────────────────────────────────────────────────────
function ProjectCard({
  project, isDragging = false, onStepToggle,
}: {
  project: WorkspaceProject; isDragging?: boolean; onStepToggle: (name: string, idx: number, done: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortable } =
    useSortable({ id: project.id })

  const doneSteps = project.implementationSteps.filter(s => s.done).length
  const totalSteps = project.implementationSteps.length

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isSortable ? 0.35 : 1 }}
      className={`bg-card border rounded-lg overflow-hidden transition-colors select-none ${
        isDragging ? 'border-primary/60 shadow-2xl rotate-1 scale-105' : 'border-border hover:border-primary/30'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-2 p-3">
        <button {...attributes} {...listeners}
          className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 touch-none"
          onClick={e => e.stopPropagation()}>
          <GripVertical size={14} />
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(v => !v)}>
          {/* Badge row */}
          <div className="flex items-center gap-1 flex-wrap mb-1">
            <span className="text-xs font-mono text-muted-foreground">#{project.id}</span>
            <Badge cls={categoryColors[project.category] || categoryColors.General}>
              <Tag size={9} />{project.category}
            </Badge>
            {project.priority && (
              <Badge cls={priorityConfig[project.priority].cls}>
                {priorityConfig[project.priority].label}
              </Badge>
            )}
            {project.effort && (
              <Badge cls={effortConfig[project.effort].cls}>
                {effortConfig[project.effort].label}
              </Badge>
            )}
            {project.agent && (
              <Badge cls={agentColors[project.agent] || 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30'}>
                {project.agent}
              </Badge>
            )}
            {project.blocked && (
              <Badge cls="bg-red-500/20 text-red-400 border border-red-500/40">
                🔴 Blocked
              </Badge>
            )}
            {totalSteps > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">
                {doneSteps}/{totalSteps} steps
              </span>
            )}
          </div>

          <h3 className="font-semibold text-sm leading-snug">{project.name}</h3>

          {/* Step progress bar */}
          {totalSteps > 0 && (
            <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full transition-all"
                style={{ width: `${(doneSteps / totalSteps) * 100}%` }}
              />
            </div>
          )}

          {!expanded && project.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
          )}
        </div>

        <button className="text-muted-foreground shrink-0 mt-0.5" onClick={() => setExpanded(v => !v)}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {project.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-foreground/90">{project.description}</p>
            </div>
          )}

          {/* Status notes */}
          {project.statusNotes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Status Notes</p>
              <p className="text-sm text-foreground/80 italic border-l-2 border-amber-500/40 pl-2">{project.statusNotes}</p>
            </div>
          )}

          {/* Implementation steps */}
          {totalSteps > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Steps
                <span className="ml-2 text-muted-foreground/60 normal-case font-normal">
                  {doneSteps}/{totalSteps} done
                </span>
              </p>
              <ul className="space-y-1.5">
                {project.implementationSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={step.done}
                      onChange={() => onStepToggle(project.name, i, !step.done)}
                      className="mt-0.5 accent-primary cursor-pointer shrink-0"
                    />
                    <span className={step.done ? 'line-through text-muted-foreground' : 'text-foreground/80'}>
                      {step.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {project.keyFeatures.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Key Features</p>
              <ul className="space-y-1">
                {project.keyFeatures.map((f, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-primary mt-1 shrink-0">▸</span>
                    <span className="text-foreground/80">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {project.notes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
              <ul className="space-y-1">
                {project.notes.map((n, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">•</span><span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {project.source && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ExternalLink size={10} />{project.source}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────
function Column({ id, projects, onStepToggle }: {
  id: ColumnId; projects: WorkspaceProject[]
  onStepToggle: (name: string, idx: number, done: boolean) => void
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
        <span className="ml-auto text-xs font-mono bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{projects.length}</span>
      </div>

      <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {projects.length === 0 ? (
            <p className={`text-xs text-muted-foreground italic px-2 py-6 text-center border border-dashed rounded-lg transition-colors ${
              isOver ? 'border-primary/40 text-primary/60' : 'border-border/40'
            }`}>
              {isOver ? 'Drop here' : cfg.emptyText}
            </p>
          ) : (
            projects.map(p => <ProjectCard key={p.id} project={p} onStepToggle={onStepToggle} />)
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const [columns, setColumns] = useState<Record<ColumnId, WorkspaceProject[]>>({
    idea: [], planned: [], 'in-progress': [], verify: [], done: [],
  })
  const [allProjects, setAllProjects] = useState<WorkspaceProject[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [activeProject, setActiveProject] = useState<WorkspaceProject | null>(null)
  const [saving, setSaving] = useState(false)

  async function loadData() {
    try {
      const res = await fetch('/api/workspace-projects')
      if (!res.ok) throw new Error('Failed')
      const json: ProjectData = await res.json()
      setColumns(json.columns)
      setAllProjects(json.projects)
      setStats(json.stats)
      setError(null)
    } catch { setError('Could not load projects.') }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { loadData() }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const findCol = useCallback((id: string): ColumnId | null => {
    for (const col of Object.keys(columns) as ColumnId[])
      if (columns[col].some(p => p.id === id)) return col
    return null
  }, [columns])

  const findProject = useCallback((id: string) => allProjects.find(p => p.id === id) ?? null, [allProjects])
  const isColId = (id: string): id is ColumnId => Object.keys(COLUMN_CONFIG).includes(id)

  const onDragStart = ({ active }: DragStartEvent) => setActiveProject(findProject(active.id as string))
  const onDragOver = () => {}

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveProject(null)
    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string
    const srcCol = findCol(activeId)
    const dstCol: ColumnId | null = isColId(overId) ? overId : findCol(overId)
    if (!srcCol || !dstCol || srcCol === dstCol) return
    const project = findProject(activeId)
    if (!project) return

    // Optimistic update
    setColumns(prev => ({
      ...prev,
      [srcCol]: prev[srcCol].filter(p => p.id !== activeId),
      [dstCol]: [...prev[dstCol], { ...project, status: dstCol }],
    }))

    setSaving(true)
    try {
      const res = await fetch('/api/workspace-projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: project.name, newStatus: dstCol }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setColumns(prev => ({
        ...prev,
        [dstCol]: prev[dstCol].filter(p => p.id !== activeId),
        [srcCol]: [...prev[srcCol], project],
      }))
      alert('Failed to save — reverted.')
    } finally { setSaving(false) }
  }

  const onStepToggle = async (projectName: string, stepIndex: number, done: boolean) => {
    // Optimistic update
    setColumns(prev => {
      const updated = { ...prev }
      for (const col of Object.keys(updated) as ColumnId[]) {
        updated[col] = updated[col].map(p => {
          if (p.name !== projectName) return p
          const steps = [...p.implementationSteps]
          steps[stepIndex] = { ...steps[stepIndex], done }
          return { ...p, implementationSteps: steps }
        })
      }
      return updated
    })
    // Also update allProjects for drag overlay
    setAllProjects(prev => prev.map(p => {
      if (p.name !== projectName) return p
      const steps = [...p.implementationSteps]
      steps[stepIndex] = { ...steps[stepIndex], done }
      return { ...p, implementationSteps: steps }
    }))

    try {
      const res = await fetch('/api/workspace-projects/step', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, stepIndex, done }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Rollback
      loadData()
    }
  }

  const filter = (projects: WorkspaceProject[]) =>
    projects.filter(p => {
      const ms = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
      const mc = categoryFilter === 'all' || p.category === categoryFilter
      return ms && mc
    })

  const categories = [...new Set(allProjects.map(p => p.category))]
  const colIds = Object.keys(COLUMN_CONFIG) as ColumnId[]

  // Global step totals (live from columns state)
  const totalSteps = Object.values(columns).flat().reduce((n, p) => n + p.implementationSteps.length, 0)
  const doneSteps  = Object.values(columns).flat().reduce((n, p) => n + p.implementationSteps.filter(s => s.done).length, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Drag cards between columns · synced to <code className="text-xs bg-muted px-1 py-0.5 rounded">CONTROL.md</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>}
          <button onClick={() => { setRefreshing(true); loadData() }} disabled={refreshing}
            className="btn btn-outline flex items-center gap-2 text-sm">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-2">
          {colIds.map(col => (
            <div key={col} className="card py-3 text-center">
              <p className={`text-2xl font-bold ${COLUMN_CONFIG[col].statsColor}`}>{columns[col].length}</p>
              <p className="text-xs text-muted-foreground mt-1">{COLUMN_CONFIG[col].label}</p>
            </div>
          ))}
        </div>
        {totalSteps > 0 && (
          <div className="card py-2 px-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${(doneSteps / totalSteps) * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{doneSteps}/{totalSteps} implementation steps complete</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
          <input type="text" placeholder="Search projects…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-muted-foreground">Loading projects…</div>
      ) : error ? (
        <div className="card p-10 text-center text-red-400">{error}</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-start">
            {colIds.map(col => (
              <Column key={col} id={col} projects={filter(columns[col])} onStepToggle={onStepToggle} />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
            {activeProject ? (
              <div className="bg-card border border-primary/60 rounded-lg p-3 shadow-2xl rotate-1 scale-105 opacity-95">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">#{activeProject.id}</span>
                  <Badge cls={categoryColors[activeProject.category] || categoryColors.General}>
                    <Tag size={9} />{activeProject.category}
                  </Badge>
                  {activeProject.priority && <Badge cls={priorityConfig[activeProject.priority].cls}>{priorityConfig[activeProject.priority].label}</Badge>}
                  {activeProject.effort && <Badge cls={effortConfig[activeProject.effort].cls}>{effortConfig[activeProject.effort].label}</Badge>}
                </div>
                <p className="font-semibold text-sm">{activeProject.name}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
