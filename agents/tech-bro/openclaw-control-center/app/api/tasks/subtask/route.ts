import { NextResponse } from 'next/server'
import fs from 'fs'

const TASK_BOARD = '/Users/alangewerc/.openclaw/workspace/projects/TASK_BOARD.md'

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function PATCH(request: Request) {
  try {
    const { taskId, subtaskIndex, done }: { taskId: string; subtaskIndex: number; done: boolean } = await request.json()

    if (!taskId || subtaskIndex === undefined || done === undefined) {
      return NextResponse.json({ error: 'taskId, subtaskIndex and done are required' }, { status: 400 })
    }

    let content = fs.readFileSync(TASK_BOARD, 'utf-8')

    // Find the task's detail section and its Subtasks block
    const sectionRegex = new RegExp(
      `(### ${escapeRegex(taskId)} —[\\s\\S]*?\\*\\*Subtasks:\\*\\*\\n)((?:- \\[[ x]\\][^\\n]*\\n)*)`,
      'i'
    )
    const match = content.match(sectionRegex)
    if (!match) return NextResponse.json({ error: `Task ${taskId} or its subtasks not found` }, { status: 404 })

    const steps = match[2].split('\n').filter(Boolean)
    if (subtaskIndex >= steps.length) return NextResponse.json({ error: 'Index out of range' }, { status: 400 })

    steps[subtaskIndex] = steps[subtaskIndex].replace(/\[[ x]\]/i, done ? '[x]' : '[ ]')
    content = content.replace(match[2], steps.join('\n') + '\n')
    fs.writeFileSync(TASK_BOARD, content, 'utf-8')

    return NextResponse.json({ success: true, subtaskIndex, done })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to toggle subtask' }, { status: 500 })
  }
}
