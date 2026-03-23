import { NextResponse, NextRequest } from 'next/server'
import fs from 'fs'

const AGENT_LOGS = '/Users/alangewerc/.openclaw/workspace/projects/AGENT_LOGS.md'

export type LogAction = 'started' | 'completed' | 'blocked' | 'note' | 'created' | 'reviewed' | 'unblocked'

export interface AgentLogEntry {
  id: string
  timestamp: string      // raw string from file e.g. "2026-03-23 14:30"
  isoTimestamp: string   // parsed ISO for sorting
  agent: string
  action: LogAction
  taskId?: string
  projectName?: string
  note: string
}

function parseAgentLogs(content: string): AgentLogEntry[] {
  const entries: AgentLogEntry[] = []

  // Split on the --- separator blocks
  // Each entry is bounded by --- ... ---
  const blocks = content.split(/^---$/m).map(b => b.trim()).filter(Boolean)

  for (const block of blocks) {
    if (!block.includes('**ID:**')) continue

    const get = (field: string) => {
      const m = block.match(new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+)`))
      return m ? m[1].trim() : ''
    }

    const id          = get('ID')
    const timestamp   = get('Timestamp')
    const agent       = get('Agent')
    const action      = get('Action') as LogAction
    const taskId      = get('Task') || undefined
    const projectName = get('Project') || undefined
    const note        = get('Note')

    if (!id || !agent || !action) continue

    // Parse timestamp to ISO
    let isoTimestamp = new Date().toISOString()
    try {
      isoTimestamp = new Date(timestamp).toISOString()
    } catch { /* use now */ }

    entries.push({ id, timestamp, isoTimestamp, agent, action, taskId, projectName, note })
  }

  // Newest first
  return entries.sort((a, b) => new Date(b.isoTimestamp).getTime() - new Date(a.isoTimestamp).getTime())
}

export async function GET(request: NextRequest) {
  try {
    // Ensure file exists
    if (!fs.existsSync(AGENT_LOGS)) {
      return NextResponse.json({ entries: [], total: 0 })
    }

    const content = fs.readFileSync(AGENT_LOGS, 'utf-8')
    let entries = parseAgentLogs(content)

    const { searchParams } = new URL(request.url)
    const agentFilter   = searchParams.get('agent')
    const projectFilter = searchParams.get('project')
    const actionFilter  = searchParams.get('action') as LogAction | null
    const taskFilter    = searchParams.get('taskId')
    const limit         = parseInt(searchParams.get('limit') || '200')

    if (agentFilter)   entries = entries.filter(e => e.agent === agentFilter)
    if (projectFilter) entries = entries.filter(e => e.projectName === projectFilter)
    if (actionFilter)  entries = entries.filter(e => e.action === actionFilter)
    if (taskFilter)    entries = entries.filter(e => e.taskId === taskFilter)

    return NextResponse.json({
      entries: entries.slice(0, limit),
      total: entries.length,
    })
  } catch (error) {
    console.error('agent-logs error:', error)
    return NextResponse.json({ error: 'Failed to load agent logs' }, { status: 500 })
  }
}
