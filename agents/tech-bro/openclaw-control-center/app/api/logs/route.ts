import { NextResponse, NextRequest } from 'next/server'
import fs from 'fs'

const GATEWAY_LOG = '/Users/alangewerc/.openclaw/logs/gateway.log'
const CRON_RUNS_DIR = '/Users/alangewerc/.openclaw/cron/runs'

export interface LogEntry {
  id: string
  timestamp: string
  isoTs: string
  level: 'info' | 'warning' | 'error'
  message: string
  source: string
}

function parseGatewayLog(lines: string[]): LogEntry[] {
  const entries: LogEntry[] = []
  let idx = 0

  for (const line of lines) {
    if (!line.trim()) continue

    // Format: 2026-03-22T22:29:25.774+08:00 [source] message
    // or: 2026-03-22T22:29:25.774Z [source] message
    const m = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+(?:[Z+][^\s]*)?)\s+\[([^\]]+)\]\s+(.+)$/)
    if (!m) continue

    const [, rawTs, source, msg] = m

    // Determine level from content
    let level: LogEntry['level'] = 'info'
    const lower = msg.toLowerCase()
    if (lower.includes('error') || lower.includes('failed') || lower.includes('timed out') || lower.includes('invalid')) {
      level = 'error'
    } else if (lower.includes('warn') || lower.includes('disconnect') || lower.includes('retry') || lower.includes('degraded')) {
      level = 'warning'
    }

    let isoTs = rawTs
    try { isoTs = new Date(rawTs).toISOString() } catch { /* */ }

    entries.push({
      id: `gw-${idx++}`,
      timestamp: isoTs.replace('T', ' ').slice(0, 19),
      isoTs,
      level,
      message: msg.trim(),
      source,
    })
  }

  return entries
}

function parseCronRunLogs(): LogEntry[] {
  const entries: LogEntry[] = []
  try {
    const files = fs.readdirSync(CRON_RUNS_DIR).filter(f => f.endsWith('.jsonl'))
    for (const file of files) {
      const content = fs.readFileSync(`${CRON_RUNS_DIR}/${file}`, 'utf-8')
      const lines = content.split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const run = JSON.parse(line)
          const ts = new Date(run.ts)
          const isoTs = ts.toISOString()
          const level: LogEntry['level'] = run.status === 'error' ? 'error' : 'info'
          const msg = run.status === 'error'
            ? `Cron job failed: ${run.error}`
            : `Cron job completed: ${run.summary?.slice(0, 120) || 'ok'}`
          entries.push({
            id: `cron-${run.jobId}-${run.ts}`,
            timestamp: isoTs.replace('T', ' ').slice(0, 19),
            isoTs,
            level,
            message: msg,
            source: `cron/${file.replace('.jsonl', '').slice(0, 8)}`,
          })
        } catch { /* */ }
      }
    }
  } catch { /* */ }
  return entries
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '24h'
    const level = searchParams.get('level') || 'all'
    const search = searchParams.get('search') || ''

    // Tail last N lines from gateway log
    let linesToRead = 1000
    if (range === '1h') linesToRead = 200
    if (range === '7d') linesToRead = 5000

    const content = fs.readFileSync(GATEWAY_LOG, 'utf-8')
    const allLines = content.split('\n').filter(Boolean)
    const tail = allLines.slice(-linesToRead)

    const gatewayLogs = parseGatewayLog(tail)
    const cronLogs = parseCronRunLogs()

    // Merge and sort newest first
    let logs = [...gatewayLogs, ...cronLogs]
      .sort((a, b) => new Date(b.isoTs).getTime() - new Date(a.isoTs).getTime())

    // Filter by time range
    const now = Date.now()
    const rangeMs: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    }
    if (rangeMs[range]) {
      logs = logs.filter(l => now - new Date(l.isoTs).getTime() < rangeMs[range])
    }

    // Filter by level
    if (level !== 'all') {
      logs = logs.filter(l => l.level === level)
    }

    // Filter by search
    if (search) {
      const q = search.toLowerCase()
      logs = logs.filter(l => l.message.toLowerCase().includes(q) || l.source.toLowerCase().includes(q))
    }

    return NextResponse.json({
      logs: logs.slice(0, 500),
      total: logs.length,
      counts: {
        info: logs.filter(l => l.level === 'info').length,
        warning: logs.filter(l => l.level === 'warning').length,
        error: logs.filter(l => l.level === 'error').length,
      }
    })
  } catch (error) {
    console.error('Logs error:', error)
    return NextResponse.json({ error: 'Failed to read logs' }, { status: 500 })
  }
}
