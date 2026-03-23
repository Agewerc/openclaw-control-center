import { NextResponse } from 'next/server'
import fs from 'fs'

const CONTROL_MD = '/Users/alangewerc/.openclaw/workspace/projects/CONTROL.md'
const REGISTER_MD = '/Users/alangewerc/.openclaw/workspace/projects/PROJECT_REGISTER.md'

export type ColumnId = 'idea' | 'planned' | 'in-progress' | 'verify' | 'done'

export interface WorkspaceProject {
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
  implementationSteps: { text: string; done: boolean }[]
  keyFeatures: string[]
  notes: string[]
  source?: string
  whyItMatters?: string
}

// ── Backwards-compat section header → ColumnId mapping ──────────────────────
const SECTION_MAP: Record<string, ColumnId> = {
  // New canonical
  'ideas':       'idea',
  'idea':        'idea',
  'planned':     'planned',
  'in progress': 'in-progress',
  'in-progress': 'in-progress',
  'verify':      'verify',
  'done':        'done',
  // Legacy backwards compat
  'now':         'in-progress',
  'next':        'planned',
  'later':       'idea',
  'backlog':     'idea',
}

function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parseControlMd(content: string): Record<string, { status: ColumnId; lastUpdate?: string }> {
  const result: Record<string, { status: ColumnId; lastUpdate?: string }> = {}

  // Match each ## section
  const sectionRegex = /## ([^\n]+)\n([\s\S]*?)(?=\n## |\n---\s*$|$)/g
  let m
  while ((m = sectionRegex.exec(content)) !== null) {
    const header = m[1].replace(/\s*\(.*\)/, '').trim().toLowerCase()
    const status: ColumnId | undefined = SECTION_MAP[header]
    if (!status) continue

    const rows = m[2].split('\n').filter(r => r.includes('|') && !r.includes('---') && !r.match(/^\|\s*#\s*\|/))
    for (const row of rows) {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cols.length >= 2 && cols[1] && cols[1] !== 'Project') {
        result[normalizeKey(cols[1])] = {
          status,
          lastUpdate: cols[3] || cols[2] || undefined,
        }
      }
    }
  }

  return result
}

function parseRegisterMd(content: string): WorkspaceProject[] {
  const projects: WorkspaceProject[] = []
  const sections = content.split(/\n## /).slice(1)

  for (const section of sections) {
    const lines = section.split('\n')
    const titleLine = lines[0] || ''
    const titleMatch = titleLine.match(/^(\d+)\.\s+(.+)/)
    if (!titleMatch) continue

    const rawId = titleMatch[1]
    const name = titleMatch[2].trim()

    let category = ''
    let source = ''
    let description = ''
    let priority: WorkspaceProject['priority'] | undefined
    let effort: WorkspaceProject['effort'] | undefined
    let agent: string | undefined
    let blocked = false
    let statusNotes: string | undefined
    const keyFeatures: string[] = []
    const notes: string[] = []
    const implementationSteps: { text: string; done: boolean }[] = []
    let currentSection = ''

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Header fields
      const catM   = trimmed.match(/\*\*Category:\*\*\s*(.+)/i)
      if (catM) { category = catM[1].trim(); continue }
      const srcM   = trimmed.match(/\*\*Source:\*\*\s*(.+)/i)
      if (srcM) { source = srcM[1].trim(); continue }
      const priM   = trimmed.match(/\*\*Priority:\*\*\s*(.+)/i)
      if (priM) { priority = priM[1].trim().toLowerCase() as any; continue }
      const effM   = trimmed.match(/\*\*Effort:\*\*\s*(.+)/i)
      if (effM) { effort = effM[1].trim().toLowerCase() as any; continue }
      const agtM   = trimmed.match(/\*\*Agent:\*\*\s*(.+)/i)
      if (agtM) { agent = agtM[1].trim(); continue }
      const snM    = trimmed.match(/\*\*Status notes?:\*\*\s*(.+)/i)
      if (snM) { statusNotes = snM[1].trim(); continue }
      if (/\*\*Blocked:\*\*\s*true/i.test(trimmed)) { blocked = true; continue }

      // Section headers
      if (line.startsWith('### Description'))         { currentSection = 'description'; continue }
      if (line.startsWith('### Implementation Steps')){ currentSection = 'steps'; continue }
      if (line.startsWith('### Key Features'))        { currentSection = 'features'; continue }
      if (line.startsWith('### Workflow'))            { currentSection = 'workflow'; continue }
      if (line.startsWith('### Notes'))               { currentSection = 'notes'; continue }
      if (line.startsWith('### '))                    { currentSection = ''; continue }

      if (!trimmed) continue

      if (currentSection === 'description') {
        description += (description ? ' ' : '') + trimmed
      } else if (currentSection === 'steps') {
        const stepM = trimmed.match(/^-\s+\[(x| )\]\s+(.+)/i)
        if (stepM) implementationSteps.push({ done: stepM[1].toLowerCase() === 'x', text: stepM[2] })
      } else if (currentSection === 'features') {
        if (trimmed.startsWith('-') || trimmed.startsWith('*'))
          keyFeatures.push(trimmed.replace(/^[-*]\s*/, '').replace(/\*\*/g, ''))
      } else if (currentSection === 'notes') {
        if (trimmed.startsWith('-') || trimmed.startsWith('*'))
          notes.push(trimmed.replace(/^[-*]\s*/, ''))
      }
    }

    // Deduplicate id
    let uniqueId = rawId
    let suffix = 0
    while (projects.some(p => p.id === uniqueId)) {
      suffix++
      uniqueId = `${rawId}-${String.fromCharCode(96 + suffix)}`
    }

    projects.push({
      id: uniqueId,
      name,
      category: category || 'General',
      status: 'idea', // overridden by CONTROL.md
      priority,
      effort,
      agent,
      blocked,
      statusNotes,
      description,
      implementationSteps,
      keyFeatures,
      notes,
      source,
    })
  }

  return projects
}

export async function GET() {
  try {
    const controlContent = fs.existsSync(CONTROL_MD) ? fs.readFileSync(CONTROL_MD, 'utf-8') : ''
    const registerContent = fs.existsSync(REGISTER_MD) ? fs.readFileSync(REGISTER_MD, 'utf-8') : ''

    const controlMap = parseControlMd(controlContent)
    const projects = parseRegisterMd(registerContent)

    // Merge status from CONTROL.md
    for (const p of projects) {
      const entry = controlMap[normalizeKey(p.name)]
      if (entry) {
        p.status = entry.status
        if (entry.lastUpdate) p.lastUpdate = entry.lastUpdate
      }
    }

    const columns: Record<ColumnId, WorkspaceProject[]> = {
      'idea': [], 'planned': [], 'in-progress': [], 'verify': [], 'done': [],
    }
    for (const p of projects) columns[p.status].push(p)

    // Step totals
    const totalSteps = projects.reduce((n, p) => n + p.implementationSteps.length, 0)
    const doneSteps  = projects.reduce((n, p) => n + p.implementationSteps.filter(s => s.done).length, 0)

    return NextResponse.json({
      projects,
      columns,
      ...columns,
      stats: {
        total: projects.length,
        idea:          columns.idea.length,
        planned:       columns.planned.length,
        'in-progress': columns['in-progress'].length,
        verify:        columns.verify.length,
        done:          columns.done.length,
        totalSteps,
        doneSteps,
      },
    })
  } catch (error) {
    console.error('Error reading workspace projects:', error)
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 })
  }
}

// ── PATCH — move project to new status ───────────────────────────────────────
export async function PATCH(request: Request) {
  try {
    const { projectName, newStatus }: { projectName: string; newStatus: ColumnId } = await request.json()

    const validStatuses: ColumnId[] = ['idea', 'planned', 'in-progress', 'verify', 'done']
    if (!projectName || !validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    let content = fs.readFileSync(CONTROL_MD, 'utf-8')
    const today = new Date().toISOString().split('T')[0]

    // Remove the project row from whichever section it's in
    let projectRow = ''
    let projectNum = '?'

    const allSectionHeaders = ['Ideas', 'Planned', 'In Progress', 'Verify', 'Done', 'Now', 'Next', 'Later', 'Backlog', 'Planned \\(Organised\\)']
    for (const header of allSectionHeaders) {
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(projectName.toLowerCase()) && lines[i].includes('|')) {
          projectRow = lines[i]
          const numM = projectRow.match(/\|\s*(\d+)\s*\|/)
          if (numM) projectNum = numM[1]
          lines.splice(i, 1)
          content = lines.join('\n')
          break
        }
      }
      if (projectRow) break
    }

    if (!projectRow) {
      return NextResponse.json({ error: `"${projectName}" not found in CONTROL.md` }, { status: 404 })
    }

    // Build new row
    const sectionLabel = { idea: 'Ideas', planned: 'Planned', 'in-progress': 'In Progress', verify: 'Verify', done: 'Done' }[newStatus]
    const newRow = `| ${projectNum} | ${projectName} | ${newStatus === 'in-progress' ? 'In Progress' : sectionLabel} | ${today} |`

    // Insert after the separator row of the target section
    const sepRegex = new RegExp(`(## ${sectionLabel}[\\s\\S]*?\\|[-| ]+\\|\\n)`)
    if (sepRegex.test(content)) {
      content = content.replace(sepRegex, `$1${newRow}\n`)
    }

    // Update date + add log
    content = content.replace(/\*Last updated:.*\*/, `*Last updated: ${today}*`)
    content = content.replace(/(\| Date \| Note \|\n\|[-| ]+\|\n)/, `$1| ${today} | Moved "${projectName}" → ${sectionLabel} via dashboard |\n`)

    fs.writeFileSync(CONTROL_MD, content, 'utf-8')
    return NextResponse.json({ success: true, message: `"${projectName}" moved to ${newStatus}` })
  } catch (error) {
    console.error('PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}
