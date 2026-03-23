'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2, Play, OctagonX, MessageSquare, PlusSquare, Search, Eye, Unlock } from 'lucide-react'

type LogAction = 'started' | 'completed' | 'blocked' | 'note' | 'created' | 'reviewed' | 'unblocked'

interface AgentLogEntry {
  id: string
  timestamp: string
  isoTimestamp: string
  agent: string
  action: LogAction
  taskId?: string
  projectName?: string
  note: string
}

// ── Action config ─────────────────────────────────────────────────────────────
const actionConfig: Record<LogAction, { icon: any; label: string; cls: string; dot: string }> = {
  completed:  { icon: CheckCircle2, label: 'completed',  cls: 'text-green-400 bg-green-500/10 border border-green-500/30',   dot: 'bg-green-500' },
  started:    { icon: Play,         label: 'started',    cls: 'text-blue-400 bg-blue-500/10 border border-blue-500/30',      dot: 'bg-blue-500' },
  blocked:    { icon: OctagonX,     label: 'blocked',    cls: 'text-red-400 bg-red-500/10 border border-red-500/30',         dot: 'bg-red-500' },
  note:       { icon: MessageSquare,label: 'note',       cls: 'text-zinc-400 bg-zinc-500/10 border border-zinc-500/30',      dot: 'bg-zinc-500' },
  created:    { icon: PlusSquare,   label: 'created',    cls: 'text-violet-400 bg-violet-500/10 border border-violet-500/30',dot: 'bg-violet-500' },
  reviewed:   { icon: Eye,          label: 'reviewed',   cls: 'text-amber-400 bg-amber-500/10 border border-amber-500/30',   dot: 'bg-amber-500' },
  unblocked:  { icon: Unlock,       label: 'unblocked',  cls: 'text-teal-400 bg-teal-500/10 border border-teal-500/30',      dot: 'bg-teal-500' },
}

const agentColors: Record<string, string> = {
  'tech-bro':    'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
  'pm-bro':      'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  'finance-bro': 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  'health-bro':  'bg-pink-500/15 text-pink-400 border border-pink-500/30',
  'career-bro':  'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  'joe':         'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  'openclaw-bro':'bg-orange-500/15 text-orange-400 border border-orange-500/30',
}

function relativeTime(isoTs: string): string {
  const diff = Date.now() - new Date(isoTs).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24)  return `${hrs}h ago`
  return `${days}d ago`
}

function AgentBadge({ agent }: { agent: string }) {
  const cls = agentColors[agent] || 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30'
  return <span className={`inline-flex text-xs px-1.5 py-0.5 rounded-full font-medium border ${cls}`}>{agent}</span>
}

function ActionBadge({ action }: { action: LogAction }) {
  const cfg = actionConfig[action] || actionConfig.note
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.cls}`}>
      <Icon size={10} />{cfg.label}
    </span>
  )
}

function LogRow({ entry }: { entry: AgentLogEntry }) {
  const cfg = actionConfig[entry.action] || actionConfig.note

  return (
    <div className="flex items-start gap-3 py-3 px-4 border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors">
      {/* Dot + time */}
      <div className="flex flex-col items-center gap-1 shrink-0 w-16 pt-0.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
        <span className="text-xs text-muted-foreground text-center leading-tight" title={entry.timestamp}>
          {relativeTime(entry.isoTimestamp)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <ActionBadge action={entry.action} />
          <AgentBadge agent={entry.agent} />
          {entry.taskId && (
            <span className="text-xs font-mono text-muted-foreground">{entry.taskId}</span>
          )}
          {entry.projectName && (
            <span className="text-xs text-muted-foreground">· {entry.projectName}</span>
          )}
        </div>
        {entry.note && (
          <p className="text-xs text-foreground/70 leading-relaxed pl-1 border-l-2 border-border">
            "{entry.note}"
          </p>
        )}
      </div>

      {/* Exact timestamp on far right */}
      <span className="text-xs text-muted-foreground/50 shrink-0 hidden md:block">{entry.timestamp}</span>
    </div>
  )
}

export default function LogsPage() {
  const [entries, setEntries] = useState<AgentLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [agentFilter, setAgentFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '300' })
      if (agentFilter !== 'all')   params.set('agent', agentFilter)
      if (projectFilter !== 'all') params.set('project', projectFilter)
      if (actionFilter !== 'all')  params.set('action', actionFilter)
      const res = await fetch(`/api/agent-logs?${params}`)
      const json = await res.json()
      setEntries(json.entries || [])
      setTotal(json.total || 0)
    } catch { /* */ }
    finally { setLoading(false); setRefreshing(false) }
  }, [agentFilter, projectFilter, actionFilter])

  useEffect(() => { load() }, [load])

  const filtered = entries.filter(e =>
    !search ||
    e.note.toLowerCase().includes(search.toLowerCase()) ||
    e.agent.toLowerCase().includes(search.toLowerCase()) ||
    (e.taskId || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.projectName || '').toLowerCase().includes(search.toLowerCase())
  )

  const agents   = [...new Set(entries.map(e => e.agent))]
  const projects = [...new Set(entries.map(e => e.projectName).filter(Boolean))] as string[]
  const actions  = Object.keys(actionConfig) as LogAction[]

  const counts = Object.fromEntries(
    actions.map(a => [a, entries.filter(e => e.action === a).length])
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Logs</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Live activity feed — synced from <code className="text-xs bg-muted px-1 py-0.5 rounded">AGENT_LOGS.md</code>
          </p>
        </div>
        <button onClick={() => { setRefreshing(true); load() }} disabled={refreshing}
          className="btn btn-outline flex items-center gap-2 text-sm">
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      {/* Action type summary */}
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
        {actions.map(a => {
          const cfg = actionConfig[a]
          const Icon = cfg.icon
          return (
            <button key={a}
              onClick={() => setActionFilter(actionFilter === a ? 'all' : a)}
              className={`card py-2 px-2 text-center transition-colors cursor-pointer hover:border-primary/40 ${actionFilter === a ? 'border-primary/60 bg-primary/5' : ''}`}>
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Icon size={12} className={`${cfg.cls.split(' ')[0]}`} />
                <span className="text-sm font-bold">{counts[a] || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground">{a}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
          <input type="text" placeholder="Search logs…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All agents</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All projects</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Feed */}
      <div className="card overflow-hidden">
        <div className="px-4 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {filtered.length === total ? `${total} entries` : `${filtered.length} of ${total} entries`}
          </span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Loading logs…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            {entries.length === 0
              ? 'No log entries yet — agents will appear here once tasks are in motion.'
              : 'No entries match your filters.'}
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto divide-y divide-border/30">
            {filtered.map(entry => <LogRow key={entry.id} entry={entry} />)}
          </div>
        )}
      </div>
    </div>
  )
}
