import { NextResponse } from 'next/server'
import fs from 'fs'

const REGISTER_MD = '/Users/alangewerc/.openclaw/workspace/projects/PROJECT_REGISTER.md'
const CONTROL_MD  = '/Users/alangewerc/.openclaw/workspace/projects/CONTROL.md'

export interface ProjectIdea {
  id: string
  name: string
  category: string
  description: string
  lastUpdate?: string
  source?: string
}

export async function GET() {
  try {
    const register = fs.readFileSync(REGISTER_MD, 'utf-8')
    const control  = fs.readFileSync(CONTROL_MD, 'utf-8')

    // Collect idea-status project names from CONTROL.md
    const ideaNames = new Set<string>()
    const sectionRegex = /## Ideas[\s\S]*?\n([\s\S]*?)(?=\n## |\n---\s*$|$)/
    const match = control.match(sectionRegex)
    if (match) {
      const rows = match[1].split('\n').filter(r => r.includes('|') && !r.includes('---') && !r.match(/^\|\s*#\s*\|/))
      for (const row of rows) {
        const cols = row.split('|').map(c => c.trim()).filter(Boolean)
        if (cols[1] && cols[1] !== 'Project') ideaNames.add(cols[1].toLowerCase())
      }
    }

    // Parse all projects from register, filter to ideas only
    const ideas: ProjectIdea[] = []
    const sections = register.split(/\n## /).slice(1)

    for (const section of sections) {
      const lines = section.split('\n')
      const titleMatch = lines[0].match(/^(\d+)\.\s+(.+)/)
      if (!titleMatch) continue

      const rawId = titleMatch[1]
      const name = titleMatch[2].trim()

      // Only include if in Ideas section of CONTROL.md
      if (!ideaNames.has(name.toLowerCase())) continue

      let category = 'General', description = '', source = ''
      let inDesc = false

      for (let i = 1; i < lines.length; i++) {
        const trimmed = lines[i].trim()
        const catM = trimmed.match(/\*\*Category:\*\*\s*(.+)/i)
        if (catM) { category = catM[1].trim(); continue }
        const srcM = trimmed.match(/\*\*Source:\*\*\s*(.+)/i)
        if (srcM) { source = srcM[1].trim(); continue }
        if (lines[i].startsWith('### Description')) { inDesc = true; continue }
        if (lines[i].startsWith('### ') && inDesc) break
        if (inDesc && trimmed) description += (description ? ' ' : '') + trimmed
      }

      ideas.push({ id: rawId, name, category, description: description.slice(0, 200), source })
    }

    return NextResponse.json({ ideas, total: ideas.length })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load ideas' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, category }: { name: string; description: string; category: string } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const today = new Date().toISOString().split('T')[0]

    // Find next ID in register
    const register = fs.readFileSync(REGISTER_MD, 'utf-8')
    const ids = [...register.matchAll(/^## (\d+)\./gm)].map(m => parseInt(m[1]))
    const nextId = ids.length > 0 ? Math.max(...ids) + 1 : 1

    // Append to PROJECT_REGISTER.md
    const entry = `\n## ${nextId}. ${name}
**Category:** ${category || 'General'}
**ID:** ${String(nextId).padStart(3, '0')}

### Description
${description || 'No description provided.'}

### Key Features
- To be defined

### Notes
- Added via Control Center on ${today}
`
    fs.appendFileSync(REGISTER_MD, entry, 'utf-8')

    // Add to Ideas section in CONTROL.md
    let control = fs.readFileSync(CONTROL_MD, 'utf-8')
    const newRow = `| ${nextId} | ${name} | ${category || 'General'} | ${today} |`
    control = control.replace(/(## Ideas[\s\S]*?\|[-| ]+\|\n)/, `$1${newRow}\n`)
    control = control.replace(/\*Last updated:.*\*/, `*Last updated: ${today}*`)
    control = control.replace(/(\| Date \| Note \|\n\|[-| ]+\|\n)/, `$1| ${today} | Added idea: "${name}" via Control Center |\n`)
    fs.writeFileSync(CONTROL_MD, control, 'utf-8')

    return NextResponse.json({ success: true, id: nextId, name })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to add idea' }, { status: 500 })
  }
}
