'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Play, Pause, MoreVertical, Calendar } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import { fetchRealData, type CronJob, type Agent, getAgentById } from '@/lib/dataFetcher'

export default function CronJobsPage() {
  const [search, setSearch] = useState('')
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchRealData()
        setCronJobs(data.cronJobs)
        setAgents(data.agents)
      } catch (error) {
        console.error('Failed to load cron jobs:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  const filteredJobs = cronJobs.filter(job =>
    job.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleRunNow = async (jobId: string, jobName: string) => {
    try {
      const response = await fetch('/api/cron-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'run-now',
          jobId
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to run cron job')
      }

      // Refresh the cron jobs list
      const data = await fetchRealData()
      setCronJobs(data.cronJobs)
      
      // Show success message
      alert(`Cron job "${jobName}" triggered successfully!`)
    } catch (error) {
      console.error('Error running cron job:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to run cron job'}`)
    }
  }

  const handleToggleStatus = async (jobId: string, jobName: string, currentEnabled: boolean) => {
    try {
      const response = await fetch('/api/cron-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle-status',
          jobId
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to toggle cron job status')
      }

      // Refresh the cron jobs list
      const data = await fetchRealData()
      setCronJobs(data.cronJobs)
      
      // Show success message
      alert(`Cron job "${jobName}" ${!currentEnabled ? 'enabled' : 'disabled'}!`)
    } catch (error) {
      console.error('Error toggling cron job status:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to toggle cron job status'}`)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cron Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Schedule and manage automated tasks
          </p>
        </div>
        <button className="btn btn-primary">
          <Plus size={20} />
          Add Job
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center">
          <p className="text-muted-foreground">Loading cron jobs...</p>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="Search cron jobs..."
              className="w-full pl-10 pr-4 py-2 bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Cron Jobs Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Schedule</th>
                    <th className="text-left py-3 px-4 font-medium">Linked Agent</th>
                    <th className="text-left py-3 px-4 font-medium">Last Run</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{job.name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-muted-foreground" />
                          <code className="text-sm bg-muted px-2 py-1 rounded">{job.schedule}</code>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">
                          {getAgentById(agents, job.agentId)?.name || job.agentId}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">{job.lastRun}</span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={job.status}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </StatusBadge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRunNow(job.id, job.name)}
                            className="p-2 hover:bg-accent rounded-md transition-colors"
                            title="Run Now"
                          >
                            <Play size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(job.id, job.name, job.status !== 'paused')}
                            className="p-2 hover:bg-accent rounded-md transition-colors"
                            title={job.status === 'paused' ? 'Resume' : 'Pause'}
                          >
                            {job.status === 'paused' ? (
                              <Play size={16} className="text-green-600" />
                            ) : (
                              <Pause size={16} className="text-yellow-600" />
                            )}
                          </button>
                          <button className="p-2 hover:bg-accent rounded-md transition-colors">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Schedule Legend */}
          <div className="card">
            <h3 className="font-semibold mb-4">Schedule Format</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Cron Expression:</p>
                <code className="text-sm bg-muted px-2 py-1 rounded block mb-1">* * * * *</code>
                <p className="text-xs text-muted-foreground">minute hour day month weekday</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Examples:</p>
                <ul className="text-sm space-y-1">
                  <li><code className="bg-muted px-1 py-0.5 rounded">0 2 * * *</code> - Daily at 2 AM</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">*/15 * * * *</code> - Every 15 minutes</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">0 9 * * 1</code> - Every Monday at 9 AM</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}