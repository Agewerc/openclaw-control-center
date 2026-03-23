import { NextResponse } from 'next/server'
import fs from 'fs'

const REGISTER_MD = '/Users/alangewerc/.openclaw/workspace/projects/PROJECT_REGISTER.md'

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function PATCH(request: Request) {
  try {
    const { projectName, stepIndex, done }: { projectName: string; stepIndex: number; done: boolean } = await request.json()

    if (!projectName || stepIndex === undefined || done === undefined) {
      return NextResponse.json({ error: 'projectName, stepIndex and done are required' }, { status: 400 })
    }

    let content = fs.readFileSync(REGISTER_MD, 'utf-8')

    // Find the project section, then the Implementation Steps block
    const sectionRegex = new RegExp(
      `(## \\d+\\.\\s+${escapeRegex(projectName)}[\\s\\S]*?### Implementation Steps\\n)((?:- \\[[ x]\\][^\\n]*\\n)*)`,
      'i'
    )

    const match = content.match(sectionRegex)
    if (!match) {
      return NextResponse.json({ error: `Project "${projectName}" or its Implementation Steps not found` }, { status: 404 })
    }

    const stepsBlock = match[2]
    const steps = stepsBlock.split('\n').filter(Boolean)

    if (stepIndex >= steps.length) {
      return NextResponse.json({ error: `Step index ${stepIndex} out of range (${steps.length} steps)` }, { status: 400 })
    }

    steps[stepIndex] = steps[stepIndex].replace(/\[[ x]\]/i, done ? '[x]' : '[ ]')
    const newBlock = steps.join('\n') + '\n'
    content = content.replace(stepsBlock, newBlock)

    fs.writeFileSync(REGISTER_MD, content, 'utf-8')

    return NextResponse.json({ success: true, stepIndex, done })
  } catch (error) {
    console.error('Step toggle error:', error)
    return NextResponse.json({ error: 'Failed to toggle step' }, { status: 500 })
  }
}
