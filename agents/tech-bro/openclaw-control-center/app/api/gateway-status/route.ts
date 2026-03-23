import { NextResponse } from 'next/server'
import fs from 'fs'

const OPENCLAW_JSON = '/Users/alangewerc/.openclaw/openclaw.json'
const GATEWAY_LOG = '/Users/alangewerc/.openclaw/logs/gateway.log'
const GATEWAY_PORT = 18789

export interface ChannelStatus {
  name: string
  provider: string
  enabled: boolean
  connected: boolean
  handle?: string
  detail?: string
}

export interface GatewayStatus {
  running: boolean
  pid?: number
  uptime?: string
  model?: string
  channels: ChannelStatus[]
  health: 'healthy' | 'degraded' | 'down'
  healthDetail: string
}

function tailLog(filePath: string, lines = 300): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const all = content.split('\n').filter(Boolean)
    return all.slice(-lines)
  } catch { return [] }
}

function parseChannels(config: any, logLines: string[]): ChannelStatus[] {
  const channels: ChannelStatus[] = []
  const channelConfig = config?.channels || {}

  // Discord
  if (channelConfig.discord?.enabled) {
    const connected = logLines.some(l => l.includes('[discord]') && l.includes('logged in to discord as'))
    const handle = logLines.reverse().find(l => l.includes('logged in to discord as'))
    logLines.reverse()
    const botName = handle?.match(/\(([^)]+)\)$/)?.[1] || 'bro'
    channels.push({
      name: 'Discord',
      provider: 'discord',
      enabled: true,
      connected,
      handle: `@${botName}`,
      detail: connected ? `Bot: @${botName}` : 'Not connected',
    })
  }

  // WhatsApp
  if (channelConfig.whatsapp?.enabled) {
    const connected = logLines.some(l => l.includes('[whatsapp]') && l.includes('Listening for personal WhatsApp'))
    const phone = channelConfig.whatsapp?.allowFrom?.[0] || ''
    channels.push({
      name: 'WhatsApp',
      provider: 'whatsapp',
      enabled: true,
      connected,
      handle: phone,
      detail: connected ? `Phone: ${phone}` : 'Not connected',
    })
  }

  // Telegram
  if (channelConfig.telegram?.enabled) {
    const connected = logLines.some(l => l.includes('[telegram]') && l.includes('starting provider'))
    const handle = logLines.find(l => l.includes('[telegram]') && l.includes('starting provider (@'))
    const botHandle = handle?.match(/starting provider \((@[^)]+)\)/)?.[1] || ''
    channels.push({
      name: 'Telegram',
      provider: 'telegram',
      enabled: true,
      connected,
      handle: botHandle,
      detail: connected ? `Bot: ${botHandle}` : 'Not connected',
    })
  }

  return channels
}

export async function GET() {
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf-8'))
    const logLines = tailLog(GATEWAY_LOG, 500)

    // Is gateway running? Check if process is alive on the port
    let running = false
    let pid: number | undefined
    try {
      // Look for recent log entry — if log modified in last 5 mins, likely running
      const stat = fs.statSync(GATEWAY_LOG)
      const ageMins = (Date.now() - stat.mtimeMs) / 1000 / 60
      running = ageMins < 60 // consider running if log touched in last hour

      // Extract PID from recent log
      const pidLine = [...logLines].reverse().find(l => l.includes('[gateway] listening') && l.includes('PID'))
      if (pidLine) {
        const m = pidLine.match(/PID (\d+)/)
        if (m) pid = parseInt(m[1])
      }
    } catch { /* */ }

    // Model from recent log
    const modelLine = [...logLines].reverse().find(l => l.includes('[gateway] agent model:'))
    const model = modelLine?.match(/agent model: (.+)/)?.[1]?.trim()

    const channels = parseChannels(config, logLines)

    // Health
    const connectedCount = channels.filter(c => c.connected).length
    let health: 'healthy' | 'degraded' | 'down' = 'down'
    let healthDetail = 'Gateway not running'
    if (running && connectedCount === channels.length) {
      health = 'healthy'
      healthDetail = `All ${connectedCount} channels connected`
    } else if (running && connectedCount > 0) {
      health = 'degraded'
      healthDetail = `${connectedCount}/${channels.length} channels connected`
    } else if (running) {
      health = 'degraded'
      healthDetail = 'Gateway running, no channels connected'
    }

    return NextResponse.json({
      running,
      pid,
      model,
      channels,
      health,
      healthDetail,
    } as GatewayStatus)
  } catch (error) {
    console.error('Gateway status error:', error)
    return NextResponse.json({ error: 'Failed to get gateway status' }, { status: 500 })
  }
}
