import { Users, Clock, Folder, Activity, Wifi, WifiOff, Server, MessageSquare } from 'lucide-react'
import StatCard from '@/components/StatCard'
import StatusBadge from '@/components/StatusBadge'
import { fetchRealData } from '@/lib/dataFetcher'
import Link from 'next/link'

async function fetchGatewayStatus() {
  try {
    const res = await fetch('http://localhost:3000/api/gateway-status', { cache: 'no-store' })
    return await res.json()
  } catch { return null }
}

const channelIcons: Record<string, string> = {
  discord: '🎮',
  whatsapp: '📱',
  telegram: '✈️',
}

export default async function Dashboard() {
  const [data, gateway] = await Promise.all([
    fetchRealData(),
    fetchGatewayStatus(),
  ])

  const stats = [
    {
      title: 'Total Agents',
      value: data.agents.length,
      icon: Users,
      description: `${data.agents.filter(a => a.status === 'active').length} active`,
    },
    {
      title: 'Cron Jobs',
      value: data.cronJobs.length,
      icon: Clock,
      description: `${data.cronJobs.filter(j => j.status === 'running').length} running`,
    },
    {
      title: 'Projects',
      value: data.projects.length,
      icon: Folder,
      description: 'All projects',
    },
    {
      title: 'Recent Logs',
      value: data.logs.length,
      icon: Activity,
      description: 'Last 24 hours',
    },
  ]

  const healthStatus = gateway?.health === 'healthy' ? 'active'
    : gateway?.health === 'degraded' ? 'running'
    : 'failed'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your OpenClaw setup and recent activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Link href="/logs" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {data.logs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start gap-3 pb-4 border-b border-border last:border-0">
                <StatusBadge status={log.level}>
                  {log.level.toUpperCase()}
                </StatusBadge>
                <div className="flex-1">
                  <p className="text-sm">{log.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{log.timestamp}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{log.source}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="card space-y-6">
          <h2 className="text-xl font-semibold">System Status</h2>

          {/* Gateway */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Gateway</p>
                <p className="text-xs text-muted-foreground">
                  {gateway?.running ? `PID ${gateway.pid} · ${gateway.model?.split('/').pop() || ''}` : 'Not running'}
                </p>
              </div>
            </div>
            <StatusBadge status={gateway?.running ? 'active' : 'failed'}>
              {gateway?.running ? 'Running' : 'Down'}
            </StatusBadge>
          </div>

          {/* Channels */}
          {gateway?.channels?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <MessageSquare size={12} /> Channels
              </p>
              <div className="space-y-2">
                {gateway.channels.map((ch: any) => (
                  <div key={ch.provider} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{channelIcons[ch.provider] || '📡'}</span>
                      <div>
                        <p className="font-medium text-sm">{ch.name}</p>
                        <p className="text-xs text-muted-foreground">{ch.detail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {ch.connected
                        ? <Wifi size={14} className="text-green-400" />
                        : <WifiOff size={14} className="text-red-400" />}
                      <StatusBadge status={ch.connected ? 'active' : 'failed'}>
                        {ch.connected ? 'Connected' : 'Offline'}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overall health */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div>
              <p className="font-medium text-sm">Overall Health</p>
              <p className="text-xs text-muted-foreground">{gateway?.healthDetail || 'Unknown'}</p>
            </div>
            <StatusBadge status={healthStatus}>
              {gateway?.health === 'healthy' ? 'Healthy' : gateway?.health === 'degraded' ? 'Degraded' : 'Down'}
            </StatusBadge>
          </div>
        </div>
      </div>
    </div>
  )
}
