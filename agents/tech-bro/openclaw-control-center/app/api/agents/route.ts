import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface AgentActionRequest {
  action: 'toggle-status' | 'update' | 'get'
  agentId?: string
  name?: string
  model?: string
  description?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: AgentActionRequest = await request.json()
    
    if (!body.action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }
    
    switch (body.action) {
      case 'toggle-status':
        // For now, we'll just simulate toggling status
        // In a real implementation, this would update agent configuration
        return NextResponse.json({
          success: true,
          message: `Agent status toggled (simulated)`,
          agent: {
            id: body.agentId,
            status: 'active' // Simulated status change
          }
        })
        
      case 'update':
        if (!body.agentId) {
          return NextResponse.json(
            { error: 'agentId is required for update' },
            { status: 400 }
          )
        }
        
        // For now, we'll just simulate updating agent info
        // In a real implementation, this would update agent configuration files
        return NextResponse.json({
          success: true,
          message: `Agent ${body.agentId} updated (simulated)`,
          agent: {
            id: body.agentId,
            name: body.name || 'Updated Agent',
            model: body.model || 'unknown',
            description: body.description || ''
          }
        })
        
      case 'get':
        if (!body.agentId) {
          return NextResponse.json(
            { error: 'agentId is required for get' },
            { status: 400 }
          )
        }
        
        // Simulate getting agent details
        return NextResponse.json({
          success: true,
          agent: {
            id: body.agentId,
            name: `Agent ${body.agentId}`,
            model: 'claude-sonnet-4-6',
            status: 'active',
            description: 'Sample agent description'
          }
        })
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${body.action}` },
          { status: 400 }
        )
    }
    
  } catch (error) {
    console.error('Error handling agent action:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process agent action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to list agents with details
export async function GET() {
  try {
    const agentsDir = '/Users/alangewerc/.openclaw/workspace/agents'
    const agents: any[] = []
    
    if (fs.existsSync(agentsDir)) {
      const agentDirs = fs.readdirSync(agentsDir).filter(dir => {
        return dir !== 'archive' && !dir.startsWith('.') && fs.statSync(path.join(agentsDir, dir)).isDirectory()
      })
      
      agentDirs.forEach((agentDir, index) => {
        const agentPath = path.join(agentsDir, agentDir)
        
        // Read identity files
        const identityPath = path.join(agentPath, 'IDENTITY.md')
        let name = agentDir.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        let description = ''
        
        if (fs.existsSync(identityPath)) {
          try {
            const identityContent = fs.readFileSync(identityPath, 'utf-8')
            const nameMatch = identityContent.match(/Name:\s*(.+)/i)
            if (nameMatch) name = nameMatch[1].trim()
            
            const roleMatch = identityContent.match(/Role:\s*(.+)/i)
            if (roleMatch) description = roleMatch[1].trim()
          } catch (e) {
            console.warn(`Failed to read identity for ${agentDir}:`, e)
          }
        }
        
        // Check if agent is active (has recent files)
        const files = fs.readdirSync(agentPath)
        const hasRecentFiles = files.some(file => {
          if (file.endsWith('.md') || file === 'memory') return true
          return false
        })
        
        agents.push({
          id: (index + 1).toString(),
          name,
          model: 'unknown', // Would need to parse from config files
          status: hasRecentFiles ? 'active' : 'disabled',
          description,
          directory: agentDir,
          path: agentPath
        })
      })
    }
    
    return NextResponse.json({ agents })
    
  } catch (error) {
    console.error('Error listing agents:', error)
    return NextResponse.json(
      { error: 'Failed to list agents' },
      { status: 500 }
    )
  }
}