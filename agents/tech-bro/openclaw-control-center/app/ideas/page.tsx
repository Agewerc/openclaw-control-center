'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Tag, Lightbulb, RefreshCw, X } from 'lucide-react'

interface ProjectIdea {
  id: string
  name: string
  category: string
  description: string
  lastUpdate?: string
}

const categoryColors: Record<string, string> = {
  OpenClaw: 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  Personal: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  General:  'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30',
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<ProjectIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'category' | 'name'>('newest')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', category: 'Personal' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/ideas')
      const json = await res.json()
      setIdeas(json.ideas || [])
      setError(null)
    } catch { setError('Failed to load ideas.') }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setForm({ name: '', description: '', category: 'Personal' })
      setShowAdd(false)
      load()
    } catch { alert('Failed to add idea.') }
    finally { setSubmitting(false) }
  }

  let filtered = ideas.filter(i => {
    const ms = i.name.toLowerCase().includes(search.toLowerCase()) ||
               i.description.toLowerCase().includes(search.toLowerCase())
    const mc = categoryFilter === 'all' || i.category === categoryFilter
    return ms && mc
  })

  if (sortBy === 'category') filtered = [...filtered].sort((a, b) => a.category.localeCompare(b.category))
  if (sortBy === 'name') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))

  const categories = [...new Set(ideas.map(i => i.category))]
  const openclaw = filtered.filter(i => i.category === 'OpenClaw').length
  const personal = filtered.filter(i => i.category === 'Personal').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Lightbulb size={28} className="text-yellow-400" /> Ideas
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Raw project ideas — not yet briefed. Talk to pm-bro to move one to the Work Board.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setRefreshing(true); load() }} disabled={refreshing}
            className="btn btn-outline flex items-center gap-2 text-sm">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Add Idea
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-yellow-400">{ideas.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Ideas</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-violet-400">{openclaw}</p>
          <p className="text-xs text-muted-foreground mt-1">OpenClaw</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{personal}</p>
          <p className="text-xs text-muted-foreground mt-1">Personal</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
          <input type="text" placeholder="Search ideas…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="px-3 py-2 text-sm bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="newest">Newest first</option>
          <option value="category">By category</option>
          <option value="name">A–Z</option>
        </select>
      </div>

      {/* Idea cards */}
      {loading ? (
        <div className="card p-10 text-center text-muted-foreground">Loading ideas…</div>
      ) : error ? (
        <div className="card p-10 text-center text-red-400">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-muted-foreground">No ideas match your filters.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(idea => (
            <div key={idea.id} className="card border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground">#{idea.id}</span>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${categoryColors[idea.category] || categoryColors.General}`}>
                    <Tag size={9} />{idea.category}
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 shrink-0">
                  Requirements needed
                </span>
              </div>
              <h3 className="font-semibold text-sm mb-2 leading-snug">{idea.name}</h3>
              {idea.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{idea.description}</p>
              )}
              {idea.lastUpdate && (
                <p className="text-xs text-muted-foreground/60 mt-3">Added {idea.lastUpdate}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add idea modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Add New Idea</h2>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Project name *</label>
                <input type="text" placeholder="e.g. Email summariser agent"
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">One-line description</label>
                <input type="text" placeholder="What does it do?"
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="Personal">Personal</option>
                  <option value="OpenClaw">OpenClaw</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="btn btn-outline text-sm">Cancel</button>
              <button onClick={handleAdd} disabled={!form.name.trim() || submitting}
                className="btn btn-primary text-sm">
                {submitting ? 'Adding…' : 'Add Idea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
