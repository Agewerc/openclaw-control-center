import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const OPENCLAW_JSON = '/Users/alangewerc/.openclaw/openclaw.json'
const AGENTS_DIR = '/Users/alangewerc/.openclaw/workspace/agents'

export interface AgentDetail {
  id: string
  name: string
  emoji: string
  model: string
  modelShort: string
  status: 'active' | 'disabled'
  theme: string
  soul: string
  skills: string[]
  subAgents: string[]
  workspace: string
  role: string
  vibe: string
  whatIDo: string[]
  whatIDontDo: string[]
  domainScope: string[]
  communicationStyle: string[]
  hasMemory: boolean
  fileCount: number
}

function readFile(p: string): string | null {
  try { return fs.readFileSync(p, 'utf-8') } catch { return null }
}

function extractBullets(content: string, heading: string): string[] {
  const regex = new RegExp(`## ${heading}[\\s\\S]*?\\n((?:(?!##)[\\s\\S])*?)(?=\\n##|$)`, 'i')
  const match = content.match(regex)
  if (!match) return []
  return match[1].split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('-') || l.startsWith('*'))
    .map(l => l.replace(/^[-*]\s*/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)
}

function extractField(content: string, field: string): string {
  const m = content.match(new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+)`, 'i'))
  return m ? m[1].replace(/\*\*/g, '').trim() : ''
}

function parseSoul(content: string): string {
  const lines = content.split('\n').filter(l => {
    const t = l.trim()
    return t && !t.startsWith('#') && !t.startsWith('---') && !t.startsWith('_')
  })
  const para = lines.slice(0, 3).join(' ').replace(/\*\*/g, '').trim()
  return para.length > 220 ? para.slice(0, 220) + '…' : para
}

function prettifyModel(model: string): string {
  const map: Record<string, string> = {
    'anthropic/claude-sonnet-4-6': 'Claude Sonnet 4.6',
    'anthropic/claude-3-5-sonnet-latest': 'Claude 3.5 Sonnet',
    'anthropic/claude-haiku-4-5': 'Claude Haiku 4.5',
    'deepseek/deepseek-chat': 'DeepSeek V3.2',
    'openai/gpt-4.1': 'GPT-4.1',
    'openai/gpt-4o': 'GPT-4o',
  }
  return map[model] || model.split('/').pop() || model
}

export async function GET() {
  try {
    const config = JSON.parse(readFile(OPENCLAW_JSON) || '{}')
    const agentList: any[] = config?.agents?.list || []

    const agents: AgentDetail[] = agentList.map(a => {
      const agentPath = a.agentDir || path.join(AGENTS_DIR, a.id)
      const identityContent = readFile(path.join(agentPath, 'IDENTITY.md')) || ''
      const soulContent = readFile(path.join(agentPath, 'SOUL.md')) || ''
      const domainContent = readFile(path.join(agentPath, 'DOMAIN.md')) || ''

      const model = a.model || config?.agents?.defaults?.model?.primary || 'anthropic/claude-sonnet-4-6'
      const modelShort = prettifyModel(model)

      // Workspace files
      let fileCount = 0
      let hasMemory = false
      try {
        const files = fs.readdirSync(agentPath)
        fileCount = files.filter(f => !f.startsWith('.') && f !== 'node_modules').length
        hasMemory = files.includes('memory')
      } catch { /* agent dir may not exist for archived specialists */ }

      return {
        id: a.id,
        name: a.identity?.name || a.name,
        emoji: a.identity?.emoji || '🤖',
        model,
        modelShort,
        status: 'active' as const,
        theme: a.identity?.theme || '',
        soul: parseSoul(soulContent),
        skills: a.skills || [],
        subAgents: a.subagents?.allowAgents || [],
        workspace: agentPath,
        role: extractField(identityContent, 'Role') || '',
        vibe: extractField(identityContent, 'Vibe') || '',
        whatIDo: extractBullets(identityContent, 'What I Do'),
        whatIDontDo: extractBullets(identityContent, "What I Don't Do"),
        domainScope: extractBullets(domainContent, 'Scope'),
        communicationStyle: extractBullets(identityContent, 'Communication Style'),
        hasMemory,
        fileCount,
      }
    })

    return NextResponse.json({ agents })
  } catch (error) {
    console.error('Error reading agents:', error)
    return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 })
  }
}
