'use client'

import { useState, useEffect } from 'react'
import { Search, ChevronDown, ChevronUp, RefreshCw, Brain, ListChecks, Ban, Zap, MessageSquare, BookOpen, Database } from 'lucide-react'

interface AgentDetail {
  id: string
  dir: string
  name: string
  emoji: string
  role: string
  vibe: string
  model: string
  status: 'active' | 'disabled'
  soul: string
  whatIDo: string[]
  whatIDontDo: string[]
  domainScope: string[]
  domainBoundaries: string[]
  communicationStyle: string[]
  hasMemory: boolean
  fileCount: number
}

const modelColors: Record<string, string> = {
  'Claude Sonnet 4.6': 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  'Claude 3.5 Sonnet': 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  'DeepSeek V3.2': 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
}

function ModelBadge({ model }: { model: string }) {
  const cls = modelColors[model] || 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{model}</span>
}

function StatusDot({ status }: { status: 'active' | 'disabled' }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'}`} />
      <span className={`text-xs font-medium ${status === 'active' ? 'text-green-400' : 'text-zinc-500'}`}>
        {status === 'active' ? 'Active' : 'Disabled'}
      </span>
    </span>
  )
}

function Section({ icon: Icon, label, items, emptyText }: { icon: any, label: string, items: string[], emptyText?: string }) {
  if (items.length === 0 && !emptyText) return null
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} className="text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-primary/60 shrink-0 mt-0.5">▸</span>
              <span className="text-foreground/80">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AgentCard({ agent }: { agent: AgentDetail }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-all duration-200 ${
      expanded ? 'border-primary/40 shadow-lg shadow-primary/5' : 'border-border hover:border-border/80'
    }`}>
      {/* Header — always visible */}
      <div
        className="flex items-start gap-4 p-5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Avatar */}
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0 border border-primary/20">
          {agent.emoji}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="font-bold text-base">{agent.name}</h3>
            <StatusDot status={agent.status} />
          </div>
          <p className="text-xs text-muted-foreground mb-2">{agent.role}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <ModelBadge model={agent.model} />
            {agent.hasMemory && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30 flex items-center gap-1">
                <Database size={9} /> Memory
              </span>
            )}
          </div>
        </div>

        <button className="text-muted-foreground shrink-0 mt-1">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Soul snippet — visible even when collapsed */}
      {agent.soul && (
        <div className="px-5 pb-4 -mt-1">
          <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3 leading-relaxed">
            "{agent.soul}"
          </p>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Vibe */}
          {agent.vibe && (
            <div className="md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Vibe</p>
              <p className="text-sm text-foreground/80">{agent.vibe}</p>
            </div>
          )}

          <Section icon={ListChecks} label="What I Do" items={agent.whatIDo} />
          <Section icon={Ban} label="What I Don't Do" items={agent.whatIDontDo} />

          {(agent.domainScope.length > 0) && (
            <Section icon={BookOpen} label="Domain Scope" items={agent.domainScope} />
          )}
          {(agent.domainBoundaries.length > 0) && (
            <Section icon={Zap} label="Domain Boundaries" items={agent.domainBoundaries} />
          )}

          {agent.communicationStyle.length > 0 && (
            <Section icon={MessageSquare} label="Communication Style" items={agent.communicationStyle} />
          )}

          {/* Meta */}
          <div className="md:col-span-2 pt-2 border-t border-border flex items-center gap-4 flex-wrap">
            <span className="text-xs text-muted-foreground">
              📁 <code className="bg-muted px-1 py-0.5 rounded text-xs">agents/{agent.dir}/</code>
            </span>
            <span className="text-xs text-muted-foreground">{agent.fileCount} files</span>
            {agent.hasMemory && <span className="text-xs text-muted-foreground flex items-center gap-1"><Database size={10} /> Has memory store</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  async function loadData() {
    try {
      const res = await fetch('/api/workspace-agents')
      if (!res.ok) throw new Error('Failed to load agents')
      const json = await res.json()
      setAgents(json.agents)
      setError(null)
    } catch (e) {
      setError('Could not load agents.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleRefresh = () => { setRefreshing(true); loadData() }

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.role.toLowerCase().includes(search.toLowerCase()) ||
    a.vibe.toLowerCase().includes(search.toLowerCase())
  )

  const active = filtered.filter(a => a.status === 'active')
  const disabled = filtered.filter(a => a.status === 'disabled')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agents</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your AI team — {agents.filter(a => a.status === 'active').length} active agents
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-outline flex items-center gap-2 text-sm"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card py-3 text-center">
            <p className="text-2xl font-bold text-primary">{agents.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Agents</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-2xl font-bold text-green-500">{agents.filter(a => a.status === 'active').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-2xl font-bold text-violet-400">{agents.filter(a => a.hasMemory).length}</p>
            <p className="text-xs text-muted-foreground mt-1">With Memory</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search agents by name, role, vibe…"
          className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="card p-10 text-center text-muted-foreground">Loading agents…</div>
      ) : error ? (
        <div className="card p-10 text-center text-red-400">{error}</div>
      ) : (
        <div className="space-y-8">
          {/* Active agents */}
          {active.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-green-500/20 text-green-400">
                <Brain size={15} />
                <h2 className="font-semibold text-sm uppercase tracking-wide">Active</h2>
                <span className="ml-auto text-xs font-mono bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{active.length}</span>
              </div>
              {active.map(agent => <AgentCard key={agent.dir} agent={agent} />)}
            </div>
          )}

          {/* Disabled agents */}
          {disabled.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-500/20 text-zinc-500">
                <Brain size={15} />
                <h2 className="font-semibold text-sm uppercase tracking-wide">Disabled</h2>
                <span className="ml-auto text-xs font-mono bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{disabled.length}</span>
              </div>
              {disabled.map(agent => <AgentCard key={agent.dir} agent={agent} />)}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="card p-10 text-center text-muted-foreground">No agents match your search.</div>
          )}
        </div>
      )}
    </div>
  )
}
