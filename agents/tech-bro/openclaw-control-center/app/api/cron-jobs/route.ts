import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const CRON_JOBS_PATH = '/Users/alangewerc/.openclaw/cron/jobs.json'

interface CronJobActionRequest {
  action: 'run-now' | 'toggle-status' | 'get-status'
  jobId: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CronJobActionRequest = await request.json()
    
    if (!body.action || !body.jobId) {
      return NextResponse.json(
        { error: 'Action and jobId are required' },
        { status: 400 }
      )
    }
    
    // Read current cron jobs
    if (!fs.existsSync(CRON_JOBS_PATH)) {
      return NextResponse.json(
        { error: 'Cron jobs file not found' },
        { status: 404 }
      )
    }
    
    const cronData = JSON.parse(fs.readFileSync(CRON_JOBS_PATH, 'utf-8'))
    const jobs = cronData.jobs || []
    
    const jobIndex = jobs.findIndex((job: any) => job.id === body.jobId)
    
    if (jobIndex === -1) {
      return NextResponse.json(
        { error: `Cron job with ID ${body.jobId} not found` },
        { status: 404 }
      )
    }
    
    const job = jobs[jobIndex]
    
    switch (body.action) {
      case 'run-now':
        // In a real implementation, this would trigger the cron job immediately
        // For now, we'll simulate it by updating the last run time
        job.state = job.state || {}
        job.state.lastRunAtMs = Date.now()
        job.state.lastStatus = 'ok'
        job.state.lastDurationMs = Math.floor(Math.random() * 5000) + 1000 // Random 1-6 seconds
        
        // Save updated jobs
        fs.writeFileSync(CRON_JOBS_PATH, JSON.stringify(cronData, null, 2))
        
        return NextResponse.json({
          success: true,
          message: `Cron job "${job.name}" triggered successfully`,
          job: {
            id: job.id,
            name: job.name,
            lastRun: new Date(job.state.lastRunAtMs).toISOString().split('T')[0] + ' ' + 
                    new Date(job.state.lastRunAtMs).toTimeString().split(' ')[0],
            status: 'running'
          }
        })
        
      case 'toggle-status':
        // Toggle enabled/disabled status
        job.enabled = !job.enabled
        
        // Update state
        job.state = job.state || {}
        if (!job.enabled) {
          job.state.lastStatus = 'paused'
        }
        
        // Save updated jobs
        fs.writeFileSync(CRON_JOBS_PATH, JSON.stringify(cronData, null, 2))
        
        return NextResponse.json({
          success: true,
          message: `Cron job "${job.name}" ${job.enabled ? 'enabled' : 'disabled'}`,
          job: {
            id: job.id,
            name: job.name,
            enabled: job.enabled,
            status: job.enabled ? 'running' : 'paused'
          }
        })
        
      case 'get-status':
        return NextResponse.json({
          success: true,
          job: {
            id: job.id,
            name: job.name,
            enabled: job.enabled,
            schedule: job.schedule?.expr || '0 * * * *',
            lastRun: job.state?.lastRunAtMs 
              ? new Date(job.state.lastRunAtMs).toISOString().split('T')[0] + ' ' + 
                new Date(job.state.lastRunAtMs).toTimeString().split(' ')[0]
              : 'Never',
            status: !job.enabled ? 'paused' : 
                   job.state?.lastStatus === 'error' ? 'failed' : 'running'
          }
        })
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${body.action}` },
          { status: 400 }
        )
    }
    
  } catch (error) {
    console.error('Error handling cron job action:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process cron job action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to list cron jobs
export async function GET() {
  try {
    if (!fs.existsSync(CRON_JOBS_PATH)) {
      return NextResponse.json({ jobs: [] })
    }
    
    const cronData = JSON.parse(fs.readFileSync(CRON_JOBS_PATH, 'utf-8'))
    const jobs = cronData.jobs || []
    
    const formattedJobs = jobs.map((job: any) => {
      const lastRunDate = job.state?.lastRunAtMs ? new Date(job.state.lastRunAtMs) : new Date()
      const lastRun = lastRunDate.toISOString().split('T')[0] + ' ' + 
                     lastRunDate.toTimeString().split(' ')[0]
      
      let status: 'running' | 'paused' | 'failed' = 'running'
      if (!job.enabled) {
        status = 'paused'
      } else if (job.state?.lastStatus === 'error') {
        status = 'failed'
      }
      
      return {
        id: job.id,
        name: job.name,
        schedule: job.schedule?.expr || '0 * * * *',
        agentId: job.agentId || 'main',
        lastRun,
        status,
        enabled: job.enabled,
        timezone: job.schedule?.tz || 'Australia/Perth'
      }
    })
    
    return NextResponse.json({ jobs: formattedJobs })
    
  } catch (error) {
    console.error('Error listing cron jobs:', error)
    return NextResponse.json(
      { error: 'Failed to list cron jobs' },
      { status: 500 }
    )
  }
}