'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Download, RefreshCw, AlertCircle, AlertTriangle, Info } from 'lucide-react'

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  source: string
}

const levelConfig = {
  info: { icon: Info, cls: 'text-blue-400 bg-blue-500/10 border-blue-500/30', label: 'INFO' },
  warning: { icon: AlertTriangle, cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', label: 'WARN' },
  error: { icon: AlertCircle, cls: 'text-red-400 bg-red-500/10 border-red-500/30', label: 'ERROR' },
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState({ info: 0, warning: 0, error: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('all')
  const [range, setRange] = useState('24h')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ range, level, search })
      const res = await fetch(`/api/logs?${params}`)
      const json = await res.json()
      setLogs(json.logs || [])
      setTotal(json.total || 0)
      setCounts(json.counts || { info: 0, warning: 0, error: 0 })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [range, level, search])

  useEffect(() => { load() }, [load])

  const handleExport = () => {
    const lines = logs.map(l => `${l.timestamp} [${l.level.toUpperCase()}] [${l.source}] ${l.message}`).join('\n')
    const blob = new Blob([lines], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `openclaw-logs-${range}-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Live from <code className="text-xs bg-muted px-1 py-0.5 rounded">gateway.log</code> + cron run history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn btn-outline flex items-center gap-2 text-sm">
            <Download size={15} />
            Export
          </button>
          <button onClick={load} disabled={loading} className="btn btn-outline flex items-center gap-2 text-sm">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{counts.info}</p>
          <p className="text-xs text-muted-foreground mt-1">Info</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-yellow-400">{counts.warning}</p>
          <p className="text-xs text-muted-foreground mt-1">Warnings</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-red-400">{counts.error}</p>
          <p className="text-xs text-muted-foreground mt-1">Errors</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
          <input
            type="text"
            placeholder="Search logs…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={level}
          onChange={e => setLevel(e.target.value)}
          className="px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All levels</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
        <select
          value={range}
          onChange={e => setRange(e.target.value)}
          className="px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="1h">Last 1 hour</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </select>
      </div>

      {/* Log list */}
      <div className="card overflow-hidden">
        <div className="px-4 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Showing {logs.length} of {total} entries</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Loading logs…</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">No log entries match your filters.</div>
        ) : (
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto font-mono text-xs">
            {logs.map(log => {
              const cfg = levelConfig[log.level]
              const Icon = cfg.icon
              return (
                <div key={log.id} className="flex items-start gap-3 px-4 py-2 hover:bg-accent/30">
                  <span className="text-muted-foreground shrink-0 w-36">{log.timestamp}</span>
                  <span className={`inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-bold ${cfg.cls}`}>
                    <Icon size={9} />
                    {cfg.label}
                  </span>
                  <span className="text-violet-400 shrink-0 w-24 truncate">[{log.source}]</span>
                  <span className="text-foreground/80 break-all">{log.message}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
