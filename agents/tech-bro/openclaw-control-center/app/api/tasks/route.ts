import { NextResponse } from 'next/server'
import fs from 'fs'

const TASK_BOARD = '/Users/alangewerc/.openclaw/workspace/projects/TASK_BOARD.md'
const CONTROL_MD = '/Users/alangewerc/.openclaw/workspace/projects/CONTROL.md'

export type TaskStatus = 'planned' | 'in-progress' | 'verify' | 'done' | 'waiting' | 'blocked'
export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type Effort = 'xs' | 's' | 'm' | 'l' | 'xl'

export interface Subtask { text: string; done: boolean }

export interface Task {
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
}

function readFile(p: string) {
  try { return fs.readFileSync(p, 'utf-8') } catch { return '' }
}

function parseTaskBoard(content: string): Task[] {
  const tasks: Task[] = []

  // Parse the active tasks table
  const tableMatch = content.match(/## Active Tasks[\s\S]*?\n\|[-| ]+\|\n((?:\|[^\n]+\n)*)/)
  if (tableMatch) {
    const rows = tableMatch[1].split('\n').filter(r => r.trim().startsWith('|') && r.trim() !== '|')
    for (const row of rows) {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cols.length < 8) continue
      const [id, name, projectName, agent, effort, priority, status, dependsOn, added] = cols
      if (!id || id === 'ID') continue

      tasks.push({
        id,
        name,
        projectName,
        agent: agent || 'unassigned',
        effort: (effort?.toLowerCase() || 'm') as Effort,
        priority: (priority?.toLowerCase() || 'medium') as Priority,
        status: (status?.toLowerCase().replace(' ', '-') || 'planned') as TaskStatus,
        dependsOn: dependsOn === '—' || !dependsOn ? [] : dependsOn.split(',').map(s => s.trim()),
        subtasks: [],
        blocked: false,
        added: added || new Date().toISOString().split('T')[0],
      })
    }
  }

  // Parse task details sections for subtasks/description/etc.
  const detailSections = content.split(/\n### /).slice(1)
  for (const section of detailSections) {
    const lines = section.split('\n')
    const headerMatch = lines[0].match(/^(T\d+)\s+—\s+(.+)/)
    if (!headerMatch) continue
    const taskId = headerMatch[1]

    const task = tasks.find(t => t.id === taskId)
    if (!task) continue

    let inSubtasks = false
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      const descM = trimmed.match(/\*\*Description:\*\*\s*(.+)/)
      if (descM) { task.description = descM[1]; continue }

      const accM = trimmed.match(/\*\*Acceptance:\*\*\s*(.+)/)
      if (accM) { task.acceptanceCriteria = accM[1]; continue }

      const noteM = trimmed.match(/\*\*Agent note:\*\*\s*(.+)/)
      if (noteM && noteM[1] !== '—') { task.agentNote = noteM[1]; continue }

      const blockedM = trimmed.match(/\*\*Blocked:\*\*\s*true/i)
      if (blockedM) { task.blocked = true; continue }

      if (trimmed === '**Subtasks:**') { inSubtasks = true; continue }
      if (inSubtasks && trimmed.startsWith('-')) {
        const stepM = trimmed.match(/^-\s+\[(x| )\]\s+(.+)/i)
        if (stepM) task.subtasks.push({ done: stepM[1].toLowerCase() === 'x', text: stepM[2] })
      }
    }
  }

  return tasks
}

export async function GET() {
  try {
    const content = readFile(TASK_BOARD)
    const tasks = parseTaskBoard(content)

    const planned    = tasks.filter(t => t.status === 'planned')
    const inProgress = tasks.filter(t => t.status === 'in-progress')
    const verify     = tasks.filter(t => t.status === 'verify')
    const done       = tasks.filter(t => t.status === 'done')

    const totalSubs = tasks.reduce((n, t) => n + t.subtasks.length, 0)
    const doneSubs  = tasks.reduce((n, t) => n + t.subtasks.filter(s => s.done).length, 0)

    return NextResponse.json({
      tasks,
      planned, inProgress, verify, done,
      stats: {
        total: tasks.length,
        planned: planned.length,
        inProgress: inProgress.length,
        verify: verify.length,
        done: done.length,
        totalSubtasks: totalSubs,
        doneSubtasks: doneSubs,
      }
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { taskId, newStatus }: { taskId: string; newStatus: TaskStatus } = await request.json()
    const valid: TaskStatus[] = ['planned', 'in-progress', 'verify', 'done', 'waiting', 'blocked']
    if (!taskId || !valid.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    let content = readFile(TASK_BOARD)
    const today = new Date().toISOString().split('T')[0]

    // Update the status cell in the active tasks table
    const taskRowRegex = new RegExp(`(\\| ${taskId} \\|[^\\n]*)`)
    const match = content.match(taskRowRegex)
    if (!match) return NextResponse.json({ error: `Task ${taskId} not found` }, { status: 404 })

    const cols = match[1].split('|').map(c => c.trim()).filter(Boolean)
    // status is index 6 (0-based: ID, Task, Project, Agent, Effort, Priority, Status, DependsOn, Added)
    cols[6] = newStatus
    const newRow = '| ' + cols.join(' | ') + ' |'
    content = content.replace(match[1], newRow)

    fs.writeFileSync(TASK_BOARD, content, 'utf-8')

    // Log to CONTROL.md
    try {
      let ctrl = fs.readFileSync(CONTROL_MD, 'utf-8')
      ctrl = ctrl.replace(/(\| Date \| Note \|\n\|[-| ]+\|\n)/, `$1| ${today} | Task ${taskId} moved → ${newStatus} via board |\n`)
      fs.writeFileSync(CONTROL_MD, ctrl, 'utf-8')
    } catch { /* best effort */ }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}
