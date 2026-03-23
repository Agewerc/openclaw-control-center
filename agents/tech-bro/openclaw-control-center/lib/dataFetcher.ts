export interface Agent {
  id: string
  name: string
  model: string
  status: 'active' | 'disabled'
  parentId?: string
  description?: string
}

export interface CronJob {
  id: string
  name: string
  schedule: string
  agentId: string
  lastRun: string
  status: 'running' | 'paused' | 'failed'
}

export interface Project {
  id: string
  name: string
  agentIds: string[]
  description?: string
}

export interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  source: string
}

export interface RealData {
  agents: Agent[]
  cronJobs: CronJob[]
  projects: Project[]
  logs: LogEntry[]
  timestamp: string
}

// Fallback mock data in case API fails
const fallbackData: RealData = {
  agents: [
    { id: '1', name: 'Main Agent', model: 'claude-3.5-sonnet', status: 'active' },
    { id: '2', name: 'Tech Bro', model: 'deepseek-chat', status: 'active', parentId: '1' },
    { id: '3', name: 'Career Bro', model: 'unknown', status: 'active', parentId: '1' },
    { id: '4', name: 'Finance Bro', model: 'unknown', status: 'active', parentId: '1' },
    { id: '5', name: 'Health Bro', model: 'DeepSeek V3.2', status: 'active', parentId: '1' },
    { id: '6', name: 'OpenClaw Bro', model: 'unknown', status: 'active', parentId: '1' },
  ],
  cronJobs: [
    { id: '1', name: 'Weekly Thursday weather+surf email (Trigg)', schedule: '0 18 * * 4', agentId: 'main', lastRun: '2026-03-19 18:00:00', status: 'running' },
    { id: '2', name: 'Daily 8pm prep for tomorrow (all calendars + TickTick)', schedule: '0 20 * * *', agentId: 'main', lastRun: '2026-03-21 20:00:00', status: 'running' },
    { id: '3', name: 'Weekday inspiring story for Alan', schedule: '30 8 * * 1-5', agentId: 'main', lastRun: '2026-03-20 08:30:00', status: 'failed' },
    { id: '4', name: 'Career Compass — Daily Data & AI HTML digest', schedule: '5 7 * * *', agentId: 'main', lastRun: '2026-03-21 07:05:00', status: 'failed' },
  ],
  projects: [
    { id: '1', name: 'DELIVERABLES', agentIds: ['1', '2'], description: 'Project directory: DELIVERABLES' },
    { id: '2', name: 'active', agentIds: ['1', '2'], description: 'Project directory: active' },
    { id: '3', name: 'archive', agentIds: ['1', '2'], description: 'Project directory: archive' },
  ],
  logs: [
    { id: '1', timestamp: '2026-03-22 14:30:00', level: 'info', message: 'OpenClaw Control Center started', source: 'system' },
    { id: '2', timestamp: '2026-03-22 14:15:00', level: 'info', message: 'Real data integration initialized', source: 'data-fetcher' },
    { id: '3', timestamp: '2026-03-22 14:00:00', level: 'info', message: 'Agent "main" memory updated: recent-activity.md', source: 'agent-memory' },
    { id: '4', timestamp: '2026-03-22 13:45:00', level: 'info', message: 'Agent "tech-bro" memory updated: project-plan.md', source: 'agent-memory' },
    { id: '5', timestamp: '2026-03-22 13:30:00', level: 'warning', message: 'Cron job "Weekday inspiring story for Alan" failed', source: 'cron-scheduler' },
  ],
  timestamp: new Date().toISOString()
}

export async function fetchRealData(): Promise<RealData> {
  try {
    const response = await fetch('/api/real-data', {
      next: { revalidate: 60 } // Revalidate every 60 seconds
    })
    
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch real data, using fallback:', error)
    return fallbackData
  }
}

// Helper functions
export function getAgentById(agents: Agent[], id: string): Agent | undefined {
  return agents.find(agent => agent.id === id)
}

export function getProjectById(projects: Project[], id: string): Project | undefined {
  return projects.find(project => project.id === id)
}