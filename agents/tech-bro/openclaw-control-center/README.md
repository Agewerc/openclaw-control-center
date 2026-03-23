# OpenClaw Control Center

A clean, modern dashboard for managing your OpenClaw setup with a focus on usability and clarity.

## Features

### Dashboard
- Overview of agents, cron jobs, and projects
- Recent activity feed
- System status at a glance

### Agents Management
- List all agents with name, model, and status
- Enable/disable agents
- Edit basic agent information
- Simple parent/child relationship display

### Cron Jobs
- List scheduled jobs with schedule, linked agent, and last run
- Run jobs immediately
- Pause/resume jobs
- Cron schedule format helper

### Projects
- Organize work into projects
- Assign multiple agents to projects
- Create and edit projects

### Logs
- View recent system logs
- Filter by log level (info, warning, error)
- Search through log messages
- Export functionality

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **Dark mode** - Built-in dark theme

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
openclaw-control-center/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Dashboard
│   ├── agents/page.tsx    # Agents management
│   ├── cron-jobs/page.tsx # Cron jobs management
│   ├── projects/page.tsx  # Projects management
│   └── logs/page.tsx      # Logs viewer
├── components/            # Reusable UI components
│   ├── Sidebar.tsx       # Navigation sidebar
│   ├── StatCard.tsx      # Dashboard statistic cards
│   └── StatusBadge.tsx   # Status indicator badges
├── lib/                  # Utilities and mock data
│   └── mockData.ts       # Mock data for demonstration
└── public/               # Static assets
```

## Mock Data

The application uses mock data to demonstrate functionality. In a real implementation, this would be replaced with API calls to the OpenClaw backend.

## Design Principles

- **Clean & Minimal** - Focus on essential information
- **Dark Mode** - Easy on the eyes for extended use
- **Modern SaaS Feel** - Polished UI with subtle animations
- **Responsive** - Works on desktop and tablet
- **Fast** - Optimized for quick interactions

## Future Enhancements

- Real OpenClaw API integration
- User authentication
- Advanced filtering and search
- Real-time updates via WebSocket
- Export/import functionality
- Advanced agent relationship visualization
- Performance metrics and charts

## License

MIT