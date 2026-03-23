import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export interface CreateProjectRequest {
  name: string
  description?: string
  agentIds?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateProjectRequest = await request.json()
    
    // Validate request
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }
    
    // Sanitize project name for directory creation
    const sanitizedName = body.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Remove consecutive hyphens
      .trim()
    
    if (!sanitizedName) {
      return NextResponse.json(
        { error: 'Project name must contain valid characters' },
        { status: 400 }
      )
    }
    
    const projectsDir = '/Users/alangewerc/.openclaw/workspace/projects'
    const projectPath = path.join(projectsDir, sanitizedName)
    
    // Check if project already exists
    if (fs.existsSync(projectPath)) {
      return NextResponse.json(
        { error: `Project "${sanitizedName}" already exists` },
        { status: 409 }
      )
    }
    
    // Create project directory
    fs.mkdirSync(projectPath, { recursive: true })
    
    // Create a basic README.md file in the project
    const readmeContent = `# ${body.name}

${body.description || 'No description provided.'}

## Created
- **Date:** ${new Date().toISOString().split('T')[0]}
- **Time:** ${new Date().toLocaleTimeString()}
- **Via:** OpenClaw Control Center

## Agents
${body.agentIds && body.agentIds.length > 0 
  ? body.agentIds.map(id => `- Agent ID: ${id}`).join('\n')
  : 'No agents assigned yet.'}

## Notes
Add project notes, tasks, and documentation here.
`
    
    fs.writeFileSync(path.join(projectPath, 'README.md'), readmeContent)
    
    // Create a basic project metadata file
    const metadata = {
      id: sanitizedName,
      name: body.name,
      description: body.description || '',
      agentIds: body.agentIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    fs.writeFileSync(
      path.join(projectPath, '.project.json'),
      JSON.stringify(metadata, null, 2)
    )
    
    return NextResponse.json({
      success: true,
      project: {
        id: sanitizedName,
        name: body.name,
        description: body.description,
        agentIds: body.agentIds || [],
        path: projectPath
      },
      message: `Project "${body.name}" created successfully`
    })
    
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to list projects (optional, but useful)
export async function GET() {
  try {
    const projectsDir = '/Users/alangewerc/.openclaw/workspace/projects'
    const projects = []
    
    if (fs.existsSync(projectsDir)) {
      const items = fs.readdirSync(projectsDir)
      
      for (const item of items) {
        const itemPath = path.join(projectsDir, item)
        const stat = fs.statSync(itemPath)
        
        if (stat.isDirectory()) {
          // Try to read metadata
          const metadataPath = path.join(itemPath, '.project.json')
          let metadata = null
          
          if (fs.existsSync(metadataPath)) {
            try {
              metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
            } catch (e) {
              console.warn(`Failed to parse metadata for ${item}:`, e)
            }
          }
          
          projects.push({
            id: item,
            name: metadata?.name || item,
            description: metadata?.description || `Project directory: ${item}`,
            agentIds: metadata?.agentIds || ['1', '2'], // Default agents
            createdAt: metadata?.createdAt || stat.birthtime.toISOString(),
            updatedAt: metadata?.updatedAt || stat.mtime.toISOString()
          })
        }
      }
    }
    
    return NextResponse.json({ projects })
    
  } catch (error) {
    console.error('Error listing projects:', error)
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    )
  }
}